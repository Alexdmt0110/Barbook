import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { requireTestDatabase } from './helpers/test-database';

const migrationRoot = join(__dirname, '../prisma/migrations');
const preparation = '20261022100000_recipe_lifecycle_prepare';
const readMigration = (name: string) =>
  readFileSync(join(migrationRoot, name, 'migration.sql'), 'utf8');
const previous = readdirSync(migrationRoot)
  .filter((name) => name < preparation && /^\d/.test(name))
  .sort();
const tables = [
  'User',
  'Workspace',
  'WorkspaceMember',
  'Folder',
  'Ingredient',
  'Cocktail',
  'CocktailIngredient',
  'GarnishIngredient',
  'PreparationStep',
  'Tag',
  'CocktailTag',
  'CocktailFolder',
  'Session',
];

async function snapshot(client: Client) {
  const result: Record<string, unknown> = {};
  for (const table of tables) {
    const rows = await client.query<{ row: Record<string, unknown> }>(
      `SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`,
    );
    result[table] = rows.rows.map(({ row }) => {
      // Compare every historical column, not a hand-picked business subset.
      if (table === 'Cocktail') {
        delete row.contentVersion;
        delete row.deletedAt;
        delete row.restoreUntil;
      }
      if (table === 'CocktailIngredient') delete row.abvUnknown;
      return row;
    });
  }
  return result;
}

async function withPreviousSchema(
  run: (client: Client, schema: string) => Promise<void>,
) {
  const client = new Client({ connectionString: requireTestDatabase() });
  const schema = `bb_l5_${randomUUID().replaceAll('-', '')}`;
  let created = false;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await client.query(`SET search_path TO "${schema}"`);
    for (const name of previous) await client.query(readMigration(name));
    await client.query(`
      INSERT INTO "User" (id,email,"passwordHash","displayName","updatedAt")
        VALUES ('owner','l5-migration@example.test','synthetic-unusable-hash','Fixture',now());
      INSERT INTO "Workspace" (id,name,kind,"personalOwnerId","updatedAt")
        VALUES ('ws','Fixture','PERSONAL','owner',now());
      INSERT INTO "WorkspaceMember" ("workspaceId","userId",role) VALUES ('ws','owner','OWNER');
      INSERT INTO "Folder" (id,name,"workspaceId","updatedAt")
        VALUES ('fa','A','ws',now()),('fb','B','ws',now());
      INSERT INTO "Ingredient" (id,name,slug,"defaultAbv","workspaceId","updatedAt") VALUES
        ('inherit','Inherit','inherit',40,'ws',now()),('unknown','Unknown','unknown',NULL,'ws',now()),
        ('zero','Zero','zero',40,'ws',now()),('override','Override','override',40,'ws',now()),
        ('equal','Equal','equal',40,'ws',now());
      INSERT INTO "Cocktail" (id,slug,name,type,method,glass,"workspaceId","folderId","mainAlcoholId","imageUrl","updatedAt")
        VALUES ('recipe','original-url','Original','CLASSIC','SHAKER','Coupe','ws','fa','inherit','/synthetic/unchanged.png',now());
      INSERT INTO "CocktailIngredient" (id,"workspaceId","cocktailId","ingredientId",amount,unit,"abvOverride","sortOrder") VALUES
        ('l1','ws','recipe','inherit',10,'ML',NULL,1),('l2','ws','recipe','unknown',10,'ML',NULL,2),
        ('l3','ws','recipe','zero',10,'ML',0,3),('l4','ws','recipe','override',10,'ML',37,4),
        ('l5','ws','recipe','equal',10,'ML',40,5);
      INSERT INTO "GarnishIngredient" (id,"workspaceId","cocktailId","ingredientId",usage,"sortOrder")
        VALUES ('g','ws','recipe','inherit','Zest',1);
      INSERT INTO "PreparationStep" (id,"cocktailId",content,"sortOrder") VALUES ('s','recipe','Stir',1);
      INSERT INTO "Tag" (id,name,slug,"workspaceId","updatedAt") VALUES ('t','Tag','tag','ws',now());
      INSERT INTO "CocktailTag" ("workspaceId","cocktailId","tagId") VALUES ('ws','recipe','t');
      INSERT INTO "CocktailFolder" ("workspaceId","cocktailId","folderId") VALUES ('ws','recipe','fa'),('ws','recipe','fb');
    `);
    await client.query(`INSERT INTO "Session" (id,"userId","tokenHash","csrfToken","lastSeenAt","idleExpiresAt","expiresAt")
      VALUES ('session','owner',repeat('b',64),repeat('c',43),now(),now()+interval '2 hours',now()+interval '12 hours')`);
    await run(client, schema);
  } finally {
    try {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      // Only a schema created in this guarded, explicitly disposable test DB.
      if (created) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
  }
}

const apply = (client: Client) => client.query(readMigration(preparation));
const window = (client: Client, deleted: string | null, until: string | null) =>
  client.query(
    'UPDATE "Cocktail" SET "deletedAt"=$1::timestamptz,"restoreUntil"=$2::timestamptz WHERE id=\'recipe\'',
    [deleted, until],
  );

describe('Additive recipe lifecycle preparation on real PostgreSQL', () => {
  it('preserves every historical value, both folder relations, tags and exact ABV sources on upgrade', async () => {
    await withPreviousSchema(async (client, schema) => {
      expect(previous).toHaveLength(7);
      const before = await snapshot(client);
      await apply(client);
      expect(await snapshot(client)).toEqual(before);
      expect(
        (
          await client.query(
            'SELECT "contentVersion","organizationVersion","deletedAt","restoreUntil" FROM "Cocktail"',
          )
        ).rows,
      ).toEqual([
        {
          contentVersion: 0,
          organizationVersion: 0,
          deletedAt: null,
          restoreUntil: null,
        },
      ]);
      expect(
        (await client.query('SELECT "abvUnknown" FROM "CocktailIngredient"'))
          .rows,
      ).toEqual(Array.from({ length: 5 }, () => ({ abvUnknown: false })));
      expect(
        (
          await client.query(
            'SELECT indexname FROM pg_indexes WHERE schemaname=$1 AND indexname=$2',
            [schema, 'Cocktail_workspaceId_deletedAt_idx'],
          )
        ).rows,
      ).toHaveLength(1);
      // Old insert writers omit all new fields and continue receiving safe defaults.
      await client.query(`INSERT INTO "Cocktail" (id,slug,name,type,method,glass,"workspaceId","updatedAt")
        VALUES ('old-writer','old-writer','Old writer','CLASSIC','BUILD','Glass','ws',now())`);
      expect(
        (
          await client.query(
            'SELECT "contentVersion","deletedAt" FROM "Cocktail" WHERE id=\'old-writer\'',
          )
        ).rows,
      ).toEqual([{ contentVersion: 0, deletedAt: null }]);
    });
  });

  it('rolls the entire additive DDL back on a later failure, preserves data, and permits a clean retry', async () => {
    await withPreviousSchema(async (client, schema) => {
      await client.query(
        'CREATE INDEX "Cocktail_workspaceId_deletedAt_idx" ON "Cocktail"("workspaceId")',
      );
      const before = await snapshot(client);
      await expect(apply(client)).rejects.toMatchObject({ code: '42P07' });
      await client.query('ROLLBACK');
      expect(
        (
          await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND column_name IN ('contentVersion','deletedAt','restoreUntil','abvUnknown')",
            [schema],
          )
        ).rows,
      ).toEqual([]);
      expect(await snapshot(client)).toEqual(before);
      await client.query('DROP INDEX "Cocktail_workspaceId_deletedAt_idx"');
      await apply(client);
      expect(await snapshot(client)).toEqual(before);
    });
  });

  it('rejects a negative content version without changing its previous value', async () => {
    await withPreviousSchema(async (client) => {
      await apply(client);
      await expect(
        client.query('UPDATE "Cocktail" SET "contentVersion"=-1'),
      ).rejects.toMatchObject({ code: '23514' });
      expect(
        (await client.query('SELECT "contentVersion" FROM "Cocktail"')).rows,
      ).toEqual([{ contentVersion: 0 }]);
    });
  });

  it.each([
    [null, '2026-03-31T12:00:00Z'],
    ['2026-03-01T12:00:00Z', null],
    ['2026-03-01T12:00:00Z', '2026-03-31T11:59:59.999Z'],
    ['2026-03-01T12:00:00Z', '2026-03-31T12:00:00.001Z'],
    ['infinity', 'infinity'],
    ['-infinity', '-infinity'],
  ])(
    'rejects an incomplete, nonfinite or incorrect 30-day window: %s / %s',
    async (deleted, until) => {
      await withPreviousSchema(async (client) => {
        await apply(client);
        await expect(window(client, deleted, until)).rejects.toMatchObject({
          code: '23514',
        });
        expect(
          (
            await client.query(
              'SELECT "deletedAt","restoreUntil" FROM "Cocktail"',
            )
          ).rows,
        ).toEqual([{ deletedAt: null, restoreUntil: null }]);
      });
    },
  );

  it.each(['America/New_York', 'Europe/Paris'])(
    'keeps the UTC calendar window exact across DST under connection timezone %s',
    async (zone) => {
      await withPreviousSchema(async (client) => {
        await apply(client);
        await client.query("SELECT set_config('TimeZone',$1,false)", [zone]);
        await window(client, '2026-03-01T12:00:00Z', '2026-03-31T12:00:00Z');
        const rows = await client.query<{
          deletedAt: Date;
          restoreUntil: Date;
        }>('SELECT "deletedAt","restoreUntil" FROM "Cocktail"');
        expect(rows.rows[0].deletedAt.toISOString()).toBe(
          '2026-03-01T12:00:00.000Z',
        );
        expect(rows.rows[0].restoreUntil.toISOString()).toBe(
          '2026-03-31T12:00:00.000Z',
        );
      });
    },
  );

  it('distinguishes inherited known/unknown, override zero, override equal to catalog, and explicit unknown', async () => {
    await withPreviousSchema(async (client) => {
      await apply(client);
      const rows = await client.query(
        'SELECT id,"abvOverride"::text,"abvUnknown" FROM "CocktailIngredient" ORDER BY id',
      );
      expect(rows.rows).toEqual([
        { id: 'l1', abvOverride: null, abvUnknown: false },
        { id: 'l2', abvOverride: null, abvUnknown: false },
        { id: 'l3', abvOverride: '0.00', abvUnknown: false },
        { id: 'l4', abvOverride: '37.00', abvUnknown: false },
        { id: 'l5', abvOverride: '40.00', abvUnknown: false },
      ]);
      await client.query(
        'UPDATE "CocktailIngredient" SET "abvUnknown"=true WHERE id=\'l1\'',
      );
      expect(
        (
          await client.query(
            'SELECT "abvOverride","abvUnknown" FROM "CocktailIngredient" WHERE id=\'l1\'',
          )
        ).rows,
      ).toEqual([{ abvOverride: null, abvUnknown: true }]);
      await expect(
        client.query(
          'UPDATE "CocktailIngredient" SET "abvOverride"=0 WHERE id=\'l1\'',
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        client.query(
          'UPDATE "CocktailIngredient" SET "abvUnknown"=true WHERE id=\'l5\'',
        ),
      ).rejects.toMatchObject({ code: '23514' });
      expect(
        (
          await client.query(
            'SELECT "defaultAbv"::text FROM "Ingredient" WHERE id=\'inherit\'',
          )
        ).rows,
      ).toEqual([{ defaultAbv: '40.00' }]);
    });
  });

  it('keeps the slug reserved even for an expired retained row and a renamed display name', async () => {
    await withPreviousSchema(async (client) => {
      await apply(client);
      await window(client, '2020-01-01T12:00:00Z', '2020-01-31T12:00:00Z');
      await client.query(
        "UPDATE \"Cocktail\" SET name='Renamed' WHERE id='recipe'",
      );
      await expect(
        client.query(`INSERT INTO "Cocktail" (id,slug,name,type,method,glass,"workspaceId","updatedAt")
        VALUES ('collision','original-url','Another name','CLASSIC','BUILD','Glass','ws',now())`),
      ).rejects.toMatchObject({ code: '23505' });
      expect(
        (
          await client.query(
            'SELECT id,slug,name,"workspaceId" FROM "Cocktail"',
          )
        ).rows,
      ).toEqual([
        {
          id: 'recipe',
          slug: 'original-url',
          name: 'Renamed',
          workspaceId: 'ws',
        },
      ]);
    });
  });

  it('preserves legacy Restrict and membership Cascade without deleting a retained recipe', async () => {
    await withPreviousSchema(async (client) => {
      await apply(client);
      await window(client, '2020-01-01T12:00:00Z', '2020-01-31T12:00:00Z');
      await expect(
        client.query('DELETE FROM "Folder" WHERE id=\'fa\''),
      ).rejects.toMatchObject({ code: '23503' });
      await client.query(
        'UPDATE "Cocktail" SET "folderId"=\'fb\' WHERE id=\'recipe\'',
      );
      await client.query('DELETE FROM "Folder" WHERE id=\'fa\'');
      expect(
        (await client.query('SELECT "folderId" FROM "Cocktail"')).rows,
      ).toEqual([{ folderId: 'fb' }]);
      expect(
        (await client.query('SELECT "folderId" FROM "CocktailFolder"')).rows,
      ).toEqual([{ folderId: 'fb' }]);
      expect(
        (
          await client.query(
            'SELECT id FROM "CocktailTag" JOIN "Tag" ON "Tag".id="tagId"',
          )
        ).rows,
      ).toEqual([{ id: 't' }]);
    });
  });
});
