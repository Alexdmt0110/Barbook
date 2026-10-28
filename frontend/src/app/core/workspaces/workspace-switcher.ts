import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { WorkspaceContext } from './workspace-context';

interface BarReference {
  id: string;
  name: string;
  kind: 'SHARED';
  accessVersion: number;
}
interface BarPage {
  items: BarReference[];
  total: number;
  page: number;
  pageSize: number;
}

@Component({
  selector: 'app-workspace-switcher',
  template: `
    @if (auth.snapshot()) {
      <section aria-labelledby="workspace-heading">
        <h3 id="workspace-heading">Mes espaces</h3>
        <p>
          Le carnet Personnel reste privé. Choisis explicitement le carnet que tu souhaites ouvrir.
        </p>
        @if (auth.snapshot(); as session) {
          <button
            type="button"
            class="bb-button"
            [attr.aria-pressed]="workspace.current()?.kind === 'PERSONAL'"
            [disabled]="workspace.transitioning() || workspace.pendingCommands() > 0"
            (click)="select(session.workspaceId)"
          >
            Personnel · privé
          </button>
        }
        @if (loading()) {
          <p role="status">Chargement des Bars…</p>
        }
        <ul aria-label="Bars dont tu es membre">
          @for (bar of bars(); track bar.id) {
            <li>
              <button
                type="button"
                class="bb-button"
                [attr.aria-pressed]="workspace.current()?.id === bar.id"
                [disabled]="workspace.transitioning() || workspace.pendingCommands() > 0"
                (click)="select(bar.id)"
              >
                {{ bar.name }}
              </button>
            </li>
          }
        </ul>
        @if (!loading() && total() === 0 && !error()) {
          <p>Tu n’appartiens encore à aucun Bar.</p>
        }
        @if (bars().length < total()) {
          <button
            type="button"
            class="bb-button bb-button--ghost"
            [disabled]="loading()"
            (click)="load(false)"
          >
            Voir les autres Bars
          </button>
        }
        @if (error()) {
          <p role="alert">{{ error() }}</p>
          <button
            type="button"
            class="bb-button bb-button--ghost"
            [disabled]="loading()"
            (click)="load(true)"
          >
            Actualiser la liste
          </button>
        }
        @if (workspace.memoryOnly()) {
          <p role="status">
            La sélection reste seulement en mémoire. Elle peut être perdue à l’actualisation.
          </p>
        }
        @if (workspace.transitioning()) {
          <p role="status">Vérification et ouverture de l’espace…</p>
        }
      </section>
    }
  `,
  styles: `
    section {
      margin-block: var(--space-6);
      padding-block: var(--space-4);
      border-block: 1px solid var(--color-border);
    }
    h3 {
      margin-top: 0;
    }
    ul {
      list-style: none;
      padding: 0;
      display: grid;
      gap: var(--space-2);
    }
    li,
    button {
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    [aria-pressed='true'] {
      border-color: var(--color-accent);
      background: var(--color-accent-soft);
    }
  `,
})
export class WorkspaceSwitcher {
  readonly opened = input(false);
  readonly auth = inject(AuthService);
  readonly workspace = inject(WorkspaceContext);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly bars = signal<BarReference[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly error = signal<string | null>(null);
  private page = 0;
  private requestGeneration = 0;
  constructor() {
    effect(() => {
      const session = this.auth.snapshot();
      if (!session) {
        this.requestGeneration++;
        this.bars.set([]);
        this.total.set(0);
        this.loading.set(false);
        this.error.set(null);
      } else if (this.opened()) this.load(true);
    });
  }
  load(reset: boolean): void {
    if (!this.auth.isAuthenticated() || this.workspace.transitioning()) return;
    const auth = this.auth.snapshot();
    const generation = ++this.requestGeneration;
    const page = reset ? 1 : this.page + 1;
    if (reset) {
      this.bars.set([]);
      this.total.set(0);
    }
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<BarPage>('/api/workspaces', { params: { kind: 'SHARED', page, pageSize: 25 } })
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generation === this.requestGeneration) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          if (generation !== this.requestGeneration || auth !== this.auth.snapshot()) return;
          this.page = page;
          const combined = reset ? result.items : [...this.bars(), ...result.items];
          this.bars.set([...new Map(combined.map((bar) => [bar.id, bar])).values()]);
          this.total.set(result.total);
        },
        error: () => {
          if (generation === this.requestGeneration)
            this.error.set(
              'La liste des Bars n’est pas disponible. Aucun espace vide n’est supposé.',
            );
        },
      });
  }
  select(id: string): void {
    this.error.set(null);
    this.workspace
      .select(id, async () => {
        const left = this.router.url === '/' || (await this.router.navigateByUrl('/'));
        return left && (await this.router.navigateByUrl('/cocktails'));
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        error: (error) =>
          this.error.set(
            error instanceof Error
              ? error.message
              : 'Cet espace n’est pas accessible. La sélection précédente est conservée.',
          ),
      });
  }
}
