import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CocktailType,
  MeasurementUnit,
  RecipeMethod,
} from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCocktailDto } from './dto/create-cocktail.dto';
import { CocktailsService } from './cocktails.service';

type FindUniqueMock = jest.Mock<Promise<unknown>, [Record<string, unknown>]>;

type IngredientUpsertMock = jest.Mock<
  Promise<{ id: string }>,
  [Record<string, unknown>]
>;

type CocktailCreateMock = jest.Mock<
  Promise<{
    id: string;
    slug: string;
  }>,
  [Record<string, unknown>]
>;

type CreateManyMock = jest.Mock<
  Promise<{ count: number }>,
  [Record<string, unknown>]
>;

interface TransactionMock {
  ingredient: {
    upsert: IngredientUpsertMock;
  };
  cocktail: {
    create: CocktailCreateMock;
  };
  cocktailIngredient: {
    createMany: CreateManyMock;
  };
  garnishIngredient: {
    createMany: CreateManyMock;
  };
  preparationStep: {
    createMany: CreateManyMock;
  };
}

type TransactionCallback = (transaction: TransactionMock) => Promise<unknown>;

type PrismaTransactionMock = jest.Mock<Promise<unknown>, [TransactionCallback]>;

function decimal(value: number): {
  toString(): string;
} {
  return {
    toString: () => value.toString(),
  };
}

function buildCreateDto(
  overrides: Partial<CreateCocktailDto> = {},
): CreateCocktailDto {
  return {
    name: 'Whiskey Sour',
    type: CocktailType.CLASSIC,
    family: 'Sour',
    method: RecipeMethod.SHAKER,
    glass: 'Old fashioned',
    ice: 'Glaçons',
    notes: 'Servir bien frais.',
    mainAlcoholName: 'Bourbon',
    ingredients: [
      {
        ingredientName: 'Bourbon',
        ingredientDefaultAbv: 40,
        amount: 50,
        unit: MeasurementUnit.ML,
      },
      {
        ingredientName: 'Jus de citron jaune',
        ingredientDefaultAbv: 0,
        amount: 25,
        unit: MeasurementUnit.ML,
      },
      {
        ingredientName: 'Sirop de sucre',
        ingredientDefaultAbv: 0,
        amount: 15,
        unit: MeasurementUnit.ML,
        notes: 'Sirop simple 1:1.',
      },
    ],
    garnishes: [
      {
        ingredientName: 'Citron jaune',
        usage: 'Exprimer un zeste au-dessus du verre.',
      },
    ],
    steps: [
      'Verser les ingrédients dans un shaker.',
      'Ajouter de la glace et shaker.',
      'Filtrer dans le verre.',
    ],
    ...overrides,
  };
}

function buildDetailRecord(
  ingredients: unknown[],
  garnishes: unknown[] = [],
  steps: unknown[] = [],
) {
  return {
    id: 'cocktail-123',
    slug: 'daiquiri',
    name: 'Daiquiri',
    type: CocktailType.CLASSIC,
    family: 'Sour',
    method: RecipeMethod.SHAKER,
    glass: 'Coupe',
    ice: null,
    notes: 'Servir immédiatement.',
    imageUrl: null,
    updatedAt: new Date('2026-08-24T12:00:00.000Z'),
    mainAlcohol: {
      id: 'ingredient-rum',
      name: 'Rhum blanc',
    },
    folder: null,
    tags: [
      {
        tag: {
          id: 'tag-classic',
          name: 'Classique',
          slug: 'classique',
        },
      },
    ],
    ingredients,
    garnishes,
    steps,
  };
}

describe('CocktailsService', () => {
  let workspaceFindUnique: FindUniqueMock;
  let cocktailFindUnique: FindUniqueMock;

  let ingredientUpsert: IngredientUpsertMock;
  let cocktailCreate: CocktailCreateMock;

  let cocktailIngredientCreateMany: CreateManyMock;
  let garnishIngredientCreateMany: CreateManyMock;
  let preparationStepCreateMany: CreateManyMock;

  let prismaTransaction: PrismaTransactionMock;

  let transaction: TransactionMock;
  let service: CocktailsService;

  beforeEach(() => {
    workspaceFindUnique = jest.fn<
      Promise<unknown>,
      [Record<string, unknown>]
    >();

    cocktailFindUnique = jest.fn<Promise<unknown>, [Record<string, unknown>]>();

    ingredientUpsert = jest.fn<
      Promise<{ id: string }>,
      [Record<string, unknown>]
    >();

    cocktailCreate = jest.fn<
      Promise<{
        id: string;
        slug: string;
      }>,
      [Record<string, unknown>]
    >();

    cocktailIngredientCreateMany = jest.fn<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >();

    garnishIngredientCreateMany = jest.fn<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >();

    preparationStepCreateMany = jest.fn<
      Promise<{ count: number }>,
      [Record<string, unknown>]
    >();

    transaction = {
      ingredient: {
        upsert: ingredientUpsert,
      },
      cocktail: {
        create: cocktailCreate,
      },
      cocktailIngredient: {
        createMany: cocktailIngredientCreateMany,
      },
      garnishIngredient: {
        createMany: garnishIngredientCreateMany,
      },
      preparationStep: {
        createMany: preparationStepCreateMany,
      },
    };

    prismaTransaction = jest.fn<Promise<unknown>, [TransactionCallback]>();

    prismaTransaction.mockImplementation((callback) => callback(transaction));

    const prismaService = {
      workspace: {
        findUnique: workspaceFindUnique,
      },
      cocktail: {
        findUnique: cocktailFindUnique,
      },
      $transaction: prismaTransaction,
    } as unknown as PrismaService;

    service = new CocktailsService(prismaService);
  });

  describe('createPersonalCocktail', () => {
    beforeEach(() => {
      workspaceFindUnique.mockResolvedValue({
        id: 'workspace-123',
      });

      cocktailFindUnique.mockResolvedValue(null);

      ingredientUpsert.mockImplementation((query) => {
        const where = query['where'] as {
          workspaceId_slug: {
            slug: string;
          };
        };

        return Promise.resolve({
          id: `ingredient-${where.workspaceId_slug.slug}`,
        });
      });

      cocktailCreate.mockResolvedValue({
        id: 'cocktail-new',
        slug: 'whiskey-sour',
      });

      cocktailIngredientCreateMany.mockResolvedValue({
        count: 3,
      });

      garnishIngredientCreateMany.mockResolvedValue({
        count: 1,
      });

      preparationStepCreateMany.mockResolvedValue({
        count: 3,
      });
    });

    it('creates a complete cocktail inside the personal workspace transaction', async () => {
      const result = await service.createPersonalCocktail(
        'user-123',
        buildCreateDto(),
      );

      expect(workspaceFindUnique).toHaveBeenCalledWith({
        where: {
          personalOwnerId: 'user-123',
        },
        select: {
          id: true,
        },
      });

      expect(cocktailFindUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_slug: {
            workspaceId: 'workspace-123',
            slug: 'whiskey-sour',
          },
        },
        select: {
          id: true,
        },
      });

      expect(prismaTransaction).toHaveBeenCalledTimes(1);

      expect(cocktailCreate).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace-123',
          slug: 'whiskey-sour',
          name: 'Whiskey Sour',
          type: CocktailType.CLASSIC,
          family: 'Sour',
          method: RecipeMethod.SHAKER,
          glass: 'Old fashioned',
          ice: 'Glaçons',
          notes: 'Servir bien frais.',
          mainAlcoholId: 'ingredient-bourbon',
        },
        select: {
          id: true,
          slug: true,
        },
      });

      expect(cocktailIngredientCreateMany).toHaveBeenCalledWith({
        data: [
          {
            cocktailId: 'cocktail-new',
            ingredientId: 'ingredient-bourbon',
            amount: 50,
            unit: MeasurementUnit.ML,
            specification: null,
            abvOverride: null,
            notes: null,
            sortOrder: 1,
          },
          {
            cocktailId: 'cocktail-new',
            ingredientId: 'ingredient-jus-de-citron-jaune',
            amount: 25,
            unit: MeasurementUnit.ML,
            specification: null,
            abvOverride: null,
            notes: null,
            sortOrder: 2,
          },
          {
            cocktailId: 'cocktail-new',
            ingredientId: 'ingredient-sirop-de-sucre',
            amount: 15,
            unit: MeasurementUnit.ML,
            specification: null,
            abvOverride: null,
            notes: 'Sirop simple 1:1.',
            sortOrder: 3,
          },
        ],
      });

      expect(garnishIngredientCreateMany).toHaveBeenCalledWith({
        data: [
          {
            cocktailId: 'cocktail-new',
            ingredientId: 'ingredient-citron-jaune',
            amount: null,
            unit: null,
            specification: null,
            usage: 'Exprimer un zeste au-dessus du verre.',
            sortOrder: 1,
          },
        ],
      });

      expect(preparationStepCreateMany).toHaveBeenCalledWith({
        data: [
          {
            cocktailId: 'cocktail-new',
            content: 'Verser les ingrédients dans un shaker.',
            sortOrder: 1,
          },
          {
            cocktailId: 'cocktail-new',
            content: 'Ajouter de la glace et shaker.',
            sortOrder: 2,
          },
          {
            cocktailId: 'cocktail-new',
            content: 'Filtrer dans le verre.',
            sortOrder: 3,
          },
        ],
      });

      expect(result).toEqual({
        id: 'cocktail-new',
        slug: 'whiskey-sour',
      });
    });

    it('creates or reuses canonical ingredients without updating existing catalogue values', async () => {
      await service.createPersonalCocktail('user-123', buildCreateDto());

      expect(ingredientUpsert).toHaveBeenCalledWith({
        where: {
          workspaceId_slug: {
            workspaceId: 'workspace-123',
            slug: 'bourbon',
          },
        },
        update: {},
        create: {
          workspaceId: 'workspace-123',
          slug: 'bourbon',
          name: 'Bourbon',
          defaultAbv: 40,
        },
        select: {
          id: true,
        },
      });

      expect(ingredientUpsert).toHaveBeenCalledWith({
        where: {
          workspaceId_slug: {
            workspaceId: 'workspace-123',
            slug: 'sirop-de-sucre',
          },
        },
        update: {},
        create: {
          workspaceId: 'workspace-123',
          slug: 'sirop-de-sucre',
          name: 'Sirop de sucre',
          defaultAbv: 0,
        },
        select: {
          id: true,
        },
      });
    });

    it('reuses an ingredient already resolved in the same request', async () => {
      const dto = buildCreateDto({
        garnishes: [
          {
            ingredientName: 'Bourbon',
            usage: 'Utilisé ici uniquement pour vérifier la résolution.',
          },
        ],
      });

      await service.createPersonalCocktail('user-123', dto);

      const bourbonCalls = ingredientUpsert.mock.calls.filter(([query]) => {
        const where = query['where'] as {
          workspaceId_slug: {
            slug: string;
          };
        };

        return where.workspaceId_slug.slug === 'bourbon';
      });

      expect(bourbonCalls).toHaveLength(1);
    });

    it('stores TOP_UP without an amount', async () => {
      const dto = buildCreateDto({
        name: 'Gin Tonic',
        mainAlcoholName: 'Gin',
        ingredients: [
          {
            ingredientName: 'Gin',
            ingredientDefaultAbv: 40,
            amount: 50,
            unit: MeasurementUnit.ML,
          },
          {
            ingredientName: 'Tonic',
            ingredientDefaultAbv: 0,
            unit: MeasurementUnit.TOP_UP,
          },
        ],
        garnishes: [],
      });

      cocktailCreate.mockResolvedValue({
        id: 'cocktail-gin-tonic',
        slug: 'gin-tonic',
      });

      await service.createPersonalCocktail('user-123', dto);

      expect(cocktailIngredientCreateMany).toHaveBeenCalledWith({
        data: [
          {
            cocktailId: 'cocktail-gin-tonic',
            ingredientId: 'ingredient-gin',
            amount: 50,
            unit: MeasurementUnit.ML,
            specification: null,
            abvOverride: null,
            notes: null,
            sortOrder: 1,
          },
          {
            cocktailId: 'cocktail-gin-tonic',
            ingredientId: 'ingredient-tonic',
            amount: null,
            unit: MeasurementUnit.TOP_UP,
            specification: null,
            abvOverride: null,
            notes: null,
            sortOrder: 2,
          },
        ],
      });
    });

    it('rejects TOP_UP when an amount is provided', async () => {
      const dto = buildCreateDto({
        ingredients: [
          {
            ingredientName: 'Tonic',
            ingredientDefaultAbv: 0,
            amount: 100,
            unit: MeasurementUnit.TOP_UP,
          },
        ],
        mainAlcoholName: undefined,
      });

      await expect(
        service.createPersonalCocktail('user-123', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('rejects a non TOP_UP ingredient without an amount', async () => {
      const dto = buildCreateDto({
        ingredients: [
          {
            ingredientName: 'Gin',
            ingredientDefaultAbv: 40,
            unit: MeasurementUnit.ML,
          },
        ],
        mainAlcoholName: 'Gin',
      });

      await expect(
        service.createPersonalCocktail('user-123', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('rejects a garnish when only the amount is defined', async () => {
      const dto = buildCreateDto({
        garnishes: [
          {
            ingredientName: 'Citron jaune',
            amount: 1,
            usage: 'Garnir.',
          },
        ],
      });

      await expect(
        service.createPersonalCocktail('user-123', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('rejects a garnish when only the unit is defined', async () => {
      const dto = buildCreateDto({
        garnishes: [
          {
            ingredientName: 'Citron jaune',
            unit: MeasurementUnit.PIECE,
            usage: 'Garnir.',
          },
        ],
      });

      await expect(
        service.createPersonalCocktail('user-123', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('rejects TOP_UP as a garnish unit', async () => {
      const dto = buildCreateDto({
        garnishes: [
          {
            ingredientName: 'Tonic',
            unit: MeasurementUnit.TOP_UP,
            usage: 'Invalide.',
          },
        ],
      });

      await expect(
        service.createPersonalCocktail('user-123', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('rejects a main alcohol that is not present in the recipe', async () => {
      const dto = buildCreateDto({
        mainAlcoholName: 'Gin',
      });

      await expect(
        service.createPersonalCocktail('user-123', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('rejects a cocktail name that cannot produce a slug', async () => {
      const dto = buildCreateDto({
        name: '--- !!! ---',
      });

      await expect(
        service.createPersonalCocktail('user-123', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(cocktailFindUnique).not.toHaveBeenCalled();

      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('returns conflict when the slug already exists in the personal workspace', async () => {
      cocktailFindUnique.mockResolvedValue({
        id: 'existing-cocktail',
      });

      await expect(
        service.createPersonalCocktail('user-123', buildCreateDto()),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('fails when the authenticated user has no personal workspace', async () => {
      workspaceFindUnique.mockResolvedValue(null);

      await expect(
        service.createPersonalCocktail('user-123', buildCreateDto()),
      ).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(cocktailFindUnique).not.toHaveBeenCalled();

      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('propagates transaction failures without continuing recipe persistence', async () => {
      cocktailCreate.mockRejectedValue(new Error('Database write failed.'));

      await expect(
        service.createPersonalCocktail('user-123', buildCreateDto()),
      ).rejects.toThrow('Database write failed.');

      expect(prismaTransaction).toHaveBeenCalledTimes(1);

      expect(cocktailIngredientCreateMany).not.toHaveBeenCalled();

      expect(garnishIngredientCreateMany).not.toHaveBeenCalled();

      expect(preparationStepCreateMany).not.toHaveBeenCalled();
    });
  });

  describe('findPersonalCocktails', () => {
    it('loads cocktails only from the authenticated user personal workspace', async () => {
      const updatedAt = new Date('2026-08-24T12:00:00.000Z');

      workspaceFindUnique.mockResolvedValue({
        cocktails: [
          {
            id: 'cocktail-123',
            slug: 'negroni',
            name: 'Negroni',
            type: CocktailType.CLASSIC,
            family: 'Spirit-forward',
            method: RecipeMethod.MIXING_GLASS,
            glass: 'Old fashioned',
            imageUrl: null,
            updatedAt,
            mainAlcohol: {
              id: 'ingredient-gin',
              name: 'Gin',
            },
            folder: {
              id: 'folder-classics',
              name: 'Classiques',
            },
            tags: [
              {
                tag: {
                  id: 'tag-bitter',
                  name: 'Amer',
                  slug: 'amer',
                },
              },
              {
                tag: {
                  id: 'tag-italian',
                  name: 'Italien',
                  slug: 'italien',
                },
              },
            ],
          },
        ],
      });

      const result = await service.findPersonalCocktails('user-123');

      expect(workspaceFindUnique).toHaveBeenCalledWith({
        where: {
          personalOwnerId: 'user-123',
        },
        select: {
          cocktails: {
            orderBy: [
              {
                name: 'asc',
              },
              {
                id: 'asc',
              },
            ],
            select: {
              id: true,
              slug: true,
              name: true,
              type: true,
              family: true,
              method: true,
              glass: true,
              imageUrl: true,
              updatedAt: true,
              mainAlcohol: {
                select: {
                  id: true,
                  name: true,
                },
              },
              folder: {
                select: {
                  id: true,
                  name: true,
                },
              },
              tags: {
                select: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(result).toEqual([
        {
          id: 'cocktail-123',
          slug: 'negroni',
          name: 'Negroni',
          type: CocktailType.CLASSIC,
          family: 'Spirit-forward',
          method: RecipeMethod.MIXING_GLASS,
          glass: 'Old fashioned',
          imageUrl: null,
          updatedAt,
          mainAlcohol: {
            id: 'ingredient-gin',
            name: 'Gin',
          },
          folder: {
            id: 'folder-classics',
            name: 'Classiques',
          },
          tags: [
            {
              id: 'tag-bitter',
              name: 'Amer',
              slug: 'amer',
            },
            {
              id: 'tag-italian',
              name: 'Italien',
              slug: 'italien',
            },
          ],
        },
      ]);
    });

    it('returns an empty list when the personal workspace has no cocktails', async () => {
      workspaceFindUnique.mockResolvedValue({
        cocktails: [],
      });

      await expect(service.findPersonalCocktails('user-123')).resolves.toEqual(
        [],
      );
    });

    it('fails when the authenticated user has no personal workspace', async () => {
      workspaceFindUnique.mockResolvedValue(null);

      await expect(
        service.findPersonalCocktails('user-123'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('findPersonalCocktail', () => {
    it('loads a complete cocktail only from the authenticated user personal workspace', async () => {
      workspaceFindUnique.mockResolvedValue({
        id: 'workspace-123',
      });

      cocktailFindUnique.mockResolvedValue(
        buildDetailRecord(
          [
            {
              id: 'recipe-rum',
              amount: decimal(50),
              unit: MeasurementUnit.ML,
              specification: 'Agricole',
              abvOverride: decimal(50),
              notes: null,
              ingredient: {
                id: 'ingredient-rum',
                name: 'Rhum blanc',
                slug: 'rhum-blanc',
                defaultAbv: decimal(40),
              },
            },
            {
              id: 'recipe-lime',
              amount: decimal(25),
              unit: MeasurementUnit.ML,
              specification: null,
              abvOverride: null,
              notes: null,
              ingredient: {
                id: 'ingredient-lime-juice',
                name: 'Jus de citron vert',
                slug: 'jus-citron-vert',
                defaultAbv: decimal(0),
              },
            },
            {
              id: 'recipe-syrup',
              amount: decimal(15),
              unit: MeasurementUnit.ML,
              specification: null,
              abvOverride: null,
              notes: 'Sirop simple 1:1.',
              ingredient: {
                id: 'ingredient-syrup',
                name: 'Sirop de sucre',
                slug: 'sirop-sucre',
                defaultAbv: decimal(0),
              },
            },
          ],
          [
            {
              id: 'garnish-lime',
              amount: decimal(1),
              unit: MeasurementUnit.PIECE,
              specification: null,
              usage: 'Rondelle de citron vert.',
              ingredient: {
                id: 'ingredient-lime',
                name: 'Citron vert',
                slug: 'citron-vert',
              },
            },
          ],
          [
            {
              id: 'step-1',
              content: 'Verser les ingrédients dans le shaker.',
            },
            {
              id: 'step-2',
              content: 'Shaker avec de la glace puis filtrer.',
            },
          ],
        ),
      );

      const result = await service.findPersonalCocktail('user-123', 'daiquiri');

      expect(workspaceFindUnique).toHaveBeenCalledWith({
        where: {
          personalOwnerId: 'user-123',
        },
        select: {
          id: true,
        },
      });

      expect(cocktailFindUnique).toHaveBeenCalledTimes(1);

      expect(cocktailFindUnique.mock.calls[0]?.[0]).toMatchObject({
        where: {
          workspaceId_slug: {
            workspaceId: 'workspace-123',
            slug: 'daiquiri',
          },
        },
        select: {
          ingredients: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          garnishes: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          steps: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      expect(result.ingredients).toEqual([
        {
          id: 'recipe-rum',
          ingredient: {
            id: 'ingredient-rum',
            name: 'Rhum blanc',
            slug: 'rhum-blanc',
          },
          amount: 50,
          unit: MeasurementUnit.ML,
          specification: 'Agricole',
          abv: 50,
          notes: null,
        },
        {
          id: 'recipe-lime',
          ingredient: {
            id: 'ingredient-lime-juice',
            name: 'Jus de citron vert',
            slug: 'jus-citron-vert',
          },
          amount: 25,
          unit: MeasurementUnit.ML,
          specification: null,
          abv: 0,
          notes: null,
        },
        {
          id: 'recipe-syrup',
          ingredient: {
            id: 'ingredient-syrup',
            name: 'Sirop de sucre',
            slug: 'sirop-sucre',
          },
          amount: 15,
          unit: MeasurementUnit.ML,
          specification: null,
          abv: 0,
          notes: 'Sirop simple 1:1.',
        },
      ]);

      expect(result.garnishes).toEqual([
        {
          id: 'garnish-lime',
          ingredient: {
            id: 'ingredient-lime',
            name: 'Citron vert',
            slug: 'citron-vert',
          },
          amount: 1,
          unit: MeasurementUnit.PIECE,
          specification: null,
          usage: 'Rondelle de citron vert.',
        },
      ]);

      expect(result.steps).toEqual([
        {
          id: 'step-1',
          content: 'Verser les ingrédients dans le shaker.',
        },
        {
          id: 'step-2',
          content: 'Shaker avec de la glace puis filtrer.',
        },
      ]);

      expect(result.tags).toEqual([
        {
          id: 'tag-classic',
          name: 'Classique',
          slug: 'classique',
        },
      ]);

      expect(result.estimatedAbv).toBe(27.78);
    });

    it('returns null ABV when a liquid ingredient has an unknown alcohol level', async () => {
      workspaceFindUnique.mockResolvedValue({
        id: 'workspace-123',
      });

      cocktailFindUnique.mockResolvedValue(
        buildDetailRecord([
          {
            id: 'recipe-rum',
            amount: decimal(50),
            unit: MeasurementUnit.ML,
            specification: null,
            abvOverride: null,
            notes: null,
            ingredient: {
              id: 'ingredient-rum',
              name: 'Rhum blanc',
              slug: 'rhum-blanc',
              defaultAbv: decimal(40),
            },
          },
          {
            id: 'recipe-mystery',
            amount: decimal(25),
            unit: MeasurementUnit.ML,
            specification: null,
            abvOverride: null,
            notes: null,
            ingredient: {
              id: 'ingredient-mystery',
              name: 'Ingrédient inconnu',
              slug: 'ingredient-inconnu',
              defaultAbv: null,
            },
          },
        ]),
      );

      const result = await service.findPersonalCocktail('user-123', 'daiquiri');

      expect(result.estimatedAbv).toBeNull();
    });

    it('returns null ABV when the recipe contains a top up', async () => {
      workspaceFindUnique.mockResolvedValue({
        id: 'workspace-123',
      });

      cocktailFindUnique.mockResolvedValue(
        buildDetailRecord([
          {
            id: 'recipe-gin',
            amount: decimal(50),
            unit: MeasurementUnit.ML,
            specification: null,
            abvOverride: null,
            notes: null,
            ingredient: {
              id: 'ingredient-gin',
              name: 'Gin',
              slug: 'gin',
              defaultAbv: decimal(40),
            },
          },
          {
            id: 'recipe-tonic',
            amount: null,
            unit: MeasurementUnit.TOP_UP,
            specification: null,
            abvOverride: null,
            notes: null,
            ingredient: {
              id: 'ingredient-tonic',
              name: 'Tonic',
              slug: 'tonic',
              defaultAbv: decimal(0),
            },
          },
        ]),
      );

      const result = await service.findPersonalCocktail('user-123', 'daiquiri');

      expect(result.estimatedAbv).toBeNull();
    });

    it('returns 404 without revealing cocktails outside the personal workspace', async () => {
      workspaceFindUnique.mockResolvedValue({
        id: 'workspace-user-123',
      });

      cocktailFindUnique.mockResolvedValue(null);

      await expect(
        service.findPersonalCocktail('user-123', 'private-cocktail'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(cocktailFindUnique).toHaveBeenCalledTimes(1);

      expect(cocktailFindUnique.mock.calls[0]?.[0]).toMatchObject({
        where: {
          workspaceId_slug: {
            workspaceId: 'workspace-user-123',
            slug: 'private-cocktail',
          },
        },
      });
    });

    it('fails when the authenticated user has no personal workspace', async () => {
      workspaceFindUnique.mockResolvedValue(null);

      await expect(
        service.findPersonalCocktail('user-123', 'daiquiri'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(cocktailFindUnique).not.toHaveBeenCalled();
    });
  });
});
