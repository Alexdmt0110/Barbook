import { WorkspaceContext } from '../workspaces/workspace-context';
import { HttpClient, HttpContext } from '@angular/common/http';
import { DestroyRef, computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  defer,
  finalize,
  map,
  shareReplay,
  switchMap,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import { DraftOwner, DraftStore } from '../drafts/draft-store.service';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { AUTH_SNAPSHOT, AuthResponse, LoginRequest, RegisterRequest } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(BrowserStorageService);
  private readonly drafts = inject(DraftStore);
  private readonly workspace = inject(WorkspaceContext);
  private readonly session = signal<AuthResponse | null>(null);
  private generation = 0;
  private bootstrap?: Observable<AuthResponse>;
  private pendingLogout: AuthResponse | null = null;
  private lastConfirmed: AuthResponse | null = null;
  private readonly channel = this.openChannel();
  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly logoutUncertain = signal(false);
  readonly globalLogoutUncertain = signal(false);
  readonly logoutPending = signal(false);

  constructor() {
    // Remove the retired credential; never read it or purge unrelated drafts.
    this.storage.remove('session', 'barbook.accessToken');
    if (this.channel)
      this.channel.onmessage = (event: MessageEvent<unknown>) => {
        void this.receiveNotification(event.data);
      };
    inject(DestroyRef).onDestroy(() => this.channel?.close());
  }

  snapshot(): AuthResponse | null {
    return this.session();
  }
  epoch(): number {
    return this.generation;
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.signIn('/api/auth/login', request);
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.signIn('/api/auth/register', request);
  }

  loadCurrentUser(): Observable<AuthResponse> {
    if (this.logoutUncertain())
      return throwError(
        () => new Error('Déconnexion non confirmée. Reconnecte-toi explicitement.'),
      );
    if (!this.bootstrap) {
      const epoch = this.generation;
      this.bootstrap = this.http.get<AuthResponse>('/api/auth/me').pipe(
        tap((auth) => {
          if (epoch !== this.generation) throw new Error('La session a changé. Reconnecte-toi.');
          const previous = this.session();
          if (
            previous &&
            (!this.sameContext(previous, auth) || previous.csrfToken !== auth.csrfToken)
          ) {
            if (!this.sameContext(previous, auth)) this.drafts.purge();
            this.expire();
            throw new Error('Le compte ou l’espace a changé. Reconnecte-toi.');
          }
        }),
        switchMap((auth) => this.workspace.confirmSession(auth).pipe(map(() => auth))),
        tap((auth) => {
          if (epoch !== this.generation) throw new Error('La session a changé.');
          this.lastConfirmed = auth;
          this.session.set(auth);
        }),
        finalize(() => {
          this.bootstrap = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.bootstrap;
  }

  /** A resumed document needs fresh authorization; discard earlier responses. */
  revalidateSession(): Observable<AuthResponse> {
    this.generation++;
    this.bootstrap = undefined;
    return this.loadCurrentUser();
  }

  /** Involuntary expiry never revokes remotely or removes draft storage. */
  expire(revoked = false): void {
    this.workspace.suspend(revoked);
    if (revoked) this.drafts.purge();
    const wasAuthenticated = this.session() !== null;
    this.drafts.suspend();
    this.generation++;
    this.session.set(null);
    this.bootstrap = undefined;
    if (wasAuthenticated) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    }
  }

  logout(): Observable<void> {
    return this.requestLogout(false);
  }

  logoutAll(password: string): Observable<void> {
    return this.requestLogout(true, password);
  }

  private requestLogout(global: boolean, password?: string): Observable<void> {
    return defer(() => {
      if (!global && this.globalLogoutUncertain())
        throw new Error('La déconnexion globale demande une nouvelle confirmation.');
      if (this.logoutPending()) throw new Error('Une déconnexion est déjà en cours.');
      this.pendingLogout ??= this.session();
      const snapshot = this.pendingLogout;
      if (global && !snapshot)
        throw new Error('Reconnecte-toi avant de confirmer une déconnexion globale.');
      this.logoutPending.set(true);
      this.globalLogoutUncertain.set(global);
      this.workspace.suspend(true);
      this.drafts.purge();
      if (snapshot) this.notify('logout', snapshot);
      this.drafts.suspend();
      this.generation++;
      this.session.set(null);
      this.bootstrap = undefined;
      this.logoutUncertain.set(true);
      return this.http
        .post<void>(
          global ? '/api/auth/logout-all' : '/api/auth/logout',
          global ? { password } : {},
          {
            context: new HttpContext().set(AUTH_SNAPSHOT, snapshot),
          },
        )
        .pipe(
          timeout(15000),
          tap(() => {
            this.pendingLogout = null;
            this.logoutUncertain.set(false);
            this.globalLogoutUncertain.set(false);
          }),
          finalize(() => this.logoutPending.set(false)),
        );
    });
  }

  private signIn(url: string, request: LoginRequest | RegisterRequest): Observable<AuthResponse> {
    return defer(() => {
      const previous = this.session() ?? this.lastConfirmed;
      this.workspace.suspend();
      this.drafts.suspend();
      this.generation++;
      this.session.set(null);
      this.bootstrap = undefined;
      this.pendingLogout = null;
      this.logoutUncertain.set(false);
      this.globalLogoutUncertain.set(false);
      const epoch = this.generation;
      return this.http.post<AuthResponse>(url, request).pipe(
        switchMap((issued) =>
          this.http.get<AuthResponse>('/api/auth/me').pipe(
            map((confirmed) => {
              if (
                epoch !== this.generation ||
                !this.sameContext(issued, confirmed) ||
                issued.csrfToken !== confirmed.csrfToken
              ) {
                throw new Error('La connexion a changé dans un autre onglet. Reconnecte-toi.');
              }
              return confirmed;
            }),
            catchError(() =>
              throwError(
                () =>
                  new Error(
                    url.endsWith('/register')
                      ? 'Le compte a été créé, mais la connexion n’est pas confirmée. Autorise les cookies puis connecte-toi ; ne recrée pas le compte.'
                      : 'Identifiants acceptés, mais connexion non confirmée. Vérifie les cookies puis reconnecte-toi.',
                  ),
              ),
            ),
            // A successful registration is not rolled back when cookies are blocked.
            // The UI must not offer an automatic replay of that POST.
          ),
        ),
        switchMap((auth) => this.workspace.confirmSession(auth).pipe(map(() => auth))),
        tap((auth) => {
          if (epoch !== this.generation) throw new Error('La session a changé.');
          this.lastConfirmed = auth;
          this.session.set(auth);
          if (previous) this.notify('identity', previous, auth);
        }),
      );
    });
  }

  private openChannel(): BroadcastChannel | null {
    try {
      return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('barbook.auth');
    } catch {
      return null;
    }
  }

  private notify(kind: 'logout' | 'identity', previous: AuthResponse, next?: AuthResponse): void {
    void this.sessionTag(previous).then((tag) => {
      if (!tag) return;
      try {
        this.channel?.postMessage({
          kind,
          owner: this.draftOwner(previous),
          tag,
          nextOwner: next ? this.draftOwner(next) : undefined,
        });
      } catch {
        /* Server context checks remain authoritative. */
      }
    });
  }

  private async receiveNotification(data: unknown): Promise<void> {
    const message = data as {
      kind?: unknown;
      owner?: DraftOwner;
      tag?: unknown;
      nextOwner?: DraftOwner;
    } | null;
    const current = this.session() ?? this.lastConfirmed;
    if (
      !current ||
      !message ||
      !['logout', 'identity'].includes(String(message.kind)) ||
      typeof message.tag !== 'string' ||
      !message.owner
    )
      return;
    const epoch = this.generation;
    const tag = await this.sessionTag(current);
    if (
      epoch !== this.generation ||
      !tag ||
      tag !== message.tag ||
      message.owner.userId !== current.user.id ||
      message.owner.workspaceId !== current.workspaceId
    )
      return;
    if (
      message.kind === 'logout' ||
      (message.nextOwner &&
        (message.nextOwner.userId !== current.user.id ||
          message.nextOwner.workspaceId !== current.workspaceId))
    )
      this.drafts.purge();
    this.expire();
  }

  private async sessionTag(auth: AuthResponse): Promise<string | null> {
    try {
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(auth.csrfToken),
      );
      return Array.from(new Uint8Array(digest), (value) =>
        value.toString(16).padStart(2, '0'),
      ).join('');
    } catch {
      return null;
    }
  }

  private draftOwner(auth: AuthResponse): DraftOwner {
    return { userId: auth.user.id, workspaceId: auth.workspaceId };
  }

  private sameContext(a: AuthResponse, b: AuthResponse): boolean {
    return a.user.id === b.user.id && a.workspaceId === b.workspaceId;
  }
}
