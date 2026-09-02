import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IngredientsService } from './ingredients.service';

interface IngredientRecord {
  id: string;
  name: string;
  slug: string;
  defaultAbv: {
    toString(): string;
  } | null;
}

type WorkspaceFindUniqueMock = jest.Mock<
  Promise<unknown>,
  [Record<string, unknown>]
>;

type IngredientFindManyMock = jest.Mock<
  Promise<IngredientRecord[]>,
  [Record<string, unknown>]
>;

function decimal(value: number): {
  toString(): string;
} {
  return {
    toString: () => value.toString(),
  };
}

describe('IngredientsService', () => {
  let workspaceFindUnique: WorkspaceFindUniqueMock;

  let ingredientFindMany: IngredientFindManyMock;

  let service: IngredientsService;

  beforeEach(() => {
    workspaceFindUnique = jest.fn<
      Promise<unknown>,
      [Record<string, unknown>]
    >();

    ingredientFindMany = jest.fn<
      Promise<IngredientRecord[]>,
      [Record<string, unknown>]
    >();

    const prismaService = {
      workspace: {
        findUnique: workspaceFindUnique,
      },

      ingredient: {
        findMany: ingredientFindMany,
      },
    } as unknown as PrismaService;

    service = new IngredientsService(prismaService);
  });

  it('does not search before three characters', async () => {
    await expect(
      service.searchPersonalIngredients('user-123', 'ci'),
    ).resolves.toEqual([]);

    expect(workspaceFindUnique).not.toHaveBeenCalled();

    expect(ingredientFindMany).not.toHaveBeenCalled();
  });

  it('trims the query before applying the minimum length', async () => {
    await expect(
      service.searchPersonalIngredients('user-123', '  ci  '),
    ).resolves.toEqual([]);

    expect(workspaceFindUnique).not.toHaveBeenCalled();

    expect(ingredientFindMany).not.toHaveBeenCalled();
  });

  it('rejects an excessively long search query', async () => {
    const query = 'a'.repeat(121);

    await expect(
      service.searchPersonalIngredients('user-123', query),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workspaceFindUnique).not.toHaveBeenCalled();

    expect(ingredientFindMany).not.toHaveBeenCalled();
  });

  it('fails when the authenticated user has no personal workspace', async () => {
    workspaceFindUnique.mockResolvedValue(null);

    await expect(
      service.searchPersonalIngredients('user-123', 'cit'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(workspaceFindUnique).toHaveBeenCalledWith({
      where: {
        personalOwnerId: 'user-123',
      },
      select: {
        id: true,
      },
    });

    expect(ingredientFindMany).not.toHaveBeenCalled();
  });

  it('searches only inside the personal workspace', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'ingredient-lime',
          name: 'Citron vert',
          slug: 'citron-vert',
          defaultAbv: decimal(0),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.searchPersonalIngredients(
      'user-123',
      '  citron  ',
    );

    expect(workspaceFindUnique).toHaveBeenCalledWith({
      where: {
        personalOwnerId: 'user-123',
      },
      select: {
        id: true,
      },
    });

    expect(ingredientFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          workspaceId: 'workspace-123',
          name: {
            equals: 'citron',
            mode: 'insensitive',
          },
        },
        take: 1,
      }),
    );

    expect(ingredientFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          workspaceId: 'workspace-123',
          name: {
            startsWith: 'citron',
            mode: 'insensitive',
          },
        },
        take: 8,
      }),
    );

    expect(result).toEqual([
      {
        id: 'ingredient-lime',
        name: 'Citron vert',
        slug: 'citron-vert',
        defaultAbv: 0,
      },
    ]);
  });

  it('keeps an unknown alcohol level distinct from zero', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'ingredient-lemon',
          name: 'Citron jaune',
          slug: 'citron-jaune',
          defaultAbv: null,
        },
        {
          id: 'ingredient-lime',
          name: 'Citron vert',
          slug: 'citron-vert',
          defaultAbv: decimal(0),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.searchPersonalIngredients('user-123', 'cit');

    expect(result).toEqual([
      {
        id: 'ingredient-lemon',
        name: 'Citron jaune',
        slug: 'citron-jaune',
        defaultAbv: null,
      },
      {
        id: 'ingredient-lime',
        name: 'Citron vert',
        slug: 'citron-vert',
        defaultAbv: 0,
      },
    ]);
  });

  it('orders exact, prefix, word-start and contains matches by relevance', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany
      .mockResolvedValueOnce([
        {
          id: 'exact',
          name: 'Cit',
          slug: 'cit',
          defaultAbv: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'prefix-a',
          name: 'Citron jaune',
          slug: 'citron-jaune',
          defaultAbv: decimal(0),
        },
        {
          id: 'prefix-b',
          name: 'Citron vert',
          slug: 'citron-vert',
          defaultAbv: decimal(0),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'word-start',
          name: 'Jus de citron vert',
          slug: 'jus-de-citron-vert',
          defaultAbv: decimal(0),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'contains',
          name: 'Recit aromatique',
          slug: 'recit-aromatique',
          defaultAbv: null,
        },
      ]);

    const result = await service.searchPersonalIngredients('user-123', 'cit');

    expect(result.map((ingredient) => ingredient.id)).toEqual([
      'exact',
      'prefix-a',
      'prefix-b',
      'word-start',
      'contains',
    ]);
  });

  it('uses deterministic alphabetical ordering inside each relevance tier', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'prefix-a',
          name: 'Citron jaune',
          slug: 'citron-jaune',
          defaultAbv: decimal(0),
        },
        {
          id: 'prefix-b',
          name: 'Citron vert',
          slug: 'citron-vert',
          defaultAbv: decimal(0),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.searchPersonalIngredients('user-123', 'cit');

    expect(ingredientFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        orderBy: [
          {
            name: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      }),
    );
  });

  it('excludes already selected matches from lower relevance tiers', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany
      .mockResolvedValueOnce([
        {
          id: 'exact',
          name: 'Cit',
          slug: 'cit',
          defaultAbv: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'prefix',
          name: 'Citron vert',
          slug: 'citron-vert',
          defaultAbv: decimal(0),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.searchPersonalIngredients('user-123', 'cit');

    expect(ingredientFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          workspaceId: 'workspace-123',
          id: {
            notIn: ['exact'],
          },
          name: {
            startsWith: 'cit',
            mode: 'insensitive',
          },
        },
      }),
    );

    const wordStartQuery = ingredientFindMany.mock.calls[2]?.[0];

    expect(wordStartQuery).toMatchObject({
      where: {
        id: {
          notIn: ['exact', 'prefix'],
        },
      },
    });
  });

  it('detects word starts after supported separators', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'juice',
          name: 'Jus de citron vert',
          slug: 'jus-de-citron-vert',
          defaultAbv: decimal(0),
        },
      ])
      .mockResolvedValueOnce([]);

    await service.searchPersonalIngredients('user-123', 'cit');

    const wordStartQuery = ingredientFindMany.mock.calls[2]?.[0];

    expect(wordStartQuery).toMatchObject({
      where: {
        workspaceId: 'workspace-123',
        OR: [
          {
            name: {
              contains: ' cit',
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: '-cit',
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: "'cit",
              mode: 'insensitive',
            },
          },
        ],
      },
    });
  });

  it('stops querying lower relevance tiers once eight suggestions are found', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce(
      Array.from(
        {
          length: 8,
        },
        (_, index) => ({
          id: `ingredient-${index}`,
          name: `Citron ${index}`,
          slug: `citron-${index}`,
          defaultAbv: decimal(0),
        }),
      ),
    );

    const result = await service.searchPersonalIngredients('user-123', 'cit');

    expect(result).toHaveLength(8);

    expect(ingredientFindMany).toHaveBeenCalledTimes(2);
  });

  it('returns at most eight suggestions across all relevance tiers', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany
      .mockResolvedValueOnce([
        {
          id: 'exact',
          name: 'Cit',
          slug: 'cit',
          defaultAbv: null,
        },
      ])
      .mockResolvedValueOnce(
        Array.from(
          {
            length: 7,
          },
          (_, index) => ({
            id: `prefix-${index}`,
            name: `Citron ${index}`,
            slug: `citron-${index}`,
            defaultAbv: decimal(0),
          }),
        ),
      );

    const result = await service.searchPersonalIngredients('user-123', 'cit');

    expect(result).toHaveLength(8);

    expect(ingredientFindMany).toHaveBeenCalledTimes(2);
  });

  it('uses the remaining capacity as the database limit for each tier', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany
      .mockResolvedValueOnce([
        {
          id: 'exact',
          name: 'Cit',
          slug: 'cit',
          defaultAbv: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'prefix',
          name: 'Citron vert',
          slug: 'citron-vert',
          defaultAbv: decimal(0),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.searchPersonalIngredients('user-123', 'cit');

    expect(ingredientFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        take: 7,
      }),
    );

    expect(ingredientFindMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        take: 6,
      }),
    );

    expect(ingredientFindMany).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        take: 6,
      }),
    );
  });
});
