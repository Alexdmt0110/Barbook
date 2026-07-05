import { Injectable } from '@angular/core';
import { RECIPES } from '../data/recipes.data';
import { Recipe } from '../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  getAll(): Recipe[] {
    return RECIPES;
  }

  getBySlug(slug: string): Recipe | undefined {
    return RECIPES.find((recipe) => recipe.slug === slug);
  }
}
