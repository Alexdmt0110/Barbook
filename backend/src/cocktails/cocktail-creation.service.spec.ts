import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CocktailType,
  MeasurementUnit,
  RecipeMethod,
} from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CocktailCreationService } from './cocktail-creation.service';
import { CreateCocktailDto } from './dto/create-cocktail.dto';

type DecimalMock = {
  toString(): string;
};

type FindUniqueMock = jest.Mock<Promise<unknown>, [Record<string, unknown>]>;

type IngredientUpsertMock = jest.Mock<
  Promise<{
    id: string;
    defaultAbv: DecimalMock | null;
  }>,
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
  Promise<{
    count: number;
  }>,
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

function decimal(value: number): DecimalMock {
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

describe('CocktailCreationService', () => {
  let workspaceFindUnique: FindUniqueMock;
  let cocktailFindUnique: FindUniqueMock;

  let ingredientUpsert: IngredientUpsertMock;
  let cocktailCreate: CocktailCreateMock;

  let cocktailIngredientCreateMany: CreateManyMock;
  let garnishIngredientCreateMany: CreateManyMock;
  let preparationStepCreateMany: CreateManyMock;

  let prismaTransaction: PrismaTransactionMock;
  let transaction: TransactionMock;

  let service: CocktailCreationService;

  beforeEach(() => {
    workspaceFindUnique = jest.fn<
      Promise<unknown>,
      [Record<string, unknown>]
    >();

    cocktailFindUnique = jest.fn<Promise<unknown>, [Record<string, unknown>]>();

    ingredientUpsert = jest.fn<
      Promise<{
        id: string;
        defaultAbv: DecimalMock | null;
      }>,
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
      Promise<{
        count: number;
      }>,
      [Record<string, unknown>]
    >();

    garnishIngredientCreateMany = jest.fn<
      Promise<{
        count: number;
      }>,
      [Record<string, unknown>]
    >();

    preparationStepCreateMany = jest.fn<
      Promise<{
        count: number;
      }>,
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

    service = new CocktailCreationService(prismaService);

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

      const create = query['create'] as {
        defaultAbv?: number | null;
      };

      const defaultAbv = create.defaultAbv ?? null;

      return Promise.resolve({
        id: `ingredient-${where.workspaceId_slug.slug}`,
        defaultAbv: defaultAbv === null ? null : decimal(defaultAbv),
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

  it('creates a complete cocktail inside one transaction', async () => {
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

    expect(result).toEqual({
      id: 'cocktail-new',
      slug: 'whiskey-sour',
    });
  });

  it('creates or reuses canonical ingredients without updating the existing catalogue', async () => {
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
        defaultAbv: true,
      },
    });
  });

  it('reuses an ingredient already resolved during the request', async () => {
    const dto = buildCreateDto({
      garnishes: [
        {
          ingredientName: 'Bourbon',
          usage: 'Utilisé uniquement pour vérifier la résolution.',
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

  it('rejects a measured ingredient without an amount', async () => {
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

  it('rejects a garnish with only an amount', async () => {
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
  });

  it('rejects a garnish with only a unit', async () => {
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
  });

  it('rejects a main alcohol absent from the recipe', async () => {
    const dto = buildCreateDto({
      mainAlcoholName: 'Gin',
    });

    await expect(
      service.createPersonalCocktail('user-123', dto),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects an explicitly non-alcoholic main alcohol', async () => {
    const dto = buildCreateDto({
      mainAlcoholName: 'Tonic',
      ingredients: [
        {
          ingredientName: 'Tonic',
          ingredientDefaultAbv: 0,
          amount: 100,
          unit: MeasurementUnit.ML,
        },
      ],
      garnishes: [],
    });

    await expect(
      service.createPersonalCocktail('user-123', dto),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cocktailCreate).not.toHaveBeenCalled();
  });

  it('rejects a main alcohol whose ABV is unknown', async () => {
    const dto = buildCreateDto({
      mainAlcoholName: 'Spiritueux inconnu',
      ingredients: [
        {
          ingredientName: 'Spiritueux inconnu',
          ingredientDefaultAbv: null,
          amount: 50,
          unit: MeasurementUnit.ML,
        },
      ],
      garnishes: [],
    });

    await expect(
      service.createPersonalCocktail('user-123', dto),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cocktailCreate).not.toHaveBeenCalled();
  });

  it('uses the persisted catalogue ABV instead of trusting a client default', async () => {
    ingredientUpsert.mockResolvedValue({
      id: 'ingredient-tonic',
      defaultAbv: decimal(0),
    });

    const dto = buildCreateDto({
      mainAlcoholName: 'Tonic',
      ingredients: [
        {
          ingredientName: 'Tonic',
          ingredientDefaultAbv: 40,
          amount: 100,
          unit: MeasurementUnit.ML,
        },
      ],
      garnishes: [],
    });

    await expect(
      service.createPersonalCocktail('user-123', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a positive recipe ABV override for the selected main alcohol', async () => {
    ingredientUpsert.mockResolvedValue({
      id: 'ingredient-gin',
      defaultAbv: decimal(40),
    });

    const dto = buildCreateDto({
      mainAlcoholName: 'Gin',
      ingredients: [
        {
          ingredientName: 'Gin',
          ingredientDefaultAbv: 40,
          abvOverride: 47,
          amount: 50,
          unit: MeasurementUnit.ML,
        },
      ],
      garnishes: [],
    });

    await expect(
      service.createPersonalCocktail('user-123', dto),
    ).resolves.toEqual({
      id: 'cocktail-new',
      slug: 'whiskey-sour',
    });
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

  it('returns conflict when the cocktail slug already exists', async () => {
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

  it('stops recipe persistence when the transaction fails', async () => {
    cocktailCreate.mockRejectedValue(new Error('Database write failed.'));

    await expect(
      service.createPersonalCocktail('user-123', buildCreateDto()),
    ).rejects.toThrow('Database write failed.');

    expect(cocktailIngredientCreateMany).not.toHaveBeenCalled();

    expect(garnishIngredientCreateMany).not.toHaveBeenCalled();

    expect(preparationStepCreateMany).not.toHaveBeenCalled();
  });
});
