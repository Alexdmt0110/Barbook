import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  CocktailDetail as CocktailDetailModel,
  CocktailType,
  MeasurementUnit,
  RecipeMethod,
} from '../data-access/cocktail.models';
import { CocktailsService } from '../data-access/cocktails.service';

@Component({
  selector: 'app-cocktail-detail',
  imports: [RouterLink],
  templateUrl: './cocktail-detail.html',
  styleUrl: './cocktail-detail.css',
})
export class CocktailDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);

  private readonly cocktailsService = inject(CocktailsService);

  private readonly numberFormatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  });

  readonly cocktail = signal<CocktailDetailModel | null>(null);

  readonly isLoading = signal(true);

  readonly errorMessage = signal<string | null>(null);

  readonly isNotFound = signal(false);

  ngOnInit(): void {
    this.loadCocktail();
  }

  loadCocktail(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug) {
      this.isLoading.set(false);
      this.isNotFound.set(true);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.isNotFound.set(false);
    this.cocktail.set(null);

    this.cocktailsService
      .getPersonalCocktail(slug)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (cocktail) => {
          this.cocktail.set(cocktail);
        },
        error: (error: unknown) => {
          this.resolveError(error);
        },
      });
  }

  typeLabel(type: CocktailType): string {
    const labels: Record<CocktailType, string> = {
      CLASSIC: 'Classique',
      PERSONAL_CREATION: 'Création personnelle',
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

  formatMeasurement(amount: number | null, unit: MeasurementUnit | null): string {
    if (unit === 'TOP_UP') {
      return 'Compléter';
    }

    if (amount === null || unit === null) {
      return 'Selon besoin';
    }

    if (unit === 'ML') {
      return `${this.formatNumber(amount / 10)} cl`;
    }

    const amountLabel = this.formatNumber(amount);

    const unitLabels: Record<Exclude<MeasurementUnit, 'ML' | 'TOP_UP'>, string> = {
      G: 'g',
      PIECE: amount > 1 ? 'pièces' : 'pièce',
      LEAF: amount > 1 ? 'feuilles' : 'feuille',
      SPRIG: amount > 1 ? 'brins' : 'brin',
      DASH: amount > 1 ? 'traits' : 'trait',
      DROP: amount > 1 ? 'gouttes' : 'goutte',
      BAR_SPOON: amount > 1 ? 'cuillères de bar' : 'cuillère de bar',
      TEASPOON: 'c. à c.',
      TABLESPOON: 'c. à s.',
      SCOOP: amount > 1 ? 'boules' : 'boule',
      PINCH: amount > 1 ? 'pincées' : 'pincée',
    };

    return `${amountLabel} ${unitLabels[unit]}`;
  }

  estimatedAbvLabel(estimatedAbv: number | null): string {
    if (estimatedAbv === null) {
      return 'Non estimé';
    }

    return `~${this.formatNumber(estimatedAbv)} % vol.`;
  }

  private formatNumber(value: number): string {
    return this.numberFormatter.format(value);
  }

  private resolveError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorMessage.set('Une erreur inattendue est survenue.');

      return;
    }

    if (error.status === 404) {
      this.isNotFound.set(true);
      return;
    }

    if (error.status === 0) {
      this.errorMessage.set(
        'Impossible de joindre Barbook. Vérifie que le serveur est disponible.',
      );

      return;
    }

    if (error.status === 401) {
      this.errorMessage.set('Ta session n’est plus valide. Reconnecte-toi pour continuer.');

      return;
    }

    this.errorMessage.set('Impossible de charger cette recette pour le moment.');
  }
}
