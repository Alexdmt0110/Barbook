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
  private readonly session = signal<AuthResponse | null>(null);
  private generation = 0;
  private bootstrap?: Observable<AuthResponse>;
  private pendingLogout: AuthResponse | null = null;
  private readonly channel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('barbook.auth');
  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly logoutUncertain = signal(false);

  constructor() {
    // Remove the retired credential; never read it or purge unrelated drafts.
    this.storage.remove('session', 'barbook.accessToken');
    if (this.channel)
      this.channel.onmessage = (event: MessageEvent<unknown>) => {
        const message = event.data as { kind?: unknown; owner?: DraftOwner } | null;
        if (message?.kind === 'logout' && message.owner && this.drafts.belongsTo(message.owner)) {
          this.drafts.purge();
          this.expire();
        } else if (message?.kind === 'identity') {
          if (message.owner && !this.drafts.belongsTo(message.owner)) this.drafts.purge();
          this.expire();
        } else if (event.data === 'changed') this.expire();
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
    if (!this.bootstrap) {
      const epoch = this.generation;
      this.bootstrap = this.http.get<AuthResponse>('/api/auth/me').pipe(
        tap((auth) => {
          if (epoch !== this.generation) throw new Error('La session a changé. Reconnecte-toi.');
          const previous = this.session();
          if (previous && !this.sameContext(previous, auth)) {
            this.expire();
            throw new Error('Le compte ou l’espace a changé. Reconnecte-toi.');
          }
          this.drafts.confirmIdentity(this.draftOwner(auth));
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

  /** Involuntary expiry never revokes remotely or removes draft storage. */
  expire(): void {
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
    return defer(() => {
      this.pendingLogout ??= this.session();
      const snapshot = this.pendingLogout;
      this.drafts.purge();
      if (snapshot) this.channel?.postMessage({ kind: 'logout', owner: this.draftOwner(snapshot) });
      this.drafts.suspend();
      this.generation++;
      this.session.set(null);
      this.bootstrap = undefined;
      this.logoutUncertain.set(true);
      return this.http
        .post<void>(
          '/api/auth/logout',
          {},
          {
            context: new HttpContext().set(AUTH_SNAPSHOT, snapshot),
          },
        )
        .pipe(
          tap(() => {
            this.pendingLogout = null;
            this.logoutUncertain.set(false);
          }),
        );
    });
  }

  private signIn(url: string, request: LoginRequest | RegisterRequest): Observable<AuthResponse> {
    return defer(() => {
      this.drafts.suspend();
      this.generation++;
      this.session.set(null);
      this.bootstrap = undefined;
      this.pendingLogout = null;
      this.logoutUncertain.set(false);
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
        tap((auth) => {
          this.drafts.confirmIdentity(this.draftOwner(auth));
          this.session.set(auth);
          this.channel?.postMessage({ kind: 'identity', owner: this.draftOwner(auth) });
        }),
      );
    });
  }

  private draftOwner(auth: AuthResponse): DraftOwner {
    return { userId: auth.user.id, workspaceId: auth.workspaceId };
  }

  private sameContext(a: AuthResponse, b: AuthResponse): boolean {
    return a.user.id === b.user.id && a.workspaceId === b.workspaceId;
  }
}
