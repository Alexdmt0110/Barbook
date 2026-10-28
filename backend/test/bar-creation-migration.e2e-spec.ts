import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { requireTestDatabase } from './helpers/test-database';
const root = join(__dirname, '../prisma/migrations');
const current = '20261028115000_bar_self_service';
const sql = readFileSync(join(root, current, 'migration.sql'), 'utf8');

describe('Additive Bar creation identity migration', () => {
  it('preserves historical workspaces, rolls DDL back and enforces receipt/palette/FK constraints', async () => {
    const client = new Client({ connectionString: requireTestDatabase() });
    const schema = `bar_${randomUUID().replaceAll('-', '')}`;
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
        `INSERT INTO "User" (id,email,"passwordHash","displayName","updatedAt") VALUES ('owner','owner@example.test','synthetic','Owner',now())`,
      );
      await client.query(
        `INSERT INTO "Workspace" (id,name,kind,"personalOwnerId","updatedAt") VALUES ('personal','Personnel','PERSONAL','owner',now()),('bar','Historical Bar','SHARED',null,now())`,
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
          await client.query(
            "SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name='Workspace' AND column_name='accentKey'",
            [schema],
          )
        ).rowCount,
      ).toBe(0);
      expect(
        (
          await client.query(
            'SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace=n.oid WHERE n.nspname=$1 AND t.typname=$2',
            [schema, 'BarAccent'],
          )
        ).rowCount,
      ).toBe(0);
      await client.query(sql);
      expect(
        (await client.query('SELECT * FROM "Workspace" ORDER BY id')).rows,
      ).toEqual(
        before.map((row) => ({
          ...row,
          accentKey: null,
          creationActorId: null,
          creationRequestId: null,
          creationFingerprint: null,
        })),
      );
      expect(
        (await client.query('SELECT count(*)::int AS n FROM "WorkspaceMember"'))
          .rows,
      ).toEqual([{ n: 2 }]);
      await expect(
        client.query(
          `UPDATE "Workspace" SET "accentKey"='RED' WHERE id='personal'`,
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        client.query(
          `UPDATE "Workspace" SET "accentKey"='hostile' WHERE id='bar'`,
        ),
      ).rejects.toMatchObject({ code: '22P02' });
      await expect(
        client.query(
          `UPDATE "Workspace" SET "creationActorId"='owner' WHERE id='bar'`,
        ),
      ).rejects.toMatchObject({ code: '23514' });
      const key = randomUUID();
      await expect(
        client.query(
          `UPDATE "Workspace" SET "creationActorId"='owner',"creationRequestId"=$1,"creationFingerprint"='bad' WHERE id='bar'`,
          [key],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        client.query(
          `UPDATE "Workspace" SET "creationActorId"='missing',"creationRequestId"=$1,"creationFingerprint"=$2 WHERE id='bar'`,
          [key, 'a'.repeat(64)],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      await client.query(
        `UPDATE "Workspace" SET "creationActorId"='owner',"creationRequestId"=$1,"creationFingerprint"=$2,"accentKey"='RED' WHERE id='bar'`,
        [key, 'a'.repeat(64)],
      );
      await expect(
        client.query(
          `INSERT INTO "Workspace" (id,name,kind,"creationActorId","creationRequestId","creationFingerprint","updatedAt") VALUES ('duplicate','Duplicate','SHARED','owner',$1,$2,now())`,
          [key, 'a'.repeat(64)],
        ),
      ).rejects.toMatchObject({ code: '23505' });
      await expect(
        client.query(`DELETE FROM "User" WHERE id='owner'`),
      ).rejects.toMatchObject({ code: '23503' });
      expect(
        (
          await client.query(
            `SELECT count(*)::int AS n FROM "Workspace" WHERE id='personal'`,
          )
        ).rows,
      ).toEqual([{ n: 1 }]);
    } finally {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await client.end();
    }
  });
});
