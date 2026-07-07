import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecipeDetailCard } from '../../components/recipe-detail-card/recipe-detail-card';
import { Recipe } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';

@Component({
  selector: 'app-cocktail-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RecipeDetailCard],
  templateUrl: './cocktail-detail.html',
  styleUrl: './cocktail-detail.css',
})
export class CocktailDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly recipeService = inject(RecipeService);

  recipe: Recipe | undefined = this.recipeService.getBySlug(
    this.route.snapshot.paramMap.get('slug') ?? '',
  );
}
