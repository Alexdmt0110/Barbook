import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MeasurementUnit } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CocktailDetail,
  CocktailDetailGarnish,
  CocktailDetailIngredient,
  CocktailDetailStep,
  CocktailSummary,
} from './cocktail.types';

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

  async findPersonalCocktail(
    userId: string,
    slug: string,
  ): Promise<CocktailDetail> {
    const personalWorkspace = await this.prisma.workspace.findUnique({
      where: {
        personalOwnerId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!personalWorkspace) {
      throw new InternalServerErrorException(
        'Personal workspace is unavailable.',
      );
    }

    const cocktail = await this.prisma.cocktail.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId: personalWorkspace.id,
          slug,
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        family: true,
        method: true,
        glass: true,
        ice: true,
        notes: true,
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
        ingredients: {
          orderBy: {
            sortOrder: 'asc',
          },
          select: {
            id: true,
            amount: true,
            unit: true,
            specification: true,
            abvOverride: true,
            notes: true,
            ingredient: {
              select: {
                id: true,
                name: true,
                slug: true,
                defaultAbv: true,
              },
            },
          },
        },
        garnishes: {
          orderBy: {
            sortOrder: 'asc',
          },
          select: {
            id: true,
            amount: true,
            unit: true,
            specification: true,
            usage: true,
            ingredient: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        steps: {
          orderBy: {
            sortOrder: 'asc',
          },
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    if (!cocktail) {
      throw new NotFoundException('Cocktail not found.');
    }

    const ingredients: CocktailDetailIngredient[] = cocktail.ingredients.map(
      (recipeIngredient) => ({
        id: recipeIngredient.id,
        ingredient: {
          id: recipeIngredient.ingredient.id,
          name: recipeIngredient.ingredient.name,
          slug: recipeIngredient.ingredient.slug,
        },
        amount: this.decimalToNumber(recipeIngredient.amount),
        unit: recipeIngredient.unit,
        specification: recipeIngredient.specification,
        abv: this.decimalToNumber(
          recipeIngredient.abvOverride ??
            recipeIngredient.ingredient.defaultAbv,
        ),
        notes: recipeIngredient.notes,
      }),
    );

    const garnishes: CocktailDetailGarnish[] = cocktail.garnishes.map(
      (garnish) => ({
        id: garnish.id,
        ingredient: garnish.ingredient,
        amount: this.decimalToNumber(garnish.amount),
        unit: garnish.unit,
        specification: garnish.specification,
        usage: garnish.usage,
      }),
    );

    const steps: CocktailDetailStep[] = cocktail.steps.map((step) => ({
      id: step.id,
      content: step.content,
    }));

    return {
      id: cocktail.id,
      slug: cocktail.slug,
      name: cocktail.name,
      type: cocktail.type,
      family: cocktail.family,
      method: cocktail.method,
      glass: cocktail.glass,
      ice: cocktail.ice,
      notes: cocktail.notes,
      imageUrl: cocktail.imageUrl,
      mainAlcohol: cocktail.mainAlcohol,
      folder: cocktail.folder,
      tags: cocktail.tags.map(({ tag }) => tag),
      ingredients,
      garnishes,
      steps,
      estimatedAbv: this.calculateEstimatedAbv(ingredients),
      updatedAt: cocktail.updatedAt,
    };
  }

  private calculateEstimatedAbv(
    ingredients: CocktailDetailIngredient[],
  ): number | null {
    if (
      ingredients.some(
        (ingredient) => ingredient.unit === MeasurementUnit.TOP_UP,
      )
    ) {
      return null;
    }

    const volumeIngredients = ingredients.filter(
      (ingredient) => ingredient.unit === MeasurementUnit.ML,
    );

    if (volumeIngredients.length === 0) {
      return null;
    }

    let totalVolume = 0;
    let alcoholWeightedVolume = 0;

    for (const ingredient of volumeIngredients) {
      if (
        ingredient.amount === null ||
        ingredient.amount <= 0 ||
        ingredient.abv === null
      ) {
        return null;
      }

      totalVolume += ingredient.amount;
      alcoholWeightedVolume += ingredient.amount * ingredient.abv;
    }

    if (totalVolume === 0) {
      return null;
    }

    const estimatedAbv = alcoholWeightedVolume / totalVolume;

    return Math.round(estimatedAbv * 100) / 100;
  }

  private decimalToNumber(
    value: {
      toString(): string;
    } | null,
  ): number | null {
    return value === null ? null : Number(value.toString());
  }
}
