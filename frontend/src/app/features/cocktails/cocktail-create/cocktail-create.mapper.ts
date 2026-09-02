import { toSlug } from '../../../shared/utils/slug';
import { IngredientSuggestion } from '../../ingredients/data-access/ingredient.models';
import {
  CreateCocktailGarnishRequest,
  CreateCocktailIngredientRequest,
  CreateCocktailRequest,
  MeasurementUnit,
} from '../data-access/cocktail.models';
import {
  CocktailCreateFormValue,
  GarnishFormValue,
  GarnishInputUnit,
  IngredientFormValue,
  IngredientInputUnit,
} from './cocktail-create.form';

export function buildCreateCocktailRequest(
  value: CocktailCreateFormValue,
  selectedIngredients: readonly (IngredientSuggestion | undefined)[],
): CreateCocktailRequest {
  const requestedMainAlcohol = optionalText(value.mainAlcoholName);

  const validMainAlcohol =
    requestedMainAlcohol && hasAlcoholicIngredient(value.ingredients, requestedMainAlcohol)
      ? requestedMainAlcohol
      : undefined;

  return {
    name: value.name.trim(),
    type: value.type,
    family: optionalText(value.family),
    method: value.method,
    glass: value.glass.trim(),
    ice: optionalText(value.ice),
    mainAlcoholName: validMainAlcohol,
    notes: optionalText(value.notes),

    ingredients: value.ingredients.map((ingredient, index): CreateCocktailIngredientRequest =>
      mapIngredient(ingredient, selectedIngredients[index]),
    ),

    garnishes: value.garnishes.map(mapGarnish),

    steps: value.steps.map((step) => step.trim()),
  };
}

export function hasAlcoholicIngredient(
  ingredients: readonly IngredientFormValue[],
  ingredientName: string,
): boolean {
  const expectedSlug = toSlug(ingredientName);

  if (!expectedSlug) {
    return false;
  }

  return ingredients.some((ingredient) => {
    const abv = ingredient.ingredientDefaultAbv;

    if (typeof abv !== 'number' || abv <= 0) {
      return false;
    }

    return toSlug(ingredient.ingredientName) === expectedSlug;
  });
}

export function getAlcoholicIngredientOptions(
  ingredients: readonly IngredientFormValue[],
): string[] {
  return [
    ...new Set(
      ingredients
        .filter((ingredient) => {
          const abv = ingredient.ingredientDefaultAbv;

          return typeof abv === 'number' && abv > 0;
        })
        .map((ingredient) => ingredient.ingredientName.trim())
        .filter((name) => name.length > 0),
    ),
  ];
}

function mapIngredient(
  ingredient: IngredientFormValue,
  selectedIngredient: IngredientSuggestion | undefined,
): CreateCocktailIngredientRequest {
  const measurement = normalizeIngredientMeasurement(ingredient.amount, ingredient.unit);

  const currentName = ingredient.ingredientName.trim();

  const currentAbv = ingredient.ingredientDefaultAbv;

  const stillUsesSelectedIngredient =
    selectedIngredient !== undefined && toSlug(currentName) === selectedIngredient.slug;

  const abvOverride =
    stillUsesSelectedIngredient &&
    currentAbv !== null &&
    currentAbv !== selectedIngredient.defaultAbv
      ? currentAbv
      : undefined;

  const catalogueAbv = stillUsesSelectedIngredient ? selectedIngredient.defaultAbv : currentAbv;

  return {
    ingredientName: currentName,
    ingredientDefaultAbv: catalogueAbv,
    amount: measurement.amount,
    unit: measurement.unit,
    specification: optionalText(ingredient.specification),
    abvOverride,
    notes: optionalText(ingredient.notes),
  };
}

function mapGarnish(garnish: GarnishFormValue): CreateCocktailGarnishRequest {
  const measurement = normalizeGarnishMeasurement(garnish.amount, garnish.unit);

  return {
    ingredientName: garnish.ingredientName.trim(),
    amount: measurement.amount,
    unit: measurement.unit,
    specification: optionalText(garnish.specification),
    usage: garnish.usage.trim(),
  };
}

function normalizeIngredientMeasurement(
  amount: number | null,
  unit: IngredientInputUnit,
): {
  amount: number | null;
  unit: MeasurementUnit;
} {
  if (unit === 'TOP_UP') {
    return {
      amount: null,
      unit: 'TOP_UP',
    };
  }

  if (unit === 'CL') {
    return {
      amount: amount === null ? null : roundMillilitres(amount * 10),
      unit: 'ML',
    };
  }

  return {
    amount,
    unit,
  };
}

function normalizeGarnishMeasurement(
  amount: number | null,
  unit: GarnishInputUnit,
): {
  amount: number | null;
  unit: MeasurementUnit | null;
} {
  if (unit === '') {
    return {
      amount: null,
      unit: null,
    };
  }

  if (unit === 'CL') {
    return {
      amount: amount === null ? null : roundMillilitres(amount * 10),
      unit: 'ML',
    };
  }

  return {
    amount,
    unit,
  };
}

function roundMillilitres(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function optionalText(value: string): string | undefined {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
}
