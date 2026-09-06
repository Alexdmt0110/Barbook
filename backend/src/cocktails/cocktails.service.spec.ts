import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CocktailType,
  MeasurementUnit,
  RecipeMethod,
} from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CocktailsService } from './cocktails.service';

type FindUniqueMock = jest.Mock<Promise<unknown>, [Record<string, unknown>]>;

type FindManyMock = jest.Mock<Promise<unknown[]>, [Record<string, unknown>]>;

type CountMock = jest.Mock<Promise<number>, [Record<string, unknown>]>;

type TransactionMock = jest.Mock<Promise<unknown[]>, [Promise<unknown>[]]>;

function decimal(value: number): {
  toString(): string;
} {
  return {
    toString: () => value.toString(),
  };
}

function buildListRecord() {
  return {
    id: 'cocktail-123',
    slug: 'negroni',
    name: 'Negroni',
    type: CocktailType.CLASSIC,
    family: 'Spirit-forward',
    method: RecipeMethod.MIXING_GLASS,
    glass: 'Old fashioned',
    imageUrl: null,
    updatedAt: new Date('2026-08-24T12:00:00.000Z'),
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
  let cocktailFindMany: FindManyMock;
  let cocktailCount: CountMock;
  let transaction: TransactionMock;

  let service: CocktailsService;

  beforeEach(() => {
    workspaceFindUnique = jest.fn<
      Promise<unknown>,
      [Record<string, unknown>]
    >();

    cocktailFindUnique = jest.fn<Promise<unknown>, [Record<string, unknown>]>();

    cocktailFindMany = jest.fn<Promise<unknown[]>, [Record<string, unknown>]>();

    cocktailCount = jest.fn<Promise<number>, [Record<string, unknown>]>();

    transaction = jest.fn(
      async (operations: Promise<unknown>[]): Promise<unknown[]> =>
        Promise.all(operations),
    );

    const prismaService = {
      workspace: {
        findUnique: workspaceFindUnique,
      },
      cocktail: {
        findUnique: cocktailFindUnique,
        findMany: cocktailFindMany,
        count: cocktailCount,
      },
      $transaction: transaction,
    } as unknown as PrismaService;

    service = new CocktailsService(prismaService);
  });

  describe('findPersonalCocktails', () => {
    it('loads the first page only from the authenticated user personal workspace', async () => {
      const updatedAt = new Date('2026-08-24T12:00:00.000Z');

      workspaceFindUnique.mockResolvedValue({
        id: 'workspace-123',
      });

      cocktailCount.mockResolvedValue(1);
      cocktailFindMany.mockResolvedValue([
        {
          ...buildListRecord(),
          updatedAt,
        },
      ]);

      const result = await service.findPersonalCocktails('user-123');

      expect(workspaceFindUnique).toHaveBeenCalledWith({
        where: {
          personalOwnerId: 'user-123',
        },
        select: {
          id: true,
        },
      });

      expect(cocktailCount).toHaveBeenCalledWith({
        where: {
          workspaceId: 'workspace-123',
        },
      });

      expect(cocktailFindMany).toHaveBeenCalledTimes(1);

      expect(cocktailFindMany.mock.calls[0]?.[0]).toMatchObject({
        where: {
          workspaceId: 'workspace-123',
        },
        skip: 0,
        take: 24,
        orderBy: [
          {
            name: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

      expect(transaction).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        items: [
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
        ],
        page: 1,
        pageSize: 24,
        total: 1,
        totalPages: 1,
      });
    });

    it('applies search and enum filters before pagination', async () => {
      workspaceFindUnique.mockResolvedValue({
        id: 'workspace-123',
      });

      cocktailCount.mockResolvedValue(15);
      cocktailFindMany.mockResolvedValue([]);

      const result = await service.findPersonalCocktails('user-123', {
        search: '  neg  ',
        type: CocktailType.CLASSIC,
        method: RecipeMethod.MIXING_GLASS,
        page: 2,
        pageSize: 10,
      });

      const expectedWhere = {
        workspaceId: 'workspace-123',
        name: {
          contains: 'neg',
          mode: 'insensitive',
        },
        type: CocktailType.CLASSIC,
        method: RecipeMethod.MIXING_GLASS,
      };

      expect(cocktailCount).toHaveBeenCalledWith({
        where: expectedWhere,
      });

      expect(cocktailFindMany.mock.calls[0]?.[0]).toMatchObject({
        where: expectedWhere,
        skip: 10,
        take: 10,
      });

      expect(result).toEqual({
        items: [],
        page: 2,
        pageSize: 10,
        total: 15,
        totalPages: 2,
      });
    });

    it('returns an empty paginated result when no cocktail matches', async () => {
      workspaceFindUnique.mockResolvedValue({
        id: 'workspace-123',
      });

      cocktailCount.mockResolvedValue(0);
      cocktailFindMany.mockResolvedValue([]);

      await expect(service.findPersonalCocktails('user-123')).resolves.toEqual({
        items: [],
        page: 1,
        pageSize: 24,
        total: 0,
        totalPages: 0,
      });
    });

    it('fails when the authenticated user has no personal workspace', async () => {
      workspaceFindUnique.mockResolvedValue(null);

      await expect(
        service.findPersonalCocktails('user-123'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(cocktailCount).not.toHaveBeenCalled();
      expect(cocktailFindMany).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe('findPersonalCocktail', () => {
    it('loads and maps a complete cocktail from the personal workspace', async () => {
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
                slug: 'jus-de-citron-vert',
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
                slug: 'sirop-de-sucre',
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
            slug: 'jus-de-citron-vert',
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
            slug: 'sirop-de-sucre',
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
