import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { WorkspaceContext } from './workspace-context';
interface Member {
  userId: string;
  role: 'OWNER' | 'MEMBER';
  user: { displayName: string; email: string };
}
interface MemberPage {
  items: Member[];
  total: number;
  accessVersion: number;
}

@Component({
  selector: 'app-workspace-members',
  imports: [ReactiveFormsModule],
  template: `
    @if (workspace.current()?.kind === 'SHARED' && workspace.current()?.role === 'OWNER') {
      <section aria-label="Gestion des membres du Bar">
        <button
          class="bb-button bb-button--ghost"
          type="button"
          [attr.aria-expanded]="opened()"
          [disabled]="pending() || workspace.transitioning()"
          (click)="open()"
        >
          Gérer les membres
        </button>
        @if (opened()) {
          <h4>Membres du Bar</h4>
          <p>
            Ajoute uniquement une personne disposant déjà d’un compte. Un membre peut consulter,
            créer et modifier les recettes du Bar.
          </p>
          <ul>
            @for (member of members(); track member.userId) {
              <li>
                <span
                  >{{ member.user.displayName }} · {{ member.user.email }} · {{ member.role }}</span
                >
                @if (member.role === 'MEMBER') {
                  <button
                    type="button"
                    class="bb-button bb-button--danger"
                    [attr.aria-label]="'Retirer ' + member.user.email"
                    [disabled]="pending() || uncertain() || version() === null"
                    (click)="revoke(member)"
                  >
                    Retirer l’accès
                  </button>
                }
              </li>
            }
          </ul>
          @if (members().length < total()) {
            <button
              type="button"
              class="bb-button bb-button--ghost"
              [disabled]="pending()"
              (click)="load(false)"
            >
              Voir les autres membres
            </button>
          }
          <form (submit)="add($event)">
            <label for="bar-member-email">Email du membre existant</label>
            <input
              id="bar-member-email"
              type="email"
              [formControl]="email"
              autocomplete="off"
              [readonly]="pending()"
            />
            <button
              type="submit"
              class="bb-button"
              [disabled]="pending() || uncertain() || email.invalid || version() === null"
            >
              Ajouter le membre
            </button>
          </form>
          @if (error()) {
            <p role="alert">{{ error() }}</p>
          }
          @if (uncertain()) {
            <p role="alert">
              Le résultat de la dernière action est inconnu. Aucun renvoi automatique. Vérifie la
              liste et les droits avant de préparer une nouvelle action.
            </p>
            @if (inspected()) {
              <button
                class="bb-button"
                type="button"
                [disabled]="pending()"
                (click)="acknowledge()"
              >
                Liste vérifiée : préparer une nouvelle action
              </button>
            }
          }
          <button
            type="button"
            class="bb-button bb-button--ghost"
            [disabled]="pending()"
            (click)="refresh()"
          >
            Vérifier les membres et les droits
          </button>
          @if (pending()) {
            <p role="status">Vérification en cours…</p>
          }
        }
        @if (notice()) {
          <p role="status">{{ notice() }}</p>
        }
      </section>
    }
  `,
  styles: `
    section {
      margin-block: var(--space-4);
    }
    ul {
      list-style: none;
      padding: 0;
      display: grid;
      gap: var(--space-3);
    }
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    li span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    form {
      display: grid;
      gap: var(--space-2);
      margin-block: var(--space-4);
    }
    input {
      width: 100%;
      min-width: 0;
      min-height: 44px;
      padding: var(--space-2);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-control);
      background: var(--color-surface-solid);
      color: var(--color-text);
    }
  `,
})
export class WorkspaceMembers {
  readonly workspace = inject(WorkspaceContext);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  readonly opened = signal(false);
  readonly pending = signal(false);
  readonly uncertain = signal(false);
  readonly inspected = signal(false);
  readonly members = signal<Member[]>([]);
  readonly total = signal(0);
  readonly version = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email, Validators.maxLength(254)],
  });
  private page = 0;
  private ownerKey = '';
  constructor() {
    effect(() => {
      const auth = this.auth.snapshot();
      const space = this.workspace.current();
      if (!auth) {
        this.clear();
        this.ownerKey = '';
        return;
      }
      if (!space) return; // A membership refresh retains the unsent form and uncertain outcome.
      const key = `${auth.user.id}:${space.id}:${space.role}`;
      if (key !== this.ownerKey) {
        this.clear();
        this.ownerKey = key;
      }
    });
  }
  private clear(): void {
    this.opened.set(false);
    this.members.set([]);
    this.total.set(0);
    this.version.set(null);
    this.email.reset();
    this.error.set(null);
    this.notice.set(null);
    this.uncertain.set(false);
    this.inspected.set(false);
  }
  open(): void {
    this.opened.set(!this.opened());
    if (this.opened()) this.load(true);
  }
  load(reset: boolean): void {
    if (
      this.pending() ||
      this.workspace.current()?.kind !== 'SHARED' ||
      this.workspace.current()?.role !== 'OWNER'
    )
      return;
    const scope = this.workspace.current();
    const page = reset ? 1 : this.page + 1;
    this.pending.set(true);
    this.error.set(null);
    this.workspace
      .request('members', false, (url) =>
        this.http.get<MemberPage>(url, { params: { page, pageSize: 25 } }),
      )
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: (result) => {
          if (this.workspace.current() !== scope) return;
          if (!reset && this.version() !== result.accessVersion) {
            this.version.set(null);
            this.error.set(
              'Les membres ont changé pendant la pagination. Vérifie à nouveau les droits.',
            );
            return;
          }
          this.page = page;
          this.members.set(reset ? result.items : [...this.members(), ...result.items]);
          this.total.set(result.total);
          this.version.set(result.accessVersion);
          this.inspected.set(true);
        },
        error: () =>
          this.workspace.current() === scope &&
          this.error.set(
            'La liste des membres n’est pas confirmée. Aucune action ne sera envoyée automatiquement.',
          ),
      });
  }
  add(event: Event): void {
    event.preventDefault();
    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }
    this.command('members', { email: this.email.value.trim() });
  }
  revoke(member: Member): void {
    if (!window.confirm(`Retirer l’accès de ${member.user.email} à ce Bar ?`)) return;
    this.command(`members/${encodeURIComponent(member.userId)}/revoke`, {});
  }
  private command(resource: string, body: object): void {
    const version = this.version();
    const scope = this.workspace.current();
    if (
      this.pending() ||
      this.uncertain() ||
      version === null ||
      this.workspace.current()?.kind !== 'SHARED' ||
      this.workspace.current()?.role !== 'OWNER'
    )
      return;
    this.pending.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.inspected.set(false);
    this.workspace
      .request(
        resource,
        true,
        (url) => this.http.post(url, { ...body, expectedAccessVersion: version }),
        version,
      )
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: () => {
          if (this.workspace.current() !== scope) return;
          this.email.reset();
          this.notice.set(
            'Action confirmée. Actualise les membres et les droits avant une autre action.',
          );
          this.version.set(null);
        },
        error: (error: unknown) => {
          if (this.workspace.current() !== scope) return;
          if (error instanceof HttpErrorResponse && error.status === 409) this.version.set(null);
          const known =
            error instanceof HttpErrorResponse && [400, 401, 403, 404, 409].includes(error.status);
          this.uncertain.set(!known);
          this.error.set(
            known
              ? 'Action refusée. La saisie est conservée ; vérifie les droits et versions avant une nouvelle action.'
              : 'Réponse perdue ou indisponible. Le résultat doit être vérifié.',
          );
        },
      });
  }
  refresh(): void {
    if (this.pending()) return;
    const scope = this.workspace.current();
    this.pending.set(true);
    this.inspected.set(false);
    this.error.set(null);
    this.workspace
      .refreshAccess()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          this.pending.set(false);
          if (
            this.workspace.current()?.kind === 'SHARED' &&
            this.workspace.current()?.role === 'OWNER' &&
            this.workspace.current()?.id === scope?.id &&
            this.workspace.current()?.userId === scope?.userId
          ) {
            this.opened.set(true);
            this.load(true);
          }
        }),
      )
      .subscribe({
        error: () =>
          this.workspace.current()?.id === scope?.id &&
          this.error.set(
            'Les droits ne sont pas confirmés. Reconnecte-toi ou sélectionne un espace autorisé.',
          ),
      });
  }
  acknowledge(): void {
    if (!this.inspected() || this.pending()) return;
    this.uncertain.set(false);
    this.error.set(null);
  }
}
