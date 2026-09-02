import {
  CocktailType,
  MeasurementUnit,
  RecipeMethod,
} from '../generated/prisma/client';

export interface CocktailSummaryIngredient {
  id: string;
  name: string;
}

export interface CocktailSummaryFolder {
  id: string;
  name: string;
}

export interface CocktailSummaryTag {
  id: string;
  name: string;
  slug: string;
}

export interface CocktailSummary {
  id: string;
  slug: string;
  name: string;
  type: CocktailType;
  family: string | null;
  method: RecipeMethod;
  glass: string;
  imageUrl: string | null;
  mainAlcohol: CocktailSummaryIngredient | null;
  folder: CocktailSummaryFolder | null;
  tags: CocktailSummaryTag[];
  updatedAt: Date;
}

export interface CocktailDetailIngredientReference {
  id: string;
  name: string;
  slug: string;
}

export interface CocktailDetailIngredient {
  id: string;
  ingredient: CocktailDetailIngredientReference;
  amount: number | null;
  unit: MeasurementUnit;
  specification: string | null;
  abv: number | null;
  notes: string | null;
}

export interface CocktailDetailGarnish {
  id: string;
  ingredient: CocktailDetailIngredientReference;
  amount: number | null;
  unit: MeasurementUnit | null;
  specification: string | null;
  usage: string;
}

export interface CocktailDetailStep {
  id: string;
  content: string;
}

export interface CocktailDetail extends CocktailSummary {
  ice: string | null;
  notes: string | null;
  ingredients: CocktailDetailIngredient[];
  garnishes: CocktailDetailGarnish[];
  steps: CocktailDetailStep[];
  estimatedAbv: number | null;
}

export interface CreateCocktailResult {
  id: string;
  slug: string;
}
