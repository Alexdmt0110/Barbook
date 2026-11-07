import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import { DraftStore } from '../../../core/drafts/draft-store.service';
import { WorkspaceContext } from '../../../core/workspaces/workspace-context';
import { toSlug } from '../../../shared/utils/slug';
import {
  RecipeNameAvailabilityService,
  RecipeNameStatus,
} from './recipe-name-availability.service';

type State = RecipeNameStatus | 'IDLE' | 'CHECKING' | 'UNKNOWN';

/** Advisory only: never changes form validity, saves a draft, or submits a command. */
@Component({
  selector: 'app-recipe-name-availability',
  template: `<p
    [id]="messageId()"
    class="availability"
    [class.conflict]="hasConflict()"
    role="status"
    aria-live="polite"
  >
    @if (hasConflict()) {
      <span aria-hidden="true">⚠ </span>
    }
    {{ message() }}
  </p>`,
  styles: `
    :host {
      display: block;
    }
    .availability {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .conflict {
      color: var(--color-danger);
      font-weight: 600;
    }
  `,
})
export class RecipeNameAvailability {
  readonly nameControl = input.required<FormControl<string>>();
  // Signal bridge also sees explicit restores/server resets made with emitEvent:false.
  readonly value = input.required<string>();
  private generation = 0;
  private renderedControl: FormControl<string> | null = null;
  readonly cocktailId = input<string | undefined>();
  readonly messageId = input.required<string>();
  private readonly api = inject(RecipeNameAvailabilityService);
  private readonly workspace = inject(WorkspaceContext);
  private readonly drafts = inject(DraftStore);
  readonly state = signal<State>('IDLE');
  readonly hasConflict = computed(() => ['NAME_TAKEN', 'SLUG_RESERVED'].includes(this.state()));
  readonly message = computed(() => {
    switch (this.state()) {
      case 'CHECKING':
        return 'Vérification du nom…';
      case 'AVAILABLE':
        return 'Ce nom est disponible pour le moment. Le serveur le revérifiera à l’enregistrement.';
      case 'NAME_TAKEN':
        return 'Ce nom est déjà utilisé dans cet espace. Une recette en corbeille le réserve aussi après les 30 jours de restauration.';
      case 'SLUG_RESERVED':
        return 'L’adresse associée à ce nom est réservée par une recette existante ou en corbeille, même après son délai de restauration. Choisis un autre nom.';
      case 'UNKNOWN':
        return 'Disponibilité impossible à vérifier. Tu peux tenter l’enregistrement ; le serveur contrôlera le nom.';
      default:
        return '';
    }
  });
  constructor() {
    effect((onCleanup) => {
      const control = this.nameControl();
      this.renderedControl = control;
      const context = this.workspace.current();
      const cocktailId = this.cocktailId();
      const lease = this.drafts.lease();
      this.state.set('IDLE');
      if (!context || !lease) return;
      const raw = this.value();
      const generation = ++this.generation;
      if (control.invalid || !toSlug(raw)) return;
      this.state.set('CHECKING');
      const sub = timer(400)
        .pipe(
          switchMap(() => this.api.check(raw.trim(), cocktailId)),
          map((result) =>
            result.canonicalName === toSlug(raw) &&
            ['AVAILABLE', 'NAME_TAKEN', 'SLUG_RESERVED'].includes(result.status)
              ? result.status
              : ('UNKNOWN' as State),
          ),
          catchError(() => of('UNKNOWN' as State)),
        )
        .subscribe((state) => {
          if (
            generation !== this.generation ||
            raw !== control.value ||
            context !== this.workspace.current() ||
            cocktailId !== this.cocktailId() ||
            !this.drafts.valid(lease)
          )
            return;
          this.state.set(state);
        });
      onCleanup(() => sub.unsubscribe());
    });
  }
  identifiedConflict(error: unknown, submittedName: string): void {
    if (
      !this.renderedControl ||
      submittedName !== this.renderedControl.value ||
      !this.drafts.lease() ||
      !this.workspace.current()
    )
      return;
    if (!(error instanceof HttpErrorResponse) || error.status !== 409) return;
    if (error.error?.code === 'COCKTAIL_NAME_TAKEN') {
      this.generation++;
      this.state.set('NAME_TAKEN');
    }
    if (error.error?.code === 'COCKTAIL_SLUG_RESERVED') {
      this.generation++;
      this.state.set('SLUG_RESERVED');
    }
  }
}
