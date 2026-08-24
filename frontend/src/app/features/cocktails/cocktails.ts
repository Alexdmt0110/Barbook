import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CocktailSummary, CocktailType, RecipeMethod } from './data-access/cocktail.models';
import { CocktailsService } from './data-access/cocktails.service';

@Component({
  selector: 'app-cocktails',
  imports: [RouterLink],
  templateUrl: './cocktails.html',
  styleUrl: './cocktails.css',
})
export class Cocktails implements OnInit {
  private readonly cocktailsService = inject(CocktailsService);

  readonly cocktails = signal<CocktailSummary[]>([]);

  readonly isLoading = signal(true);

  readonly errorMessage = signal<string | null>(null);

  readonly loadingPlaceholders = [0, 1, 2];

  ngOnInit(): void {
    this.loadCocktails();
  }

  loadCocktails(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.cocktailsService
      .getPersonalCocktails()
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (cocktails) => {
          this.cocktails.set(cocktails);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  typeLabel(type: CocktailType): string {
    const labels: Record<CocktailType, string> = {
      CLASSIC: 'Classique',
      PERSONAL_CREATION: 'Création',
      VARIATION: 'Variation',
    };

    return labels[type];
  }

  methodLabel(method: RecipeMethod): string {
    const labels: Record<RecipeMethod, string> = {
      SHAKER: 'Shaker',
      MIXING_GLASS: 'Verre à mélange',
      BUILD: 'Direct au verre',
      BLENDER: 'Blender',
    };

    return labels[method];
  }

  cocktailCountLabel(): string {
    const count = this.cocktails().length;

    return `${count} cocktail${count > 1 ? 's' : ''}`;
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Une erreur inattendue est survenue.';
    }

    if (error.status === 0) {
      return 'Impossible de joindre Barbook. Vérifie que le serveur est disponible.';
    }

    if (error.status === 401) {
      return 'Ta session n’est plus valide. Reconnecte-toi pour continuer.';
    }

    return 'Impossible de charger tes cocktails pour le moment.';
  }
}
