import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Recipe } from '../../models/recipe.model';
import { formatRecipeAbvLabel } from '../../utils/recipe-abv.util';

@Component({
  selector: 'app-recipe-detail-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-detail-card.html',
  styleUrl: './recipe-detail-card.css',
})
export class RecipeDetailCard {
  @Input({ required: true }) recipe!: Recipe;
  @Input() sticky = false;

  get abvLabel(): string {
    return formatRecipeAbvLabel(this.recipe);
  }
}
