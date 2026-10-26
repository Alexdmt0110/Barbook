import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { DraftLease, DraftStore } from '../../../core/drafts/draft-store.service';
import {
  CocktailLifecycleService,
  RecipeLifecycle,
} from '../data-access/cocktail-lifecycle.service';

@Component({
  selector: 'app-lifecycle-action',
  imports: [RouterLink],
  styleUrl: '../../folders/folders.css',
  template: `
    @if (busy()) {
      <p role="status">Vérification en cours…</p>
    }
    @if (error()) {
      <p role="alert" class="feedback error">{{ error() }}</p>
    }
    @if (result(); as state) {
      <p role="status">
        {{
          state.deletedAt ? 'Recette placée en corbeille.' : 'Recette disponible dans ton carnet.'
        }}
      </p>
      @if (!state.deletedAt) {
        <a [routerLink]="['/cocktails', state.slug]">Ouvrir la recette</a>
      } @else {
        <a routerLink="/trash">Ouvrir la corbeille</a>
      }
    } @else if (prepared(); as state) {
      <section class="panel" aria-label="Confirmation de l’opération">
        <p>
          <strong>{{ state.name }}</strong>
        </p>
        @if (restore) {
          <p>
            Restaurer cette recette dans ton carnet ? Récupération possible avant le
            {{ date(state.restoreUntil) }} UTC.
          </p>
        } @else {
          <p>
            Mettre cette recette en corbeille ? Tu pourras la récupérer pendant 30 jours. Elle ne
            sera pas effacée physiquement.
          </p>
        }
        <div class="toolbar">
          <button type="button" class="primary" [disabled]="busy()" (click)="confirm()">
            {{ restore ? 'Confirmer la restauration' : 'Confirmer la mise en corbeille' }}
          </button>
          <button type="button" [disabled]="busy()" (click)="cancel()">Annuler</button>
        </div>
      </section>
    } @else {
      <button type="button" [disabled]="busy()" (click)="prepare()">
        {{
          error()
            ? 'Vérifier l’état actuel'
            : restore
              ? 'Restaurer'
              : 'Préparer la mise en corbeille'
        }}
      </button>
    }
  `,
})
export class LifecycleAction implements OnChanges {
  @Input({ required: true }) recipeId = '';
  @Input() restore = false;
  @Input() autoPrepare = false;
  @Output() changed = new EventEmitter<RecipeLifecycle>();
  private readonly api = inject(CocktailLifecycleService);
  private readonly store = inject(DraftStore);
  private readonly destroyRef = inject(DestroyRef);
  private lease: DraftLease | null = null;
  private generation = 0;
  private request?: Subscription;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly prepared = signal<RecipeLifecycle | null>(null);
  readonly result = signal<RecipeLifecycle | null>(null);

  ngOnChanges(): void {
    this.request?.unsubscribe();
    this.generation++;
    this.lease = this.store.lease();
    this.prepared.set(null);
    this.result.set(null);
    this.error.set(null);
    this.busy.set(false);
    if (this.autoPrepare) this.prepare();
  }
  private current(generation: number) {
    return generation === this.generation && this.store.valid(this.lease);
  }
  prepare(): void {
    if (this.busy() || !this.store.valid(this.lease)) return;
    const generation = ++this.generation;
    this.busy.set(true);
    this.prepared.set(null);
    this.result.set(null);
    this.error.set(null);
    this.request = this.api
      .get(this.recipeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          if (!this.current(generation) || state.id.toLowerCase() !== this.recipeId.toLowerCase())
            return;
          this.busy.set(false);
          if ((state.deletedAt === null) === this.restore) this.result.set(state);
          else if (this.restore && !state.canRestore)
            this.error.set(
              'Le délai de récupération est terminé. Cela ne signifie pas que les données ont été effacées.',
            );
          else this.prepared.set(state);
        },
        error: (error: unknown) => {
          if (this.current(generation)) {
            this.busy.set(false);
            this.error.set(this.message(error, false));
          }
        },
      });
  }
  cancel(): void {
    if (!this.busy()) {
      this.prepared.set(null);
      this.error.set(null);
    }
  }
  confirm(): void {
    const state = this.prepared();
    if (!state || this.busy() || !this.store.valid(this.lease)) return;
    const generation = ++this.generation;
    this.busy.set(true);
    this.error.set(null);
    this.request = this.api
      .change(state, this.restore)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          if (!this.current(generation)) return;
          this.busy.set(false);
          this.prepared.set(null);
          this.result.set(saved);
          this.changed.emit(saved);
        },
        error: (error: unknown) => {
          if (!this.current(generation)) return;
          this.busy.set(false);
          this.prepared.set(null);
          this.error.set(this.message(error, true));
        },
      });
  }
  date(value: string | null): string {
    return value ? new Date(value).toLocaleString('fr-FR', { timeZone: 'UTC' }) : '';
  }
  private message(error: unknown, mutation: boolean): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409)
        return 'La recette a changé ou le délai a expiré. Vérifie son état puis confirme une nouvelle intention.';
      if (error.status === 404) return 'Cette recette est indisponible dans ton carnet.';
      if (error.status === 401 || error.status === 403) return 'Reconnecte-toi avant de continuer.';
    }
    return mutation
      ? 'Résultat non confirmé : la modification a peut-être été enregistrée. Vérifie l’état actuel. Aucun renvoi automatique.'
      : 'Impossible de vérifier la recette. Réessaie lorsque la connexion est disponible.';
  }
}
