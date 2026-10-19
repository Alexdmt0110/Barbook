import { NestExpressApplication } from '@nestjs/platform-express';
import { Pool } from 'pg';
import { CocktailCreationService } from '../src/cocktails/cocktail-creation.service';
import { CreateCocktailResult } from '../src/cocktails/cocktail.types';
import { PrismaService } from '../src/database/prisma.service';
import {
  Actor,
  createActor,
  createApplicationFixture,
  recipePayload,
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

describe('PostgreSQL relational invariants', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let alice: Actor;
  let bob: Actor;
  let recipe: CreateCocktailResult;
  let folder: { id: string };
  let foreignFolder: { id: string };
  let tag: { id: string };
  let foreignTag: { id: string };
  let ginId: string;
  let foreignGinId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: requireTestDatabase() });
    app = await createApplicationFixture();
    prisma = app.get(PrismaService);
    alice = await createActor(app);
    bob = await createActor(app);
    await app
      .get(CocktailCreationService)
      .createPersonalCocktail(bob.user.id, recipePayload());
    foreignGinId = (
      await prisma.ingredient.findUniqueOrThrow({
        where: {
          workspaceId_slug: { workspaceId: bob.workspaceId, slug: 'gin' },
        },
      })
    ).id;
    folder = await prisma.folder.create({
      data: { workspaceId: alice.workspaceId, name: 'Fixture folder' },
    });
    foreignFolder = await prisma.folder.create({
      data: { workspaceId: bob.workspaceId, name: 'Fixture folder' },
    });
    tag = await prisma.tag.create({
      data: {
        workspaceId: alice.workspaceId,
        name: 'Fixture',
        slug: 'fixture',
      },
    });
    foreignTag = await prisma.tag.create({
      data: { workspaceId: bob.workspaceId, name: 'Fixture', slug: 'fixture' },
    });
  });

  beforeEach(async () => {
    recipe = await app
      .get(CocktailCreationService)
      .createPersonalCocktail(alice.user.id, recipePayload());
    ginId = (
      await prisma.ingredient.findUniqueOrThrow({
        where: {
          workspaceId_slug: { workspaceId: alice.workspaceId, slug: 'gin' },
        },
      })
    ).id;
    await prisma.cocktail.update({
      where: { id: recipe.id },
      data: { folderId: folder.id },
    });
    await prisma.cocktailTag.create({
      data: {
        workspaceId: alice.workspaceId,
        cocktailId: recipe.id,
        tagId: tag.id,
      },
    });
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  it.each([
    ['folder', 'UPDATE "Cocktail" SET "folderId"=$1 WHERE "id"=$2'],
    ['main alcohol', 'UPDATE "Cocktail" SET "mainAlcoholId"=$1 WHERE "id"=$2'],
    [
      'recipe ingredient',
      'UPDATE "CocktailIngredient" SET "ingredientId"=$1 WHERE "cocktailId"=$2',
    ],
    [
      'garnish ingredient',
      'UPDATE "GarnishIngredient" SET "ingredientId"=$1 WHERE "cocktailId"=$2',
    ],
    ['tag', 'UPDATE "CocktailTag" SET "tagId"=$1 WHERE "cocktailId"=$2'],
  ])(
    'rejects a foreign workspace %s even for a direct database writer',
    async (kind, sql) => {
      const foreignId =
        kind === 'folder'
          ? foreignFolder.id
          : kind === 'tag'
            ? foreignTag.id
            : foreignGinId;
      await expect(
        pool.query(sql, [foreignId, recipe.id]),
      ).rejects.toMatchObject({ code: '23503' });
    },
  );

  it.each(['CocktailIngredient', 'GarnishIngredient', 'CocktailTag'])(
    'rejects a forged workspaceId on %s',
    async (table) => {
      await expect(
        pool.query(
          `UPDATE "${table}" SET "workspaceId"=$1 WHERE "cocktailId"=$2`,
          [bob.workspaceId, recipe.id],
        ),
      ).rejects.toMatchObject({ code: '23503' });
    },
  );

  it.each([
    [
      'negative amount',
      'UPDATE "CocktailIngredient" SET "amount"=-1 WHERE "cocktailId"=$1',
    ],
    [
      'missing measured amount',
      'UPDATE "CocktailIngredient" SET "amount"=NULL WHERE "cocktailId"=$1',
    ],
    [
      'TOP_UP with amount',
      'UPDATE "CocktailIngredient" SET "unit"=\'TOP_UP\' WHERE "cocktailId"=$1',
    ],
    [
      'ABV override outside range',
      'UPDATE "CocktailIngredient" SET "abvOverride"=101 WHERE "cocktailId"=$1',
    ],
    [
      'half defined garnish',
      'UPDATE "GarnishIngredient" SET "amount"=NULL WHERE "cocktailId"=$1',
    ],
    [
      'TOP_UP garnish',
      'UPDATE "GarnishIngredient" SET "unit"=\'TOP_UP\' WHERE "cocktailId"=$1',
    ],
    [
      'negative preparation order',
      'UPDATE "PreparationStep" SET "sortOrder"=-1 WHERE "cocktailId"=$1',
    ],
  ])(
    'enforces CHECK for %s without application validation',
    async (_kind, sql) => {
      await expect(pool.query(sql, [recipe.id])).rejects.toMatchObject({
        code: '23514',
      });
    },
  );

  it('enforces catalog ABV and personal-workspace owner consistency', async () => {
    await expect(
      pool.query('UPDATE "Ingredient" SET "defaultAbv"=101 WHERE "id"=$1', [
        ginId,
      ]),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        'UPDATE "Workspace" SET "personalOwnerId"=NULL WHERE "id"=$1',
        [alice.workspaceId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query('UPDATE "Workspace" SET "kind"=\'SHARED\' WHERE "id"=$1', [
        alice.workspaceId,
      ]),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('enforces canonical recipe ingredients, ordering and workspace-scoped slug uniqueness', async () => {
    await expect(
      prisma.cocktailIngredient.create({
        data: {
          workspaceId: alice.workspaceId,
          cocktailId: recipe.id,
          ingredientId: ginId,
          amount: 10,
          unit: 'ML',
          sortOrder: 2,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.preparationStep.create({
        data: {
          cocktailId: recipe.id,
          content: 'Duplicate order',
          sortOrder: 1,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    const data = {
      workspaceId: alice.workspaceId,
      slug: recipe.slug,
      name: 'Duplicate slug',
      type: 'CLASSIC' as const,
      method: 'SHAKER' as const,
      glass: 'Coupe',
    };
    await expect(prisma.cocktail.create({ data })).rejects.toMatchObject({
      code: 'P2002',
    });
    const independent = await prisma.cocktail.create({
      data: { ...data, workspaceId: bob.workspaceId },
    });
    expect(independent.workspaceId).toBe(bob.workspaceId);
  });

  it('restricts referenced catalog/folder deletion and cascades only recipe children', async () => {
    await expect(
      prisma.folder.delete({ where: { id: folder.id } }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      prisma.ingredient.delete({ where: { id: ginId } }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await prisma.cocktail.delete({ where: { id: recipe.id } });
    expect(
      await prisma.cocktailIngredient.count({
        where: { cocktailId: recipe.id },
      }),
    ).toBe(0);
    expect(
      await prisma.garnishIngredient.count({
        where: { cocktailId: recipe.id },
      }),
    ).toBe(0);
    expect(
      await prisma.preparationStep.count({ where: { cocktailId: recipe.id } }),
    ).toBe(0);
    expect(
      await prisma.cocktailTag.count({ where: { cocktailId: recipe.id } }),
    ).toBe(0);
    expect(
      await prisma.ingredient.findUnique({ where: { id: ginId } }),
    ).not.toBeNull();
    expect(
      await prisma.folder.findUnique({ where: { id: folder.id } }),
    ).not.toBeNull();
  });
});
