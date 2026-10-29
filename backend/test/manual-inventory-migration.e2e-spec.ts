import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { requireTestDatabase } from './helpers/test-database';
const root = join(__dirname, '../prisma/migrations');
const current = '20261028140000_manual_inventory';
const sql = readFileSync(join(root, current, 'migration.sql'), 'utf8');

describe('Additive manual inventory migration', () => {
  it('preserves historical workspaces, rolls DDL back and guards whole units, tenant FKs and retained history', async () => {
    const client = new Client({ connectionString: requireTestDatabase() });
    const schema = `stock_${randomUUID().replaceAll('-', '')}`;
    await client.connect();
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      for (const name of readdirSync(root)
        .filter((n) => /^\d/.test(n) && n < current)
        .sort())
        await client.query(
          readFileSync(join(root, name, 'migration.sql'), 'utf8'),
        );
      await client.query(
        `INSERT INTO "User" (id,email,"passwordHash","displayName","updatedAt") VALUES ('owner','stock@example.test','synthetic','Owner',now())`,
      );
      await client.query(
        `INSERT INTO "Workspace" (id,name,kind,"personalOwnerId","updatedAt") VALUES ('personal','Personnel','PERSONAL','owner',now()),('bar','Bar','SHARED',null,now()),('other','Other','SHARED',null,now())`,
      );
      await client.query(
        `INSERT INTO "WorkspaceMember" ("workspaceId","userId",role) VALUES ('personal','owner','OWNER'),('bar','owner','OWNER')`,
      );
      const before = (
        await client.query('SELECT * FROM "Workspace" ORDER BY id')
      ).rows as Record<string, unknown>[];
      await client.query('BEGIN');
      await client.query(
        sql.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''),
      );
      await client.query('ROLLBACK');
      expect(
        (
          await client.query('SELECT to_regclass($1) AS object', [
            `${schema}."StockProduct"`,
          ])
        ).rows,
      ).toEqual([{ object: null }]);
      expect(
        (
          await client.query(
            'SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace=n.oid WHERE n.nspname=$1 AND t.typname=$2',
            [schema, 'StockMovementKind'],
          )
        ).rowCount,
      ).toBe(0);
      await client.query(sql);
      expect(
        (
          await client.query(
            "SELECT data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name='StockMovement' AND column_name='createdAt'",
            [schema],
          )
        ).rows,
      ).toEqual([{ data_type: 'timestamp with time zone' }]);
      expect(
        (await client.query('SELECT * FROM "Workspace" ORDER BY id')).rows,
      ).toEqual(before);
      expect(
        (await client.query('SELECT count(*)::int AS n FROM "StockProduct"'))
          .rows,
      ).toEqual([{ n: 0 }]);
      const product = (id: string, workspace: string, quantity: number) =>
        client.query(
          `INSERT INTO "StockProduct" (id,"workspaceId",name,packaging,quantity,threshold,target,"updatedAt") VALUES ($1,$2,'Paddy','Bouteille700mL',$3,2,8,now())`,
          [id, workspace, quantity],
        );
      await expect(product('negative', 'bar', -1)).rejects.toMatchObject({
        code: '23514',
      });
      await expect(product('missing', 'missing', 0)).rejects.toMatchObject({
        code: '23503',
      });
      await product('p', 'bar', 2);
      const key = randomUUID();
      await client.query(
        `INSERT INTO "StockMovement" (id,"workspaceId","productId","actorId","requestId",fingerprint,kind,"beforeQuantity","afterQuantity",delta,reason,"productVersion") VALUES ('initial','bar','p','owner',$1,$2,'INITIAL',0,2,2,'Comptage initial',0)`,
        [key, 'a'.repeat(64)],
      );
      const event = (
        id: string,
        workspace: string,
        actor: string,
        delta: number,
      ) =>
        client.query(
          `INSERT INTO "StockMovement" (id,"workspaceId","productId","actorId","requestId",fingerprint,kind,"beforeQuantity","afterQuantity",delta,reason,"productVersion") VALUES ($1,$2,'p',$3,$4,$5,'ADD',2,3,$6,'Compte',1)`,
          [id, workspace, actor, randomUUID(), 'b'.repeat(64), delta],
        );
      await expect(event('crossed', 'other', 'owner', 1)).rejects.toMatchObject(
        { code: '23503' },
      );
      await expect(
        event('unknown-actor', 'bar', 'missing', 1),
      ).rejects.toMatchObject({ code: '23503' });
      await expect(event('bad-delta', 'bar', 'owner', 2)).rejects.toMatchObject(
        { code: '23514' },
      );
      await expect(
        client.query(`UPDATE "StockProduct" SET name=' ' WHERE id='p'`),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        client.query(`UPDATE "StockProduct" SET version=-1 WHERE id='p'`),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        client.query(
          `INSERT INTO "StockMovement" (id,"workspaceId","productId","actorId","requestId",fingerprint,kind,"beforeQuantity","afterQuantity",delta,reason,"productVersion") VALUES ('duplicate','bar','p','owner',$1,$2,'INITIAL',0,2,2,'Comptage initial',0)`,
          [key, 'a'.repeat(64)],
        ),
      ).rejects.toMatchObject({ code: '23505' });
      await expect(
        client.query(`DELETE FROM "StockProduct" WHERE id='p'`),
      ).rejects.toMatchObject({ code: '23503' });
      await expect(
        client.query(`DELETE FROM "Workspace" WHERE id='bar'`),
      ).rejects.toMatchObject({ code: '23503' });
      await expect(
        client.query(`DELETE FROM "User" WHERE id='owner'`),
      ).rejects.toMatchObject({ code: '23503' });
      expect(
        (await client.query('SELECT * FROM "Workspace" ORDER BY id')).rows,
      ).toEqual(before);
      expect(
        (await client.query('SELECT count(*)::int AS n FROM "StockMovement"'))
          .rows,
      ).toEqual([{ n: 1 }]);
    } finally {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await client.end();
    }
  });
});
