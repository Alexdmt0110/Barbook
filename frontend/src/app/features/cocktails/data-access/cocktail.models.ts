export type CocktailType = 'CLASSIC' | 'PERSONAL_CREATION' | 'VARIATION';

export type RecipeMethod = 'SHAKER' | 'MIXING_GLASS' | 'BUILD' | 'BLENDER';

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
  updatedAt: string;
}
