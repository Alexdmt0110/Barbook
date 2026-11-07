import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { toSlug } from '../src/common/slug';
import { requireTestDatabase } from './helpers/test-database';

const root = join(__dirname, '../prisma/migrations');
const current = '20261107170000_recipe_canonical_names';
const sql = (name: string) =>
  readFileSync(join(root, name, 'migration.sql'), 'utf8');
async function previousSchema(
  run: (client: Client, schema: string) => Promise<void>,
) {
  const client = new Client({ connectionString: requireTestDatabase() });
  const schema = `bb_names_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  let created = false;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await client.query(`SET search_path TO "${schema}"`);
    for (const name of readdirSync(root)
      .filter((n) => /^\d/.test(n) && n < current)
      .sort())
      await client.query(sql(name));
    await client.query(`
      INSERT INTO "User"(id,email,"passwordHash","displayName","updatedAt") VALUES('owner','names@example.test','synthetic','Fixture',now());
      INSERT INTO "Workspace"(id,name,kind,"personalOwnerId","updatedAt") VALUES('a','A','PERSONAL','owner',now()),('b','B','SHARED',NULL,now());
      INSERT INTO "Cocktail"(id,slug,name,type,method,glass,"workspaceId","updatedAt","contentVersion","organizationVersion") VALUES
        ('original','stable-original-url','Mójito','CLASSIC','BUILD','Glass','a',now(),4,7),
        ('other-space','other-url','mojito','CLASSIC','BUILD','Glass','b',now(),0,0);
      INSERT INTO "Folder"(id,name,"workspaceId","updatedAt") VALUES('folder','Folder','a',now());
      INSERT INTO "Ingredient"(id,name,slug,"defaultAbv","workspaceId","updatedAt") VALUES('ingredient','Gin','gin',40,'a',now());
      UPDATE "Cocktail" SET "folderId"='folder',"mainAlcoholId"='ingredient',"imageUrl"='/synthetic/preserved.png' WHERE id='original';
      INSERT INTO "CocktailFolder"("workspaceId","cocktailId","folderId") VALUES('a','original','folder');
      INSERT INTO "CocktailIngredient"(id,"workspaceId","cocktailId","ingredientId",amount,unit,"abvOverride","sortOrder") VALUES('line','a','original','ingredient',50,'ML',37,1);
      INSERT INTO "GarnishIngredient"(id,"workspaceId","cocktailId","ingredientId",usage,"sortOrder") VALUES('garnish','a','original','ingredient','Synthetic garnish',1);
      INSERT INTO "PreparationStep"(id,"cocktailId",content,"sortOrder") VALUES('step','original','Stir',1);
      INSERT INTO "Tag"(id,name,slug,"workspaceId","updatedAt") VALUES('tag','Tag','tag','a',now());
      INSERT INTO "CocktailTag"("workspaceId","cocktailId","tagId") VALUES('a','original','tag');
    `);
    await run(client, schema);
  } finally {
    try {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      if (created) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
  }
}
async function snapshot(client: Client, schema: string) {
  const result: Record<string, unknown> = {};
  const tables = await client.query<{ tablename: string }>(
    'SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename',
    [schema],
  );
  for (const { tablename } of tables.rows) {
    const rows = await client.query<{ row: Record<string, unknown> }>(
      `SELECT to_jsonb(t) AS row FROM "${tablename}" t ORDER BY to_jsonb(t)::text`,
    );
    result[tablename] = rows.rows.map(({ row }) => {
      if (tablename === 'Cocktail') delete row.nameKey;
      return row;
    });
  }
  return result;
}
const apply = (client: Client) => client.query(sql(current));

describe('Canonical recipe name migration, rollback and old SQL writers on disposable PostgreSQL', () => {
  it('preserves every historical column and allows the same canonical name across workspaces', async () => {
    await previousSchema(async (client, schema) => {
      const before = await snapshot(client, schema);
      await apply(client);
      expect(await snapshot(client, schema)).toEqual(before);
      expect(
        (await client.query('SELECT "nameKey" FROM "Cocktail" ORDER BY id'))
          .rows,
      ).toEqual([{ nameKey: 'mojito' }, { nameKey: 'mojito' }]);
      await client.query(
        `INSERT INTO "Cocktail"(id,slug,name,type,method,glass,"workspaceId","updatedAt") VALUES('legacy','legacy-url','Legacy writer','CLASSIC','BUILD','Glass','a',now())`,
      );
      await client.query(
        `UPDATE "Cocktail" SET name='Renamed legacy',"contentVersion"="contentVersion"+1 WHERE id='legacy'`,
      );
      expect(
        (
          await client.query(
            `SELECT slug,"nameKey","contentVersion" FROM "Cocktail" WHERE id='legacy'`,
          )
        ).rows,
      ).toEqual([
        { slug: 'legacy-url', nameKey: 'renamed-legacy', contentVersion: 1 },
      ]);
      await expect(
        client.query(
          `INSERT INTO "Cocktail"(id,slug,name,"nameKey",type,method,glass,"workspaceId","updatedAt") VALUES('spoof','different-url','MÓJITO','fake-key','CLASSIC','BUILD','Glass','a',now())`,
        ),
      ).rejects.toMatchObject({ code: '23505' });
      await expect(
        client.query(
          `UPDATE "Cocktail" SET name='MOJITO',"nameKey"='another-fake-key' WHERE id='legacy'`,
        ),
      ).rejects.toMatchObject({ code: '23505' });
      expect(
        (
          await client.query(
            `SELECT "nameKey",name FROM "Cocktail" WHERE id='legacy'`,
          )
        ).rows,
      ).toEqual([{ nameKey: 'renamed-legacy', name: 'Renamed legacy' }]);
    });
  });
  it.each([false, true])(
    'aborts without changing any data/schema on a pre-existing collision; expired trash=%s',
    async (expired) => {
      await previousSchema(async (client, schema) => {
        await client.query(
          `INSERT INTO "Cocktail"(id,slug,name,type,method,glass,"workspaceId","updatedAt") VALUES('duplicate','distinct-historical-url','  MOJITO! ','CLASSIC','BUILD','Glass','a',now())`,
        );
        if (expired)
          await client.query(
            `UPDATE "Cocktail" SET "deletedAt"='2020-01-01',"restoreUntil"='2020-01-31' WHERE id='duplicate'`,
          );
        const before = await snapshot(client, schema);
        const attempt = apply(client);
        await expect(attempt).rejects.toMatchObject({ code: 'P0001' });
        await expect(attempt).rejects.toThrow('collisions');
        await client.query('ROLLBACK');
        expect(await snapshot(client, schema)).toEqual(before);
        expect(
          (
            await client.query(
              "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND column_name='nameKey'",
              [schema],
            )
          ).rows,
        ).toEqual([]);
        expect(
          (
            await client.query(
              'SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname=$1',
              [schema],
            )
          ).rows,
        ).toEqual([]);
      });
    },
  );
  it('rolls all DDL/backfill back on a late index failure and permits a clean retry', async () => {
    await previousSchema(async (client, schema) => {
      await client.query(
        'CREATE INDEX "Cocktail_workspaceId_nameKey_key" ON "Cocktail"(id)',
      );
      const before = await snapshot(client, schema);
      await expect(apply(client)).rejects.toMatchObject({ code: '42P07' });
      await client.query('ROLLBACK');
      expect(await snapshot(client, schema)).toEqual(before);
      expect(
        (
          await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND column_name='nameKey'",
            [schema],
          )
        ).rows,
      ).toEqual([]);
      await client.query('DROP INDEX "Cocktail_workspaceId_nameKey_key"');
      await apply(client);
      expect(await snapshot(client, schema)).toEqual(before);
    });
  });
  it('rejects an empty canonical legacy name before any backfill', async () => {
    await previousSchema(async (client, schema) => {
      await client.query(
        `UPDATE "Cocktail" SET name='!!!' WHERE id='original'`,
      );
      const before = await snapshot(client, schema);
      const attempt = apply(client);
      await expect(attempt).rejects.toMatchObject({ code: 'P0001' });
      await expect(attempt).rejects.toThrow('Empty canonical');
      await client.query('ROLLBACK');
      expect(await snapshot(client, schema)).toEqual(before);
    });
  });
  it('keeps expired retained names and historical URLs reserved', async () => {
    await previousSchema(async (client) => {
      await apply(client);
      await client.query(
        `UPDATE "Cocktail" SET name='Menthe',"deletedAt"='2020-01-01',"restoreUntil"='2020-01-31' WHERE id='original'`,
      );
      for (const [name, slug] of [
        ['Menthe', 'free-url'],
        ['Free name', 'stable-original-url'],
      ])
        await expect(
          client.query(
            `INSERT INTO "Cocktail"(id,slug,name,type,method,glass,"workspaceId","updatedAt") VALUES($1,$2,$3,'CLASSIC','BUILD','Glass','a',now())`,
            [randomUUID(), slug, name],
          ),
        ).rejects.toMatchObject({ code: '23505' });
      expect(
        (await client.query(`SELECT count(*)::int AS count FROM "Cocktail"`))
          .rows,
      ).toEqual([{ count: 2 }]);
    });
  });
  it('matches the unchanged JavaScript normalizer for all UTF8 scalar values and combining contexts', async () => {
    await previousSchema(async (client) => {
      await apply(client);
      const hash = (s: string) => createHash('sha256').update(s).digest('hex');
      for (let start = 1; start <= 0x10ffff; start += 8192) {
        let value = '';
        for (let cp = start; cp < Math.min(start + 8192, 0x110000); cp++) {
          if (cp >= 0xd800 && cp <= 0xdfff) continue;
          value += `a${String.fromCodePoint(cp)}z|`;
        }
        const actual = await client.query<{ key: string }>(
          'SELECT barbook_recipe_name_key($1) AS key',
          [value],
        );
        expect({ start, digest: hash(actual.rows[0].key) }).toEqual({
          start,
          digest: hash(toSlug(value)),
        });
      }
      for (const value of [
        ' MÓJITO--- frais ',
        'I\u0307\u0345É',
        '\ufeffNew\u200b Cocktail',
        'Kelvin Œ æ ß İ',
        'a\u0315\u0300b',
        'a\u1ab0\u0301b',
        'ΣΟΣ new',
        '---',
      ])
        expect(
          (
            await client.query<{ key: string }>(
              'SELECT barbook_recipe_name_key($1) AS key',
              [value],
            )
          ).rows[0].key,
        ).toBe(toSlug(value));
    });
  });
});
