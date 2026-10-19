import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { requireTestDatabase } from './helpers/test-database';

const migrationRoot = join(__dirname, '../prisma/migrations');
const migrations = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const sql = (name: string) =>
  readFileSync(join(migrationRoot, name, 'migration.sql'), 'utf8');
const initialMigration = '20260823213342_initial_data_model';
const uniqueIngredientMigration = '20260902181646_unique_recipe_ingredient';
const workspaceIntegrityMigration =
  '20260903083501_workspace_relational_integrity';

const garnishUnitMigration = '20261016141503_garnish_unit_integrity';
const folderExpandMigration =
  '20260908095150_multiple_folder_membership_expand';
const folderVersionMigration = '20261019073922_folder_organization_versions';

async function withLegacySchema(
  run: (client: Client, schema: string) => Promise<void>,
): Promise<void> {
  const client = new Client({ connectionString: requireTestDatabase() });
  const schema = `bb_upgrade_${randomUUID().replaceAll('-', '')}`;
  let created = false;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(sql(initialMigration));
    await client.query(sql(uniqueIngredientMigration));
    await run(client, schema);
  } finally {
    try {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      // schema is generated here, recorded as created, and confined to the opted-in test DB.
      if (created) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
  }
}

async function legacyRows(
  client: Client,
  foreignFolder: boolean,
): Promise<void> {
  await client.query(
    "INSERT INTO \"Workspace\" (\"id\",\"name\",\"kind\",\"updatedAt\") VALUES ('ws-a','A','SHARED',now()),('ws-b','B','SHARED',now())",
  );
  await client.query(
    "INSERT INTO \"Folder\" (\"id\",\"name\",\"workspaceId\",\"updatedAt\") VALUES ('folder-a','A','ws-a',now()),('folder-b','B','ws-b',now())",
  );
  await client.query(
    "INSERT INTO \"Ingredient\" (\"id\",\"name\",\"slug\",\"workspaceId\",\"defaultAbv\",\"updatedAt\") VALUES ('ing-a','Gin','gin','ws-a',40,now()),('ing-b','Gin','gin','ws-b',40,now())",
  );
  await client.query(
    'INSERT INTO "Cocktail" ("id","slug","name","type","method","glass","workspaceId","folderId","mainAlcoholId","updatedAt") VALUES (\'recipe-a\',\'legacy\',\'Legacy\',\'CLASSIC\',\'SHAKER\',\'Coupe\',\'ws-a\',$1,\'ing-a\',now())',
    [foreignFolder ? 'folder-b' : 'folder-a'],
  );
  await client.query(
    'INSERT INTO "CocktailIngredient" ("id","cocktailId","ingredientId","amount","unit","sortOrder") VALUES (\'line-a\',\'recipe-a\',\'ing-a\',50,\'ML\',1)',
  );
  await client.query(
    'INSERT INTO "GarnishIngredient" ("id","cocktailId","ingredientId","usage","sortOrder") VALUES (\'garnish-a\',\'recipe-a\',\'ing-a\',\'Zest\',1)',
  );
  await client.query(
    'INSERT INTO "Tag" ("id","name","slug","workspaceId","updatedAt") VALUES (\'tag-a\',\'Legacy\',\'legacy\',\'ws-a\',now())',
  );
  await client.query(
    'INSERT INTO "CocktailTag" ("cocktailId","tagId") VALUES (\'recipe-a\',\'tag-a\')',
  );
}

describe('Real migration history and upgrade', () => {
  it('has every versioned migration recorded successfully by Prisma deploy', async () => {
    const client = new Client({ connectionString: requireTestDatabase() });
    await client.connect();
    try {
      const result = await client.query<{ migration_name: string }>(
        'SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL ORDER BY "migration_name"',
      );
      expect(result.rows.map((row) => row.migration_name)).toEqual(migrations);
    } finally {
      await client.end();
    }
  });

  it('backfills legacy children and enables real composite workspace foreign keys', async () => {
    await withLegacySchema(async (client) => {
      await legacyRows(client, false);
      await client.query(sql(workspaceIntegrityMigration));
      const result = await client.query<{ workspaceId: string }>(
        'SELECT "workspaceId" FROM "CocktailIngredient" UNION ALL SELECT "workspaceId" FROM "GarnishIngredient" UNION ALL SELECT "workspaceId" FROM "CocktailTag"',
      );
      expect(result.rows.map((row) => row.workspaceId)).toEqual([
        'ws-a',
        'ws-a',
        'ws-a',
      ]);
      await expect(
        client.query(
          'UPDATE "Cocktail" SET "folderId"=\'folder-b\' WHERE "id"=\'recipe-a\'',
        ),
      ).rejects.toMatchObject({ code: '23503' });
    });
  });

  it('rolls back migration DDL on invalid legacy data and permits a corrected retry', async () => {
    await withLegacySchema(async (client, schema) => {
      await legacyRows(client, true);
      await expect(
        client.query(sql(workspaceIntegrityMigration)),
      ).rejects.toThrow('folder from another workspace');
      await client.query('ROLLBACK');
      const columns = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='CocktailIngredient' AND column_name='workspaceId'",
        [schema],
      );
      expect(columns.rows).toHaveLength(0);
      await client.query(
        'UPDATE "Cocktail" SET "folderId"=\'folder-a\' WHERE "id"=\'recipe-a\'',
      );
      await client.query(sql(workspaceIntegrityMigration));
      const migrated = await client.query<{ workspaceId: string }>(
        'SELECT "workspaceId" FROM "CocktailIngredient"',
      );
      expect(migrated.rows[0].workspaceId).toBe('ws-a');
    });
  });
  it('refuses invalid historical garnish units without rewriting data and validates a corrected retry', async () => {
    await withLegacySchema(async (client) => {
      await legacyRows(client, false);
      await client.query(sql(workspaceIntegrityMigration));
      await client.query(
        `UPDATE "GarnishIngredient" SET "unit"='TOP_UP', "amount"=1 WHERE "id"='garnish-a'`,
      );
      await expect(client.query(sql(garnishUnitMigration))).rejects.toThrow(
        'Reconcile historical TOP_UP garnishes',
      );
      await client.query('ROLLBACK');
      const preserved = await client.query<{ unit: string }>(
        `SELECT "unit" FROM "GarnishIngredient" WHERE "id"='garnish-a'`,
      );
      expect(preserved.rows[0].unit).toBe('TOP_UP');
      await client.query(
        `UPDATE "GarnishIngredient" SET "unit"='PIECE' WHERE "id"='garnish-a'`,
      );
      await client.query(sql(garnishUnitMigration));
      await expect(
        client.query(
          `UPDATE "GarnishIngredient" SET "unit"='TOP_UP' WHERE "id"='garnish-a'`,
        ),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });

  it.each(['main-first', 'expand-first'])(
    'preserves legacy links and initializes versions for %s upgrades',
    async (order) => {
      await withLegacySchema(async (client) => {
        await legacyRows(client, false);
        await client.query(sql(workspaceIntegrityMigration));
        if (order === 'main-first')
          await client.query(sql(garnishUnitMigration));
        await client.query(sql(folderExpandMigration));
        if (order === 'expand-first')
          await client.query(sql(garnishUnitMigration));
        // Simulate the missing-link window while folderId is still authoritative.
        await client.query(
          'DELETE FROM "CocktailFolder" WHERE "cocktailId"=\'recipe-a\'',
        );
        await client.query(sql(folderVersionMigration));
        const links = await client.query<{
          workspaceId: string;
          folderId: string;
        }>(
          'SELECT "workspaceId", "folderId" FROM "CocktailFolder" WHERE "cocktailId"=\'recipe-a\'',
        );
        expect(links.rows).toEqual([
          { workspaceId: 'ws-a', folderId: 'folder-a' },
        ]);
        const versions = await client.query<{
          organizationVersion: number;
          version: number;
        }>(
          'SELECT c."organizationVersion", f."version" FROM "Cocktail" c JOIN "Folder" f ON f."id"=c."folderId" WHERE c."id"=\'recipe-a\'',
        );
        expect(versions.rows).toEqual([{ organizationVersion: 0, version: 0 }]);
        const recipes = await client.query('SELECT "name" FROM "Cocktail"');
        expect(recipes.rows).toEqual([{ name: 'Legacy' }]);
      });
    },
  );

  it('refuses an obsolete expand link without rewriting it and permits an explicit fixture repair', async () => {
    await withLegacySchema(async (client, schema) => {
      await legacyRows(client, false);
      await client.query(sql(workspaceIntegrityMigration));
      await client.query(sql(folderExpandMigration));
      await client.query(sql(garnishUnitMigration));
      await client.query(
        'INSERT INTO "Folder" ("id","name","workspaceId","updatedAt") VALUES (\'folder-next\',\'Next\',\'ws-a\',now())',
      );
      await client.query(
        'UPDATE "Cocktail" SET "folderId"=\'folder-next\' WHERE "id"=\'recipe-a\'',
      );
      await expect(client.query(sql(folderVersionMigration))).rejects.toThrow(
        'Reconcile ambiguous CocktailFolder memberships',
      );
      await client.query('ROLLBACK');
      const oldLink = await client.query(
        'SELECT "folderId" FROM "CocktailFolder"',
      );
      expect(oldLink.rows).toEqual([{ folderId: 'folder-a' }]);
      const legacy = await client.query(
        'SELECT "folderId" FROM "Cocktail" WHERE "id"=\'recipe-a\'',
      );
      expect(legacy.rows).toEqual([{ folderId: 'folder-next' }]);
      const columns = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='Cocktail' AND column_name='organizationVersion'",
        [schema],
      );
      expect(columns.rows).toHaveLength(0);
      // Fixture-only decision: restore the historical authoritative classification.
      await client.query(
        'UPDATE "Cocktail" SET "folderId"=\'folder-a\' WHERE "id"=\'recipe-a\'',
      );
      await client.query(sql(folderVersionMigration));
      const version = await client.query(
        'SELECT "organizationVersion" FROM "Cocktail" WHERE "id"=\'recipe-a\'',
      );
      expect(version.rows).toEqual([{ organizationVersion: 0 }]);
    });
  });

  it('preserves every unexpected multiple membership when the migration refuses it', async () => {
    await withLegacySchema(async (client) => {
      await legacyRows(client, false);
      await client.query(sql(workspaceIntegrityMigration));
      await client.query(sql(folderExpandMigration));
      await client.query(sql(garnishUnitMigration));
      await client.query(
        'INSERT INTO "Folder" ("id","name","workspaceId","updatedAt") VALUES (\'folder-next\',\'Next\',\'ws-a\',now())',
      );
      await client.query(
        'INSERT INTO "CocktailFolder" ("workspaceId","cocktailId","folderId") VALUES (\'ws-a\',\'recipe-a\',\'folder-next\')',
      );
      await expect(client.query(sql(folderVersionMigration))).rejects.toThrow(
        'Reconcile ambiguous CocktailFolder memberships',
      );
      await client.query('ROLLBACK');
      const links = await client.query(
        'SELECT "folderId" FROM "CocktailFolder" ORDER BY "folderId"',
      );
      expect(links.rows).toEqual([
        { folderId: 'folder-a' },
        { folderId: 'folder-next' },
      ]);
    });
  });
});
