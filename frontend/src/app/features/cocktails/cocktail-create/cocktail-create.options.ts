import { CocktailType, RecipeMethod } from '../data-access/cocktail.models';
import { GarnishInputUnit, IngredientInputUnit } from './cocktail-create.form';

export interface UnitOption<T extends string> {
  value: T;
  label: string;
}

export const COCKTAIL_TYPE_OPTIONS: readonly UnitOption<CocktailType>[] = [
  {
    value: 'CLASSIC',
    label: 'Classique',
  },
  {
    value: 'PERSONAL_CREATION',
    label: 'Création personnelle',
  },
  {
    value: 'VARIATION',
    label: 'Variation',
  },
];

export const RECIPE_METHOD_OPTIONS: readonly UnitOption<RecipeMethod>[] = [
  {
    value: 'SHAKER',
    label: 'Shaker',
  },
  {
    value: 'MIXING_GLASS',
    label: 'Verre à mélange',
  },
  {
    value: 'BUILD',
    label: 'Direct au verre',
  },
  {
    value: 'BLENDER',
    label: 'Blender',
  },
];

export const INGREDIENT_UNIT_OPTIONS: readonly UnitOption<IngredientInputUnit>[] = [
  {
    value: 'CL',
    label: 'cL',
  },
  {
    value: 'ML',
    label: 'mL',
  },
  {
    value: 'G',
    label: 'g',
  },
  {
    value: 'PIECE',
    label: 'pièce',
  },
  {
    value: 'LEAF',
    label: 'feuille',
  },
  {
    value: 'SPRIG',
    label: 'brin',
  },
  {
    value: 'DASH',
    label: 'dash',
  },
  {
    value: 'DROP',
    label: 'goutte',
  },
  {
    value: 'BAR_SPOON',
    label: 'cuillère de bar',
  },
  {
    value: 'TEASPOON',
    label: 'cuillère à café',
  },
  {
    value: 'TABLESPOON',
    label: 'cuillère à soupe',
  },
  {
    value: 'SCOOP',
    label: 'boule',
  },
  {
    value: 'PINCH',
    label: 'pincée',
  },
  {
    value: 'TOP_UP',
    label: 'compléter',
  },
];

export const GARNISH_UNIT_OPTIONS: readonly UnitOption<GarnishInputUnit>[] = [
  {
    value: '',
    label: 'Selon besoin',
  },
  ...INGREDIENT_UNIT_OPTIONS.filter(
    (option): option is UnitOption<Exclude<IngredientInputUnit, 'TOP_UP'>> =>
      option.value !== 'TOP_UP',
  ),
];
