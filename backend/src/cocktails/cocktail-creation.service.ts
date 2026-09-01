import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { toSlug } from '../common/slug';
import { MeasurementUnit, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCocktailResult } from './cocktail.types';
import {
  CreateCocktailDto,
  CreateCocktailGarnishDto,
  CreateCocktailIngredientDto,
} from './dto/create-cocktail.dto';

interface ResolvedCatalogIngredient {
  id: string;
  defaultAbv: number | null;
}

interface ResolvedRecipeIngredient {
  ingredientId: string;
  ingredientSlug: string;
  defaultAbv: number | null;
  ingredient: CreateCocktailIngredientDto;
}

@Injectable()
export class CocktailCreationService {
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
        const ingredientsBySlug = new Map<string, ResolvedCatalogIngredient>();

        const resolvedRecipeIngredients: ResolvedRecipeIngredient[] = [];

        for (const ingredient of dto.ingredients) {
          const ingredientSlug = this.requireSlug(
            ingredient.ingredientName,
            'Ingredient name',
          );

          const resolvedIngredient = await this.resolveIngredient(
            transaction,
            personalWorkspace.id,
            ingredientsBySlug,
            ingredient.ingredientName,
            ingredient.ingredientDefaultAbv,
          );

          resolvedRecipeIngredients.push({
            ingredientId: resolvedIngredient.id,
            ingredientSlug,
            defaultAbv: resolvedIngredient.defaultAbv,
            ingredient,
          });
        }

        const mainAlcoholId = this.resolveMainAlcohol(
          mainAlcoholSlug,
          ingredientsBySlug,
          resolvedRecipeIngredients,
        );

        const resolvedGarnishes = [];

        for (const garnish of dto.garnishes ?? []) {
          const resolvedIngredient = await this.resolveIngredient(
            transaction,
            personalWorkspace.id,
            ingredientsBySlug,
            garnish.ingredientName,
          );

          resolvedGarnishes.push({
            ingredientId: resolvedIngredient.id,
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

  private async resolveIngredient(
    transaction: Prisma.TransactionClient,
    workspaceId: string,
    ingredientsBySlug: Map<string, ResolvedCatalogIngredient>,
    name: string,
    defaultAbv?: number | null,
  ): Promise<ResolvedCatalogIngredient> {
    const ingredientSlug = this.requireSlug(name, 'Ingredient name');

    const cachedIngredient = ingredientsBySlug.get(ingredientSlug);

    if (cachedIngredient) {
      return cachedIngredient;
    }

    const ingredient = await transaction.ingredient.upsert({
      where: {
        workspaceId_slug: {
          workspaceId,
          slug: ingredientSlug,
        },
      },

      // Une recette ne doit jamais altérer
      // silencieusement le catalogue existant.
      update: {},

      create: {
        workspaceId,
        slug: ingredientSlug,
        name,
        defaultAbv: defaultAbv ?? null,
      },
      select: {
        id: true,
        defaultAbv: true,
      },
    });

    const resolvedIngredient = {
      id: ingredient.id,
      defaultAbv: this.decimalToNumber(ingredient.defaultAbv),
    };

    ingredientsBySlug.set(ingredientSlug, resolvedIngredient);

    return resolvedIngredient;
  }

  private resolveMainAlcohol(
    mainAlcoholSlug: string | null,
    ingredientsBySlug: ReadonlyMap<string, ResolvedCatalogIngredient>,
    recipeIngredients: readonly ResolvedRecipeIngredient[],
  ): string | null {
    if (mainAlcoholSlug === null) {
      return null;
    }

    const mainAlcohol = ingredientsBySlug.get(mainAlcoholSlug);

    if (!mainAlcohol) {
      throw new InternalServerErrorException(
        'Main alcohol could not be resolved.',
      );
    }

    const isAlcoholic = recipeIngredients.some(
      ({ ingredientSlug, defaultAbv, ingredient }) => {
        if (ingredientSlug !== mainAlcoholSlug) {
          return false;
        }

        const effectiveAbv = ingredient.abvOverride ?? defaultAbv;

        return effectiveAbv !== null && effectiveAbv > 0;
      },
    );

    if (!isAlcoholic) {
      throw new BadRequestException(
        'Main alcohol must reference an alcoholic recipe ingredient.',
      );
    }

    return mainAlcohol.id;
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

  private decimalToNumber(
    value: {
      toString(): string;
    } | null,
  ): number | null {
    return value === null ? null : Number(value.toString());
  }
}
