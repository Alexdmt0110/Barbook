import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CocktailSummary } from './cocktail.types';

@Injectable()
export class CocktailsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPersonalCocktails(userId: string): Promise<CocktailSummary[]> {
    const personalWorkspace = await this.prisma.workspace.findUnique({
      where: {
        personalOwnerId: userId,
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

    if (!personalWorkspace) {
      throw new InternalServerErrorException(
        'Personal workspace is unavailable.',
      );
    }

    return personalWorkspace.cocktails.map(
      ({ tags, ...cocktail }): CocktailSummary => ({
        ...cocktail,
        tags: tags.map(({ tag }) => tag),
      }),
    );
  }
}
