import { Recipe } from '../models/recipe.model';

export function calculateRecipeAbv(recipe: Recipe): number | null {
  const totalVolume = recipe.ingredients
    .filter((ingredient) => ingredient.volumeCl !== undefined)
    .reduce((total, ingredient) => total + Number(ingredient.volumeCl), 0);

  const pureAlcoholVolume = recipe.ingredients
    .filter((ingredient) => ingredient.volumeCl !== undefined && ingredient.abv !== undefined)
    .reduce(
      (total, ingredient) => total + Number(ingredient.volumeCl) * (Number(ingredient.abv) / 100),
      0,
    );

  if (totalVolume <= 0 || pureAlcoholVolume <= 0) {
    return null;
  }

  return (pureAlcoholVolume / totalVolume) * 100;
}

export function formatRecipeAbvLabel(recipe: Recipe): string {
  const abv = calculateRecipeAbv(recipe);

  if (abv === null) {
    return 'Non calculé';
  }

  return `${abv.toLocaleString('fr-FR', {
    maximumFractionDigits: 1,
  })} % vol. hors dilution`;
}
