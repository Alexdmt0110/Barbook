import { toSlug } from '../common/slug';
import { MeasurementUnit } from '../generated/prisma/client';
import {
  CreateCocktailGarnishDto,
  CreateCocktailIngredientDto,
} from './dto/create-cocktail.dto';

export interface ResolvedCatalogIngredient {
  id: string;
  defaultAbv: number | null;
}

export interface ResolvedRecipeIngredient {
  ingredientId: string;
  ingredientSlug: string;
  defaultAbv: number | null;
  abvOverride: number | null;
  ingredient: CreateCocktailIngredientDto;
}

export class CocktailCreationValidationError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'CocktailCreationValidationError';
  }
}

export class CocktailCreationInvariantError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'CocktailCreationInvariantError';
  }
}

export function requireCocktailCreationSlug(
  value: string,
  fieldName: string,
): string {
  const slug = toSlug(value);

  if (!slug) {
    throw new CocktailCreationValidationError(
      `${fieldName} must contain at least one letter or number.`,
    );
  }

  return slug;
}

export function validateRecipeIngredients(
  ingredients: readonly CreateCocktailIngredientDto[],
): Set<string> {
  const ingredientSlugs = new Set<string>();

  for (const ingredient of ingredients) {
    const ingredientSlug = requireCocktailCreationSlug(
      ingredient.ingredientName,
      'Ingredient name',
    );

    if (ingredientSlugs.has(ingredientSlug)) {
      throw new CocktailCreationValidationError(
        'A recipe cannot contain the same ingredient more than once.',
      );
    }

    ingredientSlugs.add(ingredientSlug);

    const hasAmount =
      ingredient.amount !== undefined && ingredient.amount !== null;

    if (ingredient.unit === MeasurementUnit.TOP_UP) {
      if (hasAmount) {
        throw new CocktailCreationValidationError(
          'A TOP_UP ingredient must not define an amount.',
        );
      }

      continue;
    }

    if (!hasAmount) {
      throw new CocktailCreationValidationError(
        'A recipe ingredient must define an amount unless its unit is TOP_UP.',
      );
    }
  }

  return ingredientSlugs;
}

export function validateGarnishes(
  garnishes: readonly CreateCocktailGarnishDto[],
): void {
  for (const garnish of garnishes) {
    requireCocktailCreationSlug(
      garnish.ingredientName,
      'Garnish ingredient name',
    );

    if (garnish.unit === MeasurementUnit.TOP_UP) {
      throw new CocktailCreationValidationError(
        'TOP_UP cannot be used for a garnish.',
      );
    }

    const hasAmount = garnish.amount !== undefined && garnish.amount !== null;

    const hasUnit = garnish.unit !== undefined && garnish.unit !== null;

    if (hasAmount !== hasUnit) {
      throw new CocktailCreationValidationError(
        'Garnish amount and unit must either both be defined or both be omitted.',
      );
    }
  }
}

export function resolveRecipeAbvOverride(
  requestedDefaultAbv: number | null | undefined,
  explicitAbvOverride: number | null | undefined,
  persistedDefaultAbv: number | null,
): number | null {
  if (explicitAbvOverride !== undefined && explicitAbvOverride !== null) {
    return explicitAbvOverride;
  }

  if (
    requestedDefaultAbv === undefined ||
    requestedDefaultAbv === null ||
    requestedDefaultAbv === persistedDefaultAbv
  ) {
    return null;
  }

  return requestedDefaultAbv;
}

export function resolveMainAlcoholId(
  mainAlcoholSlug: string | null,
  ingredientsBySlug: ReadonlyMap<string, ResolvedCatalogIngredient>,
  recipeIngredients: readonly ResolvedRecipeIngredient[],
): string | null {
  if (mainAlcoholSlug === null) {
    return null;
  }

  const mainAlcohol = ingredientsBySlug.get(mainAlcoholSlug);

  if (!mainAlcohol) {
    throw new CocktailCreationInvariantError(
      'Main alcohol could not be resolved.',
    );
  }

  const recipeIngredient = recipeIngredients.find(
    ({ ingredientSlug }) => ingredientSlug === mainAlcoholSlug,
  );

  if (!recipeIngredient) {
    throw new CocktailCreationInvariantError(
      'Main alcohol is missing from the resolved recipe.',
    );
  }

  const effectiveAbv =
    recipeIngredient.abvOverride ?? recipeIngredient.defaultAbv;

  if (effectiveAbv === null || effectiveAbv <= 0) {
    throw new CocktailCreationValidationError(
      'Main alcohol must reference an alcoholic recipe ingredient.',
    );
  }

  return mainAlcohol.id;
}
