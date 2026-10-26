import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { requireTestDatabase } from './helpers/test-database';

const root = join(__dirname, '../prisma/migrations');
const current = '20261026131500_workspace_access_revocation';
const sql = readFileSync(join(root, current, 'migration.sql'), 'utf8');

describe('Additive workspace access migration', () => {
  it('preserves historical owners and members, defaults active, constrains version and rolls DDL back', async () => {
    const client = new Client({ connectionString: requireTestDatabase() });
    const schema = `access_${randomUUID().replaceAll('-', '')}`;
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
        `INSERT INTO "User" (id,email,"passwordHash","displayName","updatedAt") VALUES ('owner','owner@example.test','synthetic','Owner',now()),('member','member@example.test','synthetic','Member',now())`,
      );
      await client.query(
        `INSERT INTO "Workspace" (id,name,kind,"updatedAt") VALUES ('bar','Bar','SHARED',now())`,
      );
      await client.query(
        `INSERT INTO "WorkspaceMember" ("workspaceId","userId",role) VALUES ('bar','owner','OWNER'),('bar','member','MEMBER')`,
      );
      const before = (
        await client.query<Record<string, unknown>>(
          'SELECT * FROM "WorkspaceMember" ORDER BY "userId"',
        )
      ).rows;
      await client.query('BEGIN');
      await client.query(
        sql.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''),
      );
      await client.query('ROLLBACK');
      expect(
        (
          await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='Workspace' AND column_name='accessVersion'",
            [schema],
          )
        ).rowCount,
      ).toBe(0);
      await client.query(sql);
      const after = (
        await client.query<Record<string, unknown>>(
          'SELECT * FROM "WorkspaceMember" ORDER BY "userId"',
        )
      ).rows;
      expect(after).toEqual(before.map((row) => ({ ...row, revokedAt: null })));
      expect(
        (
          await client.query<{ accessVersion: number }>(
            'SELECT "accessVersion" FROM "Workspace"',
          )
        ).rows,
      ).toEqual([{ accessVersion: 0 }]);
      await expect(
        client.query('UPDATE "Workspace" SET "accessVersion"=-1'),
      ).rejects.toMatchObject({ code: '23514' });
      expect(
        (
          await client.query<{ accessVersion: number }>(
            'SELECT "accessVersion" FROM "Workspace"',
          )
        ).rows[0].accessVersion,
      ).toBe(0);
    } finally {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await client.end();
    }
  });
});
