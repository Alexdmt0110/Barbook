import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FilterDropdown } from '../../components/filter-dropdown/filter-dropdown';
import { Recipe } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';

type FilterKey = 'type' | 'alcohol' | 'method' | 'tag';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FilterDropdown],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly recipeService = inject(RecipeService);

  recipes = this.recipeService.getAll();

  searchTerm = '';
  selectedType = 'all';
  selectedAlcohol = 'all';
  selectedMethod = 'all';
  selectedTag = 'all';

  openFilter: FilterKey | null = null;

  get filteredRecipes(): Recipe[] {
    const search = this.normalize(this.searchTerm);

    return this.recipes.filter((recipe) => {
      const matchesSearch = !search || this.recipeMatchesSearch(recipe, search);

      const matchesType = this.selectedType === 'all' || recipe.type === this.selectedType;

      const matchesAlcohol =
        this.selectedAlcohol === 'all' || recipe.mainAlcohol === this.selectedAlcohol;

      const matchesMethod = this.selectedMethod === 'all' || recipe.method === this.selectedMethod;

      const matchesTag = this.selectedTag === 'all' || recipe.tags.includes(this.selectedTag);

      return matchesSearch && matchesType && matchesAlcohol && matchesMethod && matchesTag;
    });
  }

  get types(): string[] {
    return [...new Set(this.recipes.map((recipe) => recipe.type))].sort();
  }

  get alcohols(): string[] {
    return [...new Set(this.recipes.map((recipe) => recipe.mainAlcohol))].sort();
  }

  get methods(): string[] {
    return [...new Set(this.recipes.map((recipe) => recipe.method))].sort();
  }

  get tags(): string[] {
    return [...new Set(this.recipes.flatMap((recipe) => recipe.tags))].sort();
  }

  toggleFilter(filter: FilterKey): void {
    this.openFilter = this.openFilter === filter ? null : filter;
  }

  closeFilter(): void {
    this.openFilter = null;
  }

  setFilter(filter: FilterKey, value: string): void {
    if (filter === 'type') {
      this.selectedType = value;
    }

    if (filter === 'alcohol') {
      this.selectedAlcohol = value;
    }

    if (filter === 'method') {
      this.selectedMethod = value;
    }

    if (filter === 'tag') {
      this.selectedTag = value;
    }

    this.closeFilter();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedType = 'all';
    this.selectedAlcohol = 'all';
    this.selectedMethod = 'all';
    this.selectedTag = 'all';
    this.closeFilter();
  }

  private recipeMatchesSearch(recipe: Recipe, search: string): boolean {
    const content = [
      recipe.name,
      recipe.type,
      recipe.family,
      recipe.mainAlcohol,
      recipe.method,
      recipe.glass,
      recipe.ice,
      recipe.notes,
      ...recipe.tags,
      ...recipe.ingredients.map((ingredient) => ingredient.name),
      ...recipe.ingredients.map((ingredient) => ingredient.notes ?? ''),
      ...recipe.garnishIngredients.map((ingredient) => ingredient.name),
      ...recipe.garnishIngredients.map((ingredient) => ingredient.usage),
      ...recipe.preparation,
    ]
      .filter(Boolean)
      .join(' ');

    return this.normalize(content).includes(search);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
