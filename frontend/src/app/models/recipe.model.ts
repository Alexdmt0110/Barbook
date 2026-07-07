export type RecipeType = 'Classique' | 'Création perso' | 'Variation';

export type RecipeMethod = 'Shaker' | 'Verre à mélange' | 'Direct au verre' | 'Blender' | 'Build';

export interface CocktailIngredient {
  name: string;
  quantity: string;
  volumeCl?: number;
  abv?: number;
  notes?: string;
}

export interface GarnishIngredient {
  name: string;
  quantity?: string;
  usage: string;
}

export interface Recipe {
  id: number;
  slug: string;
  name: string;
  imageUrl?: string;

  type: RecipeType;
  family?: string;
  mainAlcohol: string;
  method: RecipeMethod;

  glass: string;
  ice?: string;

  tags: string[];

  ingredients: CocktailIngredient[];
  garnishIngredients: GarnishIngredient[];

  preparation: string[];
  notes?: string;
}
