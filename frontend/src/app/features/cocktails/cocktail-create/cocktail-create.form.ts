import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { toSlug } from '../../../shared/utils/slug';
import { CocktailType, MeasurementUnit, RecipeMethod } from '../data-access/cocktail.models';

export const MAX_RECIPE_INGREDIENTS = 50;
export const MAX_GARNISHES = 20;
export const MAX_PREPARATION_STEPS = 30;

export const MAX_STORED_AMOUNT = 99_999.999;

export type IngredientInputUnit = MeasurementUnit | 'CL';

export type GarnishInputUnit = '' | Exclude<IngredientInputUnit, 'TOP_UP'>;

export interface IngredientFormValue {
  ingredientName: string;
  ingredientDefaultAbv: number | null;
  amount: number | null;
  unit: IngredientInputUnit;
  specification: string;
  notes: string;
}

export interface GarnishFormValue {
  ingredientName: string;
  amount: number | null;
  unit: GarnishInputUnit;
  specification: string;
  usage: string;
}

export interface CocktailCreateFormValue {
  name: string;
  type: CocktailType;
  family: string;
  method: RecipeMethod;
  glass: string;
  ice: string;
  mainAlcoholName: string;
  notes: string;
  ingredients: IngredientFormValue[];
  garnishes: GarnishFormValue[];
  steps: string[];
}

export type IngredientFormGroup = FormGroup<{
  ingredientName: FormControl<string>;

  ingredientDefaultAbv: FormControl<number | null>;

  amount: FormControl<number | null>;

  unit: FormControl<IngredientInputUnit>;

  specification: FormControl<string>;

  notes: FormControl<string>;
}>;

export type GarnishFormGroup = FormGroup<{
  ingredientName: FormControl<string>;

  amount: FormControl<number | null>;

  unit: FormControl<GarnishInputUnit>;

  specification: FormControl<string>;

  usage: FormControl<string>;
}>;

export type StepFormControl = FormControl<string>;

/**
 * Refuse les chaînes vides une fois
 * les espaces périphériques retirés.
 */
export function trimmedRequiredValidator(minimumLength = 1): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (typeof value !== 'string') {
      return {
        trimmedRequired: true,
      };
    }

    return value.trim().length >= minimumLength
      ? null
      : {
          trimmedRequired: true,
        };
  };
}

/**
 * Refuse plusieurs lignes représentant
 * le même ingrédient canonique.
 */
export function uniqueCanonicalIngredientsValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = control.value as unknown;

  if (!Array.isArray(value)) {
    return null;
  }

  const ingredientSlugs = new Set<string>();

  for (const candidate of value) {
    if (typeof candidate !== 'object' || candidate === null) {
      continue;
    }

    const ingredientName = (candidate as Partial<IngredientFormValue>).ingredientName;

    if (typeof ingredientName !== 'string') {
      continue;
    }

    const ingredientSlug = toSlug(ingredientName);

    if (!ingredientSlug) {
      continue;
    }

    if (ingredientSlugs.has(ingredientSlug)) {
      return {
        duplicateCanonicalIngredient: true,
      };
    }

    ingredientSlugs.add(ingredientSlug);
  }

  return null;
}

/**
 * Vérifie la cohérence quantité/unité
 * d'un ingrédient de recette.
 */
export function ingredientMeasurementValidator(control: AbstractControl): ValidationErrors | null {
  const unit = control.get('unit')?.value;

  const amount = control.get('amount')?.value;

  if (unit === 'TOP_UP') {
    return amount === null || amount === undefined
      ? null
      : {
          topUpAmount: true,
        };
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return {
      amountRequired: true,
    };
  }

  const normalizedAmount = unit === 'CL' ? amount * 10 : amount;

  if (normalizedAmount > MAX_STORED_AMOUNT) {
    return {
      amountMax: true,
    };
  }

  return null;
}

/**
 * Vérifie la cohérence quantité/unité
 * d'une garniture.
 */
export function garnishMeasurementValidator(control: AbstractControl): ValidationErrors | null {
  const unit = control.get('unit')?.value;

  const amount = control.get('amount')?.value;

  const hasUnit = typeof unit === 'string' && unit.length > 0;

  const hasAmount = typeof amount === 'number';

  if (hasUnit !== hasAmount) {
    return {
      amountUnitPair: true,
    };
  }

  if (!hasAmount) {
    return null;
  }

  const normalizedAmount = unit === 'CL' ? amount * 10 : amount;

  return normalizedAmount <= MAX_STORED_AMOUNT
    ? null
    : {
        amountMax: true,
      };
}
