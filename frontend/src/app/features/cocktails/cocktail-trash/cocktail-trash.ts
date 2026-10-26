import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { DraftStore } from '../../../core/drafts/draft-store.service';
import { CocktailLifecycleService, TrashPage } from '../data-access/cocktail-lifecycle.service';
import { LifecycleAction } from './lifecycle-action';

@Component({
  selector: 'app-cocktail-trash',
  imports: [RouterLink, LifecycleAction],
  styleUrl: '../../folders/folders.css',
  template: `<section class="folders-page">
    <a routerLink="/cocktails">Retour à mes cocktails</a>
    <h1>Corbeille</h1>
    <p>
      Récupération pendant 30 jours après la suppression. Après ce délai, la restauration est
      interdite ; cela ne signifie pas que les données ont été effacées.
    </p>
    @if (loading()) {
      <p role="status">Chargement de la corbeille…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    <button type="button" [disabled]="loading()" (click)="load()">Actualiser la corbeille</button>
    @if (result(); as data) {
      @if (!data.items.length) {
        <p>La corbeille est vide sur cette page.</p>
      }
      <div class="recipe-rows">
        @for (recipe of data.items; track recipe.id) {
          <article class="panel">
            <h2>{{ recipe.name }}</h2>
            <p>Supprimée le {{ date(recipe.deletedAt) }} UTC.</p>
            @if (recipe.canRestore) {
              <p>Récupérable avant le {{ date(recipe.restoreUntil) }} UTC.</p>
              <app-lifecycle-action [recipeId]="recipe.id" [restore]="true" />
            } @else {
              <p>Délai de récupération expiré.</p>
            }
          </article>
        }
      </div>
      <nav class="pagination" aria-label="Pages de la corbeille">
        <button type="button" [disabled]="loading() || page() === 1" (click)="load(page() - 1)">
          Page précédente
        </button>
        <span>Page {{ page() }} · {{ data.total }} recette(s)</span>
        <button
          type="button"
          [disabled]="loading() || page() * data.pageSize >= data.total"
          (click)="load(page() + 1)"
        >
          Page suivante
        </button>
      </nav>
    }
  </section>`,
})
export class CocktailTrash implements OnInit {
  private readonly api = inject(CocktailLifecycleService);
  private readonly store = inject(DraftStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lease = this.store.lease();
  private request?: Subscription;
  private generation = 0;
  readonly result = signal<TrashPage | null>(null);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  ngOnInit(): void {
    this.load();
  }
  load(page = this.page()): void {
    if (!this.store.valid(this.lease) || page < 1) return;
    this.request?.unsubscribe();
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.request = this.api
      .list(page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (generation !== this.generation || !this.store.valid(this.lease)) return;
          this.page.set(page);
          this.result.set(result);
          this.loading.set(false);
        },
        error: () => {
          if (generation !== this.generation || !this.store.valid(this.lease)) return;
          this.loading.set(false);
          this.error.set('Impossible de charger la corbeille. Vérifie ta connexion et ta session.');
        },
      });
  }
  date(value: string | null): string {
    return value ? new Date(value).toLocaleString('fr-FR', { timeZone: 'UTC' }) : '';
  }
}
