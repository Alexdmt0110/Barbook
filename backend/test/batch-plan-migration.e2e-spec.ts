import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { requireTestDatabase } from './helpers/test-database';
const root = join(__dirname, '../prisma/migrations');
const current = '20261029100000_autonomous_batch_plans';
const sql = readFileSync(join(root, current, 'migration.sql'), 'utf8');
describe('Additive batch plan migration', () => {
  it('preserves eleven historical migrations, rolls back DDL and enforces same-scope references and retained snapshots', async () => {
    const client = new Client({ connectionString: requireTestDatabase() }),
      schema = `batch_${randomUUID().replaceAll('-', '')}`;
    await client.connect();
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      const previous = readdirSync(root)
        .filter((n) => /^\d/.test(n) && n < current)
        .sort();
      expect(previous).toHaveLength(11);
      for (const name of previous)
        await client.query(
          readFileSync(join(root, name, 'migration.sql'), 'utf8'),
        );
      await client.query(
        `INSERT INTO "User" (id,email,"passwordHash","displayName","updatedAt") VALUES ('owner','batch@example.test','synthetic','Owner',now())`,
      );
      await client.query(
        `INSERT INTO "Workspace" (id,name,kind,"updatedAt") VALUES ('bar','Bar','SHARED',now()),('other','Other','SHARED',now())`,
      );
      await client.query(
        `INSERT INTO "Cocktail" (id,slug,name,type,method,glass,"workspaceId","updatedAt") VALUES ('recipe','base','Base','CLASSIC','BUILD','Coupe','bar',now())`,
      );
      const before = (
        await client.query('SELECT * FROM "Cocktail" ORDER BY id')
      ).rows as unknown[];
      await client.query('BEGIN');
      await client.query(
        sql.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''),
      );
      await client.query('ROLLBACK');
      expect(
        (
          await client.query('SELECT to_regclass($1) AS object', [
            `${schema}."BatchPlan"`,
          ])
        ).rows,
      ).toEqual([{ object: null }]);
      await client.query(sql);
      expect(
        (await client.query('SELECT * FROM "Cocktail" ORDER BY id')).rows,
      ).toEqual(before);
      const add = (id: string, workspace = 'bar', version = 0) =>
        client.query(
          `INSERT INTO "BatchPlan" (id,"workspaceId","sourceCocktailId","sourceContentVersion","creatorId","creationRequestId","creationFingerprint",name,snapshot,parameters,version,"updatedAt") VALUES ($1,$2,'recipe',0,'owner',$3,$4,'Base',$5::jsonb,$6::jsonb,$7,now())`,
          [
            id,
            workspace,
            randomUUID(),
            'a'.repeat(64),
            JSON.stringify({ schemaVersion: 1, recipe: {} }),
            JSON.stringify({
              mode: 'VOLUME_ML',
              target: 1000,
              includedPositions: [0],
              rounding: [],
            }),
            version,
          ],
        );
      await add('p');
      await expect(add('foreign', 'other')).rejects.toMatchObject({
        code: '23503',
      });
      await expect(add('negative', 'bar', -1)).rejects.toMatchObject({
        code: '23514',
      });
      await expect(
        client.query(`UPDATE "BatchPlan" SET snapshot='{}' WHERE id='p'`),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        client.query(
          `UPDATE "BatchPlan" SET snapshot='{"recipe":{}}' WHERE id='p'`,
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        client.query(`UPDATE "BatchPlan" SET parameters='{}' WHERE id='p'`),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        client.query(`DELETE FROM "Cocktail" WHERE id='recipe'`),
      ).rejects.toMatchObject({ code: '23503' });
      await expect(
        client.query(`DELETE FROM "Workspace" WHERE id='bar'`),
      ).rejects.toMatchObject({ code: '23503' });
      await expect(
        client.query(`DELETE FROM "User" WHERE id='owner'`),
      ).rejects.toMatchObject({ code: '23503' });
      expect(
        (await client.query('SELECT count(*)::int AS n FROM "BatchPlan"')).rows,
      ).toEqual([{ n: 1 }]);
    } finally {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await client.end();
    }
  });
});
