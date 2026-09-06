import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { isPrismaKnownRequestError } from '../common/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import {
  CocktailCreationInvariantError,
  CocktailCreationValidationError,
  requireCocktailCreationSlug,
  ResolvedCatalogIngredient,
  ResolvedRecipeIngredient,
  resolveMainAlcoholId,
  resolveRecipeAbvOverride,
  validateGarnishes,
  validateRecipeIngredients,
} from './cocktail-creation.rules';
import { CreateCocktailResult } from './cocktail.types';
import {
  CreateCocktailDto,
  CreateCocktailGarnishDto,
} from './dto/create-cocktail.dto';

interface ResolvedGarnish {
  ingredientId: string;
  garnish: CreateCocktailGarnishDto;
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

    const workspaceId = personalWorkspace.id;

    const slug = this.evaluateRule(() =>
      requireCocktailCreationSlug(dto.name, 'Cocktail name'),
    );

    const recipeIngredientSlugs = this.evaluateRule(() =>
      validateRecipeIngredients(dto.ingredients),
    );

    this.evaluateRule(() => validateGarnishes(dto.garnishes ?? []));

    const mainAlcoholSlug =
      dto.mainAlcoholName !== undefined
        ? this.evaluateRule(() =>
            requireCocktailCreationSlug(
              dto.mainAlcoholName as string,
              'Main alcohol name',
            ),
          )
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
          workspaceId,
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
          const ingredientSlug = this.evaluateRule(() =>
            requireCocktailCreationSlug(
              ingredient.ingredientName,
              'Ingredient name',
            ),
          );

          const resolvedIngredient = await this.resolveIngredient(
            transaction,
            workspaceId,
            ingredientsBySlug,
            ingredient.ingredientName,
            ingredientSlug,
            ingredient.ingredientDefaultAbv,
          );

          const abvOverride = resolveRecipeAbvOverride(
            ingredient.ingredientDefaultAbv,
            ingredient.abvOverride,
            resolvedIngredient.defaultAbv,
          );

          resolvedRecipeIngredients.push({
            ingredientId: resolvedIngredient.id,
            ingredientSlug,
            defaultAbv: resolvedIngredient.defaultAbv,
            abvOverride,
            ingredient,
          });
        }

        const mainAlcoholId = this.evaluateRule(() =>
          resolveMainAlcoholId(
            mainAlcoholSlug,
            ingredientsBySlug,
            resolvedRecipeIngredients,
          ),
        );

        const resolvedGarnishes: ResolvedGarnish[] = [];

        for (const garnish of dto.garnishes ?? []) {
          const garnishSlug = this.evaluateRule(() =>
            requireCocktailCreationSlug(
              garnish.ingredientName,
              'Garnish ingredient name',
            ),
          );

          const resolvedIngredient = await this.resolveIngredient(
            transaction,
            workspaceId,
            ingredientsBySlug,
            garnish.ingredientName,
            garnishSlug,
          );

          resolvedGarnishes.push({
            ingredientId: resolvedIngredient.id,
            garnish,
          });
        }

        const cocktail = await transaction.cocktail.create({
          data: {
            workspaceId,
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
            ({ ingredientId, abvOverride, ingredient }, index) => ({
              workspaceId,
              cocktailId: cocktail.id,
              ingredientId,
              amount: ingredient.amount ?? null,
              unit: ingredient.unit,
              specification: ingredient.specification ?? null,
              abvOverride,
              notes: ingredient.notes ?? null,
              sortOrder: index + 1,
            }),
          ),
        });

        if (resolvedGarnishes.length > 0) {
          await transaction.garnishIngredient.createMany({
            data: resolvedGarnishes.map(({ ingredientId, garnish }, index) => ({
              workspaceId,
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
      if (isPrismaKnownRequestError(error, 'P2002')) {
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
    ingredientSlug: string,
    defaultAbv?: number | null,
  ): Promise<ResolvedCatalogIngredient> {
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

      /*
       * Une recette ne doit jamais altérer
       * silencieusement le catalogue existant.
       */
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

  private evaluateRule<T>(rule: () => T): T {
    try {
      return rule();
    } catch (error: unknown) {
      if (error instanceof CocktailCreationValidationError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof CocktailCreationInvariantError) {
        throw new InternalServerErrorException(error.message);
      }

      throw error;
    }
  }

  private decimalToNumber(
    value: {
      toString(): string;
    } | null,
  ): number | null {
    return value === null ? null : Number(value.toString());
  }
}
