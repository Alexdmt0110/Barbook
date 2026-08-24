import { InternalServerErrorException } from '@nestjs/common';
import { CocktailType, RecipeMethod } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CocktailsService } from './cocktails.service';

describe('CocktailsService', () => {
  let workspaceFindUnique: jest.Mock;
  let service: CocktailsService;

  beforeEach(() => {
    workspaceFindUnique = jest.fn();

    const prismaService = {
      workspace: {
        findUnique: workspaceFindUnique,
      },
    } as unknown as PrismaService;

    service = new CocktailsService(prismaService);
  });

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
