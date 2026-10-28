import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { WorkspaceContext } from './workspace-context';
import { BarAccent, barAccents, barAccentNames, accentTokens } from './bar-accent';
interface CreatedBar {
  id: string;
  name: string;
}
interface Intent {
  creationRequestId: string;
  name: string;
  accentKey: BarAccent;
}

@Component({
  selector: 'app-bar-create',
  imports: [FormsModule],
  template: `
    @if (!editing()) {
      <button
        type="button"
        class="bb-button"
        [disabled]="workspace.pendingCommands() > 0 || workspace.transitioning()"
        (click)="start()"
      >
        {{ first() ? 'Créer mon premier bar' : 'Créer un bar' }}
      </button>
    } @else {
      <section aria-label="Créer un Bar">
        <h4>Créer un Bar</h4>
        <p>
          Tu seras propriétaire (OWNER) de ce nouvel espace partagé. Ton carnet Personnel reste
          privé. La création ne change pas l’espace ouvert.
        </p>
        @if (!result()) {
          <form (ngSubmit)="create()">
            <label for="bar-name">Nom du bar</label>
            <input
              id="bar-name"
              name="barName"
              maxlength="80"
              required
              [(ngModel)]="name"
              [disabled]="busy() || uncertain()"
            />
            <fieldset [disabled]="busy() || uncertain()">
              <legend>Couleur initiale</legend>
              @for (key of accents; track key) {
                <label class="palette-option"
                  ><input type="radio" name="barAccent" [value]="key" [(ngModel)]="accent" /><span
                    class="swatch"
                    aria-hidden="true"
                    [style.background-color]="preview(key)"
                  ></span
                  >{{ names[key] }}</label
                >
              }
            </fieldset>
            <p>
              Avant de confirmer, vérifie la liste des Bars ci-dessus, notamment après une
              actualisation ou une réponse perdue. Ce formulaire reste seulement en mémoire ; il ne
              sera pas restauré après rechargement.
            </p>
            <label class="confirmation"
              ><input
                type="checkbox"
                name="barConfirmation"
                [(ngModel)]="confirmed"
                [disabled]="busy() || uncertain()"
              />J’ai vérifié mes Bars et je confirme la création d’un nouvel espace.</label
            >
            <button
              type="submit"
              class="bb-button"
              [disabled]="busy() || uncertain() || !confirmed || !name.trim()"
            >
              Confirmer la création du Bar
            </button>
          </form>
        }
        @if (busy()) {
          <p role="status">Vérification en cours…</p>
        }
        @if (message()) {
          <p role="status">{{ message() }}</p>
        }
        @if (uncertain()) {
          <p>
            Le Bar peut déjà exister. Aucun nouvel envoi automatique. Vérifie le résultat de cette
            intention avant toute autre création.
          </p>
          <button type="button" class="bb-button" [disabled]="busy()" (click)="inspect()">
            Vérifier cette création
          </button>
          @if (notFound()) {
            <p>
              Résultat introuvable pour le moment ; cela ne prouve pas que la demande initiale a
              échoué. Tu peux relancer explicitement la même intention, sans changer son nom ni sa
              couleur.
            </p>
            <button type="button" class="bb-button" [disabled]="busy()" (click)="retry()">
              Relancer la même intention
            </button>
          }
        }
        @if (result(); as bar) {
          <p>
            Bar confirmé : {{ bar.name }}. L’espace actuel est conservé jusqu’à son ouverture
            explicite.
          </p>
          <button
            type="button"
            class="bb-button"
            [disabled]="workspace.pendingCommands() > 0 || workspace.transitioning()"
            (click)="open.emit(bar.id)"
          >
            Ouvrir le Bar créé
          </button>
        }
        @if (!busy() && !uncertain()) {
          <button type="button" class="bb-button bb-button--ghost" (click)="cancel()">
            {{ result() ? 'Fermer la création' : 'Annuler la création' }}
          </button>
        }
      </section>
    }
  `,
  styles: `
    section {
      margin-block: var(--space-4);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
    }
    h4 {
      margin-top: 0;
    }
    form {
      display: grid;
      gap: var(--space-3);
    }
    input:not([type='radio']):not([type='checkbox']) {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      min-height: 44px;
      padding: var(--space-2);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-control);
      background: var(--color-surface-solid);
      color: var(--color-text);
      font: inherit;
    }
    fieldset {
      min-width: 0;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .swatch {
      display: inline-block;
      flex: 0 0 1rem;
      height: 1rem;
      border: 1px solid currentColor;
      border-radius: 50%;
    }
    .palette-option,
    .confirmation {
      display: flex;
      align-items: center;
      min-height: 44px;
      cursor: pointer;
      gap: var(--space-2);
    }
    button {
      margin-block: var(--space-2);
      max-width: 100%;
      white-space: normal;
    }
  `,
})
export class BarCreate {
  readonly first = input(false);
  readonly created = output<void>();
  readonly open = output<string>();
  readonly workspace = inject(WorkspaceContext);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  readonly accents = barAccents;
  readonly names = barAccentNames;
  readonly editing = signal(false);
  readonly busy = signal(false);
  readonly uncertain = signal(false);
  readonly notFound = signal(false);
  readonly message = signal<string | null>(null);
  readonly result = signal<CreatedBar | null>(null);
  name = '';
  accent: BarAccent = 'AMBER';
  confirmed = false;
  private intent: Intent | null = null;
  private generation = 0;
  private actor: string | undefined;
  constructor() {
    effect(() => {
      const userId = this.auth.snapshot()?.user.id;
      if (userId !== this.actor) {
        this.actor = userId;
        this.clear();
      }
    });
  }
  preview(key: BarAccent): string {
    return accentTokens(key, 'dark')!.color;
  }
  start(): void {
    this.editing.set(true);
  }
  cancel(): void {
    if (!this.busy() && !this.uncertain()) this.clear();
  }
  private clear(): void {
    this.generation++;
    this.intent = null;
    this.name = '';
    this.accent = 'AMBER';
    this.confirmed = false;
    this.editing.set(false);
    this.busy.set(false);
    this.uncertain.set(false);
    this.notFound.set(false);
    this.message.set(null);
    this.result.set(null);
  }
  create(): void {
    if (
      !this.actor ||
      this.busy() ||
      this.uncertain() ||
      this.result() ||
      !this.confirmed ||
      !this.name.trim() ||
      this.name.trim().length > 80
    )
      return;
    // Generated once per explicit intention, never regenerated for a lost response.
    try {
      this.intent = {
        creationRequestId: crypto.randomUUID(),
        name: this.name.trim(),
        accentKey: this.accent,
      };
    } catch {
      this.message.set(
        'La création sécurisée n’est pas disponible dans ce navigateur. Aucun envoi effectué.',
      );
      return;
    }
    this.send();
  }
  retry(): void {
    if (this.uncertain() && this.notFound() && !this.busy()) this.send();
  }
  inspect(): void {
    if (!this.intent || this.busy() || !this.actor) return;
    const generation = this.generation;
    const actor = this.actor;
    this.busy.set(true);
    this.notFound.set(false);
    this.message.set(null);
    this.http
      .get<CreatedBar>(`/api/workspaces/creation-intents/${this.intent.creationRequestId}`)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generation === this.generation) this.busy.set(false);
        }),
      )
      .subscribe({
        next: (bar) => {
          if (this.valid(generation, actor)) this.succeeded(bar);
        },
        error: (error) => {
          if (!this.valid(generation, actor)) return;
          this.notFound.set(error instanceof HttpErrorResponse && error.status === 404);
          this.message.set('Le résultat n’a pas pu être confirmé. La création reste incertaine.');
        },
      });
  }
  private valid(generation: number, actor: string): boolean {
    return generation === this.generation && actor === this.auth.snapshot()?.user.id;
  }
  private succeeded(bar: CreatedBar): void {
    this.result.set(bar);
    this.uncertain.set(false);
    this.notFound.set(false);
    this.message.set(null);
    this.created.emit();
  }
  private send(): void {
    if (!this.intent || !this.actor) return;
    const generation = this.generation;
    const actor = this.actor;
    this.busy.set(true);
    this.notFound.set(false);
    this.message.set(null);
    this.http
      .post<CreatedBar>('/api/workspaces', this.intent)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generation === this.generation) this.busy.set(false);
        }),
      )
      .subscribe({
        next: (bar) => {
          if (this.valid(generation, actor)) this.succeeded(bar);
        },
        error: () => {
          if (!this.valid(generation, actor)) return;
          // Even a rejected/delayed client response must not silently mint another creation key.
          this.uncertain.set(true);
          this.message.set(
            'La réponse ne confirme pas la création. Ton espace actuel est conservé.',
          );
        },
      });
  }
}
