import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { toSlug } from '../common/slug';
import { MeasurementUnit, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CocktailDetail,
  CocktailDetailGarnish,
  CocktailDetailIngredient,
  CocktailDetailStep,
  CocktailSummary,
  CreateCocktailResult,
} from './cocktail.types';
import {
  CreateCocktailDto,
  CreateCocktailGarnishDto,
  CreateCocktailIngredientDto,
} from './dto/create-cocktail.dto';

@Injectable()
export class CocktailsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPersonalCocktail(
    userId: string,
    dto: CreateCocktailDto,
  ): Promise<CreateCocktailResult> {
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

    const slug = this.requireSlug(dto.name, 'Cocktail name');

    this.validateRecipeIngredients(dto.ingredients);

    this.validateGarnishes(dto.garnishes ?? []);

    const recipeIngredientSlugs = new Set(
      dto.ingredients.map((ingredient) =>
        this.requireSlug(ingredient.ingredientName, 'Ingredient name'),
      ),
    );

    const mainAlcoholSlug =
      dto.mainAlcoholName !== undefined
        ? this.requireSlug(dto.mainAlcoholName, 'Main alcohol name')
        : null;

    if (
      mainAlcoholSlug !== null &&
      !recipeIngredientSlugs.has(mainAlcoholSlug)
    ) {
      throw new BadRequestException(
        'Main alcohol must reference a recipe ingredient.',
      );
    }

    const existingCocktail = await this.prisma.cocktail.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId: personalWorkspace.id,
          slug,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingCocktail) {
      throw new ConflictException('A cocktail with this name already exists.');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const ingredientIdsBySlug = new Map<string, string>();

        const resolveIngredient = async (
          name: string,
          defaultAbv?: number | null,
        ): Promise<string> => {
          const ingredientSlug = this.requireSlug(name, 'Ingredient name');

          const cachedIngredientId = ingredientIdsBySlug.get(ingredientSlug);

          if (cachedIngredientId) {
            return cachedIngredientId;
          }

          const ingredient = await transaction.ingredient.upsert({
            where: {
              workspaceId_slug: {
                workspaceId: personalWorkspace.id,
                slug: ingredientSlug,
              },
            },

            // La création d'une recette ne doit pas modifier
            // silencieusement le catalogue existant.
            update: {},

            create: {
              workspaceId: personalWorkspace.id,
              slug: ingredientSlug,
              name,
              defaultAbv: defaultAbv ?? null,
            },
            select: {
              id: true,
            },
          });

          ingredientIdsBySlug.set(ingredientSlug, ingredient.id);

          return ingredient.id;
        };

        const resolvedRecipeIngredients: Array<{
          ingredientId: string;
          ingredient: CreateCocktailIngredientDto;
        }> = [];

        for (const ingredient of dto.ingredients) {
          const ingredientId = await resolveIngredient(
            ingredient.ingredientName,
            ingredient.ingredientDefaultAbv,
          );

          resolvedRecipeIngredients.push({
            ingredientId,
            ingredient,
          });
        }

        let mainAlcoholId: string | null = null;

        if (mainAlcoholSlug !== null) {
          mainAlcoholId = ingredientIdsBySlug.get(mainAlcoholSlug) ?? null;

          if (!mainAlcoholId) {
            throw new InternalServerErrorException(
              'Main alcohol could not be resolved.',
            );
          }
        }

        const resolvedGarnishes: Array<{
          ingredientId: string;
          garnish: CreateCocktailGarnishDto;
        }> = [];

        for (const garnish of dto.garnishes ?? []) {
          const ingredientId = await resolveIngredient(garnish.ingredientName);

          resolvedGarnishes.push({
            ingredientId,
            garnish,
          });
        }

        const cocktail = await transaction.cocktail.create({
          data: {
            workspaceId: personalWorkspace.id,
            slug,
            name: dto.name,
            type: dto.type,
            family: dto.family ?? null,
            method: dto.method,
            glass: dto.glass,
            ice: dto.ice ?? null,
            notes: dto.notes ?? null,
            mainAlcoholId,
          },
          select: {
            id: true,
            slug: true,
          },
        });

        await transaction.cocktailIngredient.createMany({
          data: resolvedRecipeIngredients.map(
            ({ ingredientId, ingredient }, index) => ({
              cocktailId: cocktail.id,
              ingredientId,
              amount: ingredient.amount ?? null,
              unit: ingredient.unit,
              specification: ingredient.specification ?? null,
              abvOverride: ingredient.abvOverride ?? null,
              notes: ingredient.notes ?? null,
              sortOrder: index + 1,
            }),
          ),
        });

        if (resolvedGarnishes.length > 0) {
          await transaction.garnishIngredient.createMany({
            data: resolvedGarnishes.map(({ ingredientId, garnish }, index) => ({
              cocktailId: cocktail.id,
              ingredientId,
              amount: garnish.amount ?? null,
              unit: garnish.unit ?? null,
              specification: garnish.specification ?? null,
              usage: garnish.usage,
              sortOrder: index + 1,
            })),
          });
        }

        await transaction.preparationStep.createMany({
          data: dto.steps.map((content, index) => ({
            cocktailId: cocktail.id,
            content,
            sortOrder: index + 1,
          })),
        });

        return cocktail;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A cocktail with this name already exists.',
        );
      }

      throw error;
    }
  }

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

  private validateRecipeIngredients(
    ingredients: CreateCocktailIngredientDto[],
  ): void {
    for (const ingredient of ingredients) {
      this.requireSlug(ingredient.ingredientName, 'Ingredient name');

      const hasAmount =
        ingredient.amount !== undefined && ingredient.amount !== null;

      if (ingredient.unit === MeasurementUnit.TOP_UP) {
        if (hasAmount) {
          throw new BadRequestException(
            'A TOP_UP ingredient must not define an amount.',
          );
        }

        continue;
      }

      if (!hasAmount) {
        throw new BadRequestException(
          'A recipe ingredient must define an amount unless its unit is TOP_UP.',
        );
      }
    }
  }

  private validateGarnishes(garnishes: CreateCocktailGarnishDto[]): void {
    for (const garnish of garnishes) {
      this.requireSlug(garnish.ingredientName, 'Garnish ingredient name');

      if (garnish.unit === MeasurementUnit.TOP_UP) {
        throw new BadRequestException('TOP_UP cannot be used for a garnish.');
      }

      const hasAmount = garnish.amount !== undefined && garnish.amount !== null;

      const hasUnit = garnish.unit !== undefined && garnish.unit !== null;

      if (hasAmount !== hasUnit) {
        throw new BadRequestException(
          'Garnish amount and unit must either both be defined or both be omitted.',
        );
      }
    }
  }

  private requireSlug(value: string, fieldName: string): string {
    const slug = toSlug(value);

    if (!slug) {
      throw new BadRequestException(
        `${fieldName} must contain at least one letter or number.`,
      );
    }

    return slug;
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
    if (value === null) {
      return null;
    }

    return Number(value.toString());
  }
}
