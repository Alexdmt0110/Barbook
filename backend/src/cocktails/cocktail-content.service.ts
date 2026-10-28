import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaKnownRequestError } from '../common/prisma-errors';
import { lockOrganizationWorkspace } from '../database/lock-organization-workspace';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import {
  CocktailCreationValidationError,
  requireCocktailCreationSlug,
  validateGarnishes,
  validateRecipeIngredients,
} from './cocktail-creation.rules';
import {
  RecipeAbvMode,
  ReplaceCocktailContentDto,
} from './dto/replace-cocktail-content.dto';
import {
  requireVersion,
  requireVersionCapacity,
} from './organization/organization-preconditions';

const contentInclude = {
  ingredients: { orderBy: { sortOrder: 'asc' }, include: { ingredient: true } },
  garnishes: { orderBy: { sortOrder: 'asc' }, include: { ingredient: true } },
  steps: { orderBy: { sortOrder: 'asc' } },
  mainAlcohol: true,
} satisfies Prisma.CocktailInclude;
type ContentRecord = Prisma.CocktailGetPayload<{
  include: typeof contentInclude;
}>;
const numeric = (value: { toString(): string } | null) =>
  value === null ? null : Number(value.toString());

@Injectable()
export class CocktailContentService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, cocktailId: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.$transaction(
      async (tx) => this.getInWorkspace(tx, workspaceId, cocktailId),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );
  }

  async replace(
    userId: string,
    cocktailId: string,
    dto: ReplaceCocktailContentDto,
  ) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.$transaction(async (tx) => {
      await lockOrganizationWorkspace(tx, workspaceId);
      return this.replaceInWorkspace(tx, workspaceId, cocktailId, dto);
    });
  }

  /** Caller owns the transaction and must authorize/lock the workspace first. */
  async getInWorkspace(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    cocktailId: string,
  ) {
    return this.project(await this.requireRecipe(tx, workspaceId, cocktailId));
  }

  /** Same implementation for personal and authorized shared transactions. */
  async replaceInWorkspace(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    cocktailId: string,
    dto: ReplaceCocktailContentDto,
  ) {
    try {
      validateRecipeIngredients(dto.ingredients);
      validateGarnishes(dto.garnishes ?? []);
      requireCocktailCreationSlug(dto.name, 'Cocktail name');
      for (const line of dto.ingredients) {
        if (
          line.abvMode === RecipeAbvMode.OVERRIDE
            ? line.abvOverride == null
            : line.abvOverride != null
        )
          throw new BadRequestException(
            'An ABV override is required only in OVERRIDE mode.',
          );
      }

      const current = await this.requireRecipe(tx, workspaceId, cocktailId);
      requireVersion(current.contentVersion, dto.expectedContentVersion);

      const catalog = new Map<
        string,
        { id: string; defaultAbv: number | null }
      >();
      const resolve = async (name: string, defaultAbv?: number | null) => {
        const slug = requireCocktailCreationSlug(name, 'Ingredient name');
        const cached = catalog.get(slug);
        if (cached) return cached;
        const ingredient = await tx.ingredient.upsert({
          where: { workspaceId_slug: { workspaceId, slug } },
          update: {},
          create: { workspaceId, name, slug, defaultAbv: defaultAbv ?? null },
          select: { id: true, defaultAbv: true },
        });
        const resolved = {
          id: ingredient.id,
          defaultAbv: numeric(ingredient.defaultAbv),
        };
        catalog.set(slug, resolved);
        return resolved;
      };
      const ingredients = [];
      for (const line of dto.ingredients) {
        const ingredient = await resolve(
          line.ingredientName,
          line.ingredientDefaultAbv,
        );
        ingredients.push({
          ingredientId: ingredient.id,
          amount: line.amount ?? null,
          unit: line.unit,
          specification: line.specification ?? null,
          abvOverride:
            line.abvMode === RecipeAbvMode.OVERRIDE ? line.abvOverride! : null,
          abvUnknown: line.abvMode === RecipeAbvMode.UNKNOWN,
          notes: line.notes ?? null,
        });
      }
      let mainAlcoholId: string | null = null;
      if (dto.mainAlcoholName) {
        const slug = requireCocktailCreationSlug(
          dto.mainAlcoholName,
          'Main alcohol name',
        );
        const reference = catalog.get(slug);
        const line = ingredients.find(
          (item) => item.ingredientId === reference?.id,
        );
        const degree = line?.abvUnknown
          ? null
          : (line?.abvOverride ?? reference?.defaultAbv);
        if (!line || degree == null || degree <= 0)
          throw new BadRequestException(
            'Main alcohol must reference an alcoholic recipe ingredient.',
          );
        mainAlcoholId = line.ingredientId;
      }
      const garnishes = [];
      for (const line of dto.garnishes ?? []) {
        const ingredient = await resolve(line.ingredientName);
        garnishes.push({
          ingredientId: ingredient.id,
          amount: line.amount ?? null,
          unit: line.unit ?? null,
          specification: line.specification ?? null,
          usage: line.usage,
        });
      }
      const scalars = {
        name: dto.name,
        type: dto.type,
        family: dto.family ?? null,
        method: dto.method,
        glass: dto.glass,
        ice: dto.ice ?? null,
        notes: dto.notes ?? null,
        mainAlcoholId,
      };
      const proposed = {
        ...scalars,
        ingredients,
        garnishes,
        steps: dto.steps,
      };
      if (JSON.stringify(proposed) === JSON.stringify(this.snapshot(current)))
        return this.project(current);
      requireVersionCapacity(current.contentVersion);
      await tx.cocktailIngredient.deleteMany({
        where: { workspaceId, cocktailId },
      });
      await tx.garnishIngredient.deleteMany({
        where: { workspaceId, cocktailId },
      });
      await tx.preparationStep.deleteMany({ where: { cocktailId } });
      await tx.cocktail.update({
        where: { workspaceId_id: { workspaceId, id: cocktailId } },
        data: { ...scalars, contentVersion: { increment: 1 } },
      });
      await tx.cocktailIngredient.createMany({
        data: ingredients.map((line, index) => ({
          ...line,
          workspaceId,
          cocktailId,
          sortOrder: index + 1,
        })),
      });
      if (garnishes.length)
        await tx.garnishIngredient.createMany({
          data: garnishes.map((line, index) => ({
            ...line,
            workspaceId,
            cocktailId,
            sortOrder: index + 1,
          })),
        });
      await tx.preparationStep.createMany({
        data: dto.steps.map((content, index) => ({
          cocktailId,
          content,
          sortOrder: index + 1,
        })),
      });
      return this.project(
        await this.requireRecipe(tx, workspaceId, cocktailId),
      );
    } catch (error: unknown) {
      if (error instanceof CocktailCreationValidationError)
        throw new BadRequestException(error.message);
      if (isPrismaKnownRequestError(error, 'P2002'))
        throw new ConflictException(
          'The ingredient catalogue changed. Reload before continuing.',
        );
      throw error;
    }
  }

  private snapshot(recipe: ContentRecord) {
    return {
      name: recipe.name,
      type: recipe.type,
      family: recipe.family,
      method: recipe.method,
      glass: recipe.glass,
      ice: recipe.ice,
      notes: recipe.notes,
      mainAlcoholId: recipe.mainAlcoholId,
      ingredients: recipe.ingredients.map((line) => ({
        ingredientId: line.ingredientId,
        amount: numeric(line.amount),
        unit: line.unit,
        specification: line.specification,
        abvOverride: numeric(line.abvOverride),
        abvUnknown: line.abvUnknown,
        notes: line.notes,
      })),
      garnishes: recipe.garnishes.map((line) => ({
        ingredientId: line.ingredientId,
        amount: numeric(line.amount),
        unit: line.unit,
        specification: line.specification,
        usage: line.usage,
      })),
      steps: recipe.steps.map((step) => step.content),
    };
  }

  private project(recipe: ContentRecord) {
    const snapshot = this.snapshot(recipe);
    return {
      id: recipe.id,
      slug: recipe.slug,
      contentVersion: recipe.contentVersion,
      organizationVersion: recipe.organizationVersion,
      content: {
        name: snapshot.name,
        type: snapshot.type,
        family: snapshot.family,
        method: snapshot.method,
        glass: snapshot.glass,
        ice: snapshot.ice,
        notes: snapshot.notes,
        mainAlcoholName: recipe.mainAlcohol?.name ?? null,
        ingredients: recipe.ingredients.map((line) => ({
          ingredientName: line.ingredient.name,
          ingredientDefaultAbv: numeric(line.ingredient.defaultAbv),
          amount: numeric(line.amount),
          unit: line.unit,
          specification: line.specification,
          abvMode: line.abvUnknown
            ? RecipeAbvMode.UNKNOWN
            : line.abvOverride !== null
              ? RecipeAbvMode.OVERRIDE
              : RecipeAbvMode.INHERIT,
          abvOverride: numeric(line.abvOverride),
          notes: line.notes,
        })),
        garnishes: recipe.garnishes.map((line) => ({
          ingredientName: line.ingredient.name,
          amount: numeric(line.amount),
          unit: line.unit,
          specification: line.specification,
          usage: line.usage,
        })),
        steps: snapshot.steps,
      },
    };
  }

  private async workspaceId(userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { personalOwnerId: userId },
      select: { id: true },
    });
    if (!workspace)
      throw new InternalServerErrorException(
        'Personal workspace is unavailable.',
      );
    return workspace.id;
  }
  private async requireRecipe(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    id: string,
  ) {
    const recipe = await tx.cocktail.findUnique({
      where: { workspaceId_id: { workspaceId, id } },
      include: contentInclude,
    });
    if (!recipe || recipe.deletedAt)
      throw new NotFoundException('Cocktail not found.');
    return recipe;
  }
}
