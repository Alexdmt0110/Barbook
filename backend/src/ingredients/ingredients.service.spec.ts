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

  it('searches only inside the personal workspace with a bounded candidate set', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany.mockResolvedValue([
      {
        id: 'ingredient-lime',
        name: 'Jus de citron vert',
        slug: 'jus-de-citron-vert',
        defaultAbv: decimal(0),
      },
    ]);

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

    expect(ingredientFindMany).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-123',
        name: {
          contains: 'citron',
          mode: 'insensitive',
        },
      },
      take: 24,
      select: {
        id: true,
        name: true,
        slug: true,
        defaultAbv: true,
      },
    });

    expect(result).toEqual([
      {
        id: 'ingredient-lime',
        name: 'Jus de citron vert',
        slug: 'jus-de-citron-vert',
        defaultAbv: 0,
      },
    ]);
  });

  it('keeps an unknown alcohol level distinct from zero', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany.mockResolvedValue([
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
    ]);

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

  it('orders suggestions by relevance before alphabetical order', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany.mockResolvedValue([
      {
        id: 'contains',
        name: 'Recit aromatique',
        slug: 'recit-aromatique',
        defaultAbv: null,
      },
      {
        id: 'word-start',
        name: 'Jus de citron vert',
        slug: 'jus-de-citron-vert',
        defaultAbv: decimal(0),
      },
      {
        id: 'prefix-b',
        name: 'Citron vert',
        slug: 'citron-vert',
        defaultAbv: decimal(0),
      },
      {
        id: 'exact',
        name: 'Cit',
        slug: 'cit',
        defaultAbv: null,
      },
      {
        id: 'prefix-a',
        name: 'Citron jaune',
        slug: 'citron-jaune',
        defaultAbv: decimal(0),
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

  it('returns at most eight suggestions', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany.mockResolvedValue(
      Array.from(
        {
          length: 12,
        },
        (_, index) => ({
          id: `ingredient-${index}`,
          name: `Citron test ${index}`,
          slug: `citron-test-${index}`,
          defaultAbv: decimal(0),
        }),
      ),
    );

    const result = await service.searchPersonalIngredients('user-123', 'cit');

    expect(result).toHaveLength(8);
  });

  it('returns fewer than eight suggestions when fewer ingredients match', async () => {
    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    ingredientFindMany.mockResolvedValue([
      {
        id: 'lemon-juice',
        name: 'Jus de citron jaune',
        slug: 'jus-de-citron-jaune',
        defaultAbv: decimal(0),
      },
      {
        id: 'lime-juice',
        name: 'Jus de citron vert',
        slug: 'jus-de-citron-vert',
        defaultAbv: decimal(0),
      },
    ]);

    const result = await service.searchPersonalIngredients(
      'user-123',
      'jus de cit',
    );

    expect(result).toHaveLength(2);

    expect(result.map((ingredient) => ingredient.name)).toEqual([
      'Jus de citron jaune',
      'Jus de citron vert',
    ]);
  });
});
