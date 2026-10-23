import { CocktailType, MeasurementUnit, RecipeMethod } from './cocktail.models';

export type RecipeAbvMode = 'INHERIT' | 'OVERRIDE' | 'UNKNOWN';
export interface ContentIngredient {
  ingredientName: string;
  ingredientDefaultAbv: number | null;
  amount: number | null;
  unit: MeasurementUnit;
  specification: string | null;
  abvMode: RecipeAbvMode;
  abvOverride: number | null;
  notes: string | null;
}
export interface ContentGarnish {
  ingredientName: string;
  amount: number | null;
  unit: MeasurementUnit | null;
  specification: string | null;
  usage: string;
}
export interface CocktailContent {
  name: string;
  type: CocktailType;
  family: string | null;
  method: RecipeMethod;
  glass: string;
  ice: string | null;
  notes: string | null;
  mainAlcoholName: string | null;
  ingredients: ContentIngredient[];
  garnishes: ContentGarnish[];
  steps: string[];
}
export interface CocktailContentSnapshot {
  id: string;
  slug: string;
  contentVersion: number;
  organizationVersion: number;
  content: CocktailContent;
}
export interface ReplaceCocktailContentRequest extends CocktailContent {
  expectedContentVersion: number;
}
