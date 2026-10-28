import type { BarAccent } from './bar-accent';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  defer,
  finalize,
  from,
  map,
  of,
  switchMap,
  throwError,
  timeout,
} from 'rxjs';
import { AUTH_SNAPSHOT, AuthResponse } from '../auth/auth.models';
import { DraftStore } from '../drafts/draft-store.service';
import { BrowserStorageService } from '../storage/browser-storage.service';

export interface BusinessWorkspace {
  id: string;
  userId: string;
  name: string;
  kind: 'PERSONAL' | 'SHARED';
  role: 'OWNER' | 'MEMBER';
  accessVersion: number;
  accentKey?: BarAccent;
}
interface SharedContext {
  id: string;
  name: string;
  role: 'OWNER' | 'MEMBER';
  accessVersion: number;
  accentKey?: BarAccent;
}
const SELECTION_KEY = 'barbook.workspace.v1';

/** Authentication remains personal; every business context is separately confirmed by the server. */
@Injectable({ providedIn: 'root' })
export class WorkspaceContext {
  private readonly http = inject(HttpClient);
  private readonly drafts = inject(DraftStore);
  private readonly storage = inject(BrowserStorageService);
  private auth: AuthResponse | null = null;
  private generation = 0;
  private lastContext: BusinessWorkspace | null = null;
  private candidate: { userId: string; id: string } | null = null;
  private readonly commands = new Set<symbol>();
  readonly current = signal<BusinessWorkspace | null>(null);
  readonly transitioning = signal(false);
  readonly pendingCommands = signal(0);
  readonly error = signal<string | null>(null);
  readonly memoryOnly = signal(false);

  epoch(): number {
    return this.generation;
  }
  trackMutation(): () => void {
    const command = Symbol();
    this.commands.add(command);
    this.pendingCommands.set(this.commands.size);
    return () => {
      this.commands.delete(command);
      this.pendingCommands.set(this.commands.size);
    };
  }

  suspend(clear = false): void {
    this.generation++;
    this.current.set(null);
    this.auth = null;
    this.drafts.suspend();
    if (clear) {
      this.candidate = null;
      this.storage.remove('session', SELECTION_KEY);
    }
  }

  refreshAccess(): Observable<void> {
    return this.auth
      ? this.confirmSession(this.auth)
      : throwError(() => new Error('Confirme d’abord ta session.'));
  }

  confirmSession(auth: AuthResponse): Observable<void> {
    return defer(() => {
      const epoch = ++this.generation;
      this.current.set(null);
      this.auth = auth;
      const candidate = this.candidate ?? this.readCandidate();
      const id = candidate?.userId === auth.user.id ? candidate.id : auth.workspaceId;
      return this.resolve(auth, id).pipe(
        map((context) => {
          if (epoch !== this.generation) throw new Error('Le contexte a changé.');
          this.install(context);
        }),
        catchError((error) => {
          if (epoch !== this.generation) return throwError(() => error);
          // A failed Bar confirmation must never confirm Personnel and purge its suspended draft.
          this.drafts.suspend();
          this.error.set(
            'Cet espace n’est pas confirmé. Réessaie ou choisis explicitement Personnel.',
          );
          return of(undefined);
        }),
      );
    });
  }

  select(id: string, navigate: () => Promise<boolean>): Observable<boolean> {
    return defer(() => {
      const auth = this.auth;
      if (!auth || this.transitioning()) throw new Error('Confirme d’abord ta session.');
      if (this.pendingCommands() || this.drafts.hasPendingMutation())
        throw new Error('Attends la fin de l’enregistrement avant de changer d’espace.');
      if (this.current()?.id === id) return of(false);
      this.transitioning.set(true);
      const epoch = this.generation;
      const accepted =
        !this.drafts.hasDrafts() ||
        window.confirm(
          'Changer d’espace supprimera les brouillons de cet onglet, y compris ceux des formulaires fermés. Une action déjà envoyée peut être enregistrée ; changer d’espace ne l’annule pas. Continuer ?',
        );
      if (!accepted) {
        this.transitioning.set(false);
        return of(false);
      }
      return this.resolve(auth, id).pipe(
        switchMap((context) => {
          if (epoch !== this.generation || auth !== this.auth)
            throw new Error('La session a changé pendant la sélection.');
          this.drafts.purge();
          this.generation++;
          this.install(context);
          return from(navigate()).pipe(
            map((ok) => {
              if (!ok) {
                this.suspend();
                this.error.set('Navigation interrompue. Reconfirme ta session avant de continuer.');
                throw new Error('Le nouveau contexte ne peut pas être affiché.');
              }
              return true;
            }),
          );
        }),
        finalize(() => this.transitioning.set(false)),
      );
    });
  }

  /** Capture once: no response, version or body is adopted from a later workspace. */
  request<T>(
    resource: string,
    mutation: boolean,
    send: (url: string, accessVersion?: number) => Observable<T>,
    expectedAccessVersion?: number,
  ): Observable<T> {
    return defer(() => {
      const context = this.current();
      if (!context || this.transitioning()) throw new Error('Choisis un espace confirmé.');
      if (mutation && context.kind === 'SHARED' && expectedAccessVersion !== context.accessVersion)
        throw new HttpErrorResponse({
          status: 409,
          statusText:
            'L’accès a changé. Recharge explicitement avant de créer une nouvelle intention.',
        });
      const epoch = this.generation;
      const command = Symbol();
      if (mutation) {
        this.commands.add(command);
        this.pendingCommands.set(this.commands.size);
      }
      const prefix =
        context.kind === 'SHARED' ? `/api/workspaces/${encodeURIComponent(context.id)}` : '/api';
      return defer(() =>
        send(
          `${prefix}/${resource}`,
          context.kind === 'SHARED' ? expectedAccessVersion : undefined,
        ),
      ).pipe(
        map((result) => {
          if (epoch !== this.generation || context !== this.current())
            throw new Error('L’espace a changé. Réponse abandonnée.');
          return result;
        }),
        catchError((error) => {
          if (
            epoch === this.generation &&
            context.kind === 'SHARED' &&
            error instanceof HttpErrorResponse &&
            error.status === 404
          ) {
            // A missing recipe is also 404: do not assume that it proves revocation.
            // Recheck membership; discard this result without retrying the original operation.
            this.verifyMembership(context, epoch);
          }
          return throwError(() => error);
        }),
        finalize(() => {
          this.commands.delete(command);
          this.pendingCommands.set(this.commands.size);
        }),
      );
    });
  }

  private verifyMembership(context: BusinessWorkspace, epoch: number): void {
    if (!this.auth) return;
    this.resolve(this.auth, context.id).subscribe({
      error: () => {
        if (epoch !== this.generation) return;
        this.generation++;
        this.current.set(null);
        this.drafts.suspend();
        this.error.set('L’accès au Bar n’est plus confirmé. Choisis un espace autorisé.');
      },
    });
  }
  private resolve(auth: AuthResponse, id: string): Observable<BusinessWorkspace> {
    if (id === auth.workspaceId)
      return of({
        id,
        userId: auth.user.id,
        name: 'Personnel',
        kind: 'PERSONAL',
        role: 'OWNER',
        accessVersion: 0,
      });
    return this.http
      .get<SharedContext>(`/api/workspaces/${encodeURIComponent(id)}`, {
        context: new HttpContext().set(AUTH_SNAPSHOT, auth),
      })
      .pipe(
        timeout(15000),
        map((shared) => {
          if (
            shared.id !== id ||
            !Number.isSafeInteger(shared.accessVersion) ||
            shared.accessVersion < 0 ||
            !['OWNER', 'MEMBER'].includes(shared.role) ||
            (shared.accentKey !== undefined &&
              !['AMBER', 'RED', 'TEAL', 'BLUE'].includes(shared.accentKey))
          )
            throw new Error('Contexte Bar invalide.');
          return { ...shared, userId: auth.user.id, kind: 'SHARED' as const };
        }),
      );
  }
  private install(context: BusinessWorkspace): void {
    if (
      this.lastContext?.id === context.id &&
      this.lastContext.userId === context.userId &&
      this.lastContext.accessVersion !== context.accessVersion
    )
      this.drafts.suspend();
    this.lastContext = context;
    this.error.set(null);
    this.current.set(context);
    this.drafts.confirmIdentity({ userId: context.userId, workspaceId: context.id });
    this.candidate = context.kind === 'SHARED' ? { userId: context.userId, id: context.id } : null;
    const persisted = this.candidate
      ? this.storage.write('session', SELECTION_KEY, JSON.stringify(this.candidate))
      : this.storage.remove('session', SELECTION_KEY);
    this.memoryOnly.set(!persisted);
  }
  private readCandidate(): { userId: string; id: string } | null {
    try {
      const raw = this.storage.read('session', SELECTION_KEY);
      if (!raw || raw.length > 300) return null;
      const parsed = JSON.parse(raw) as { userId?: unknown; id?: unknown } | null;
      return parsed &&
        typeof parsed.userId === 'string' &&
        typeof parsed.id === 'string' &&
        /^[0-9a-f-]{36}$/i.test(parsed.id)
        ? { userId: parsed.userId, id: parsed.id }
        : null;
    } catch {
      return null;
    }
  }
}
