import { firstValueFrom } from 'rxjs';
import { WorkspaceContext } from '../workspaces/workspace-context';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DRAFT_KEY, DraftStore } from '../drafts/draft-store.service';
import { AuthService } from './auth.service';
import { AUTH_SNAPSHOT } from './auth.models';
import { authInterceptor } from './auth.interceptor';

describe('AuthService cookie session', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const auth = {
    user: { id: 'A', email: 'qa@example.test', displayName: 'QA' },
    workspaceId: 'WA',
    csrfToken: 'csrf',
  };
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: { url: '/cocktails', navigate: vi.fn().mockResolvedValue(true) },
        },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  function establish(): void {
    service.login({ email: auth.user.email, password: 'password' }).subscribe();
    http.expectOne('/api/auth/login').flush(auth);
    http.expectOne('/api/auth/me').flush(auth);
  }
  it('verifies the cookie before accepting login, without persisting any secret', () => {
    service.login({ email: auth.user.email, password: 'password', rememberMe: false }).subscribe();
    const login = http.expectOne('/api/auth/login');
    expect(login.request.body.rememberMe).toBe(false);
    login.flush(auth);
    expect(service.isAuthenticated()).toBe(false);
    http.expectOne('/api/auth/me').flush(auth);
    expect(service.currentUser()).toEqual(auth.user);
    expect(sessionStorage.getItem('barbook.accessToken')).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
  it('verifies registration once, without replay on cookie rejection', () => {
    const error = vi.fn();
    service
      .register({ email: auth.user.email, password: 'password', displayName: 'QA' })
      .subscribe({ error });
    http.expectOne('/api/auth/register').flush(auth);
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(service.isAuthenticated()).toBe(false);
    expect(error).toHaveBeenCalledOnce();
    http.expectNone('/api/auth/register');
  });
  it('shares a single bootstrap request', () => {
    service.loadCurrentUser().subscribe();
    service.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(auth);
    expect(service.currentUser()).toEqual(auth.user);
  });
  it('does not adopt a different account found after login', () => {
    const error = vi.fn();
    service.login({ email: auth.user.email, password: 'password' }).subscribe({ error });
    http.expectOne('/api/auth/login').flush(auth);
    http.expectOne('/api/auth/me').flush({ ...auth, user: { ...auth.user, id: 'B' } });
    expect(error).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(false);
  });
  it('does not install a late bootstrap response after expiry', () => {
    const error = vi.fn();
    service.loadCurrentUser().subscribe({ error });
    const pending = http.expectOne('/api/auth/me');
    service.expire();
    pending.flush(auth);
    expect(error).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(false);
  });
  it('locks private content during logout and retains explicit retry proofs after network failure', () => {
    establish();
    service.logout().subscribe({ error: () => undefined });
    const logout = http.expectOne('/api/auth/logout');
    expect(logout.request.context.get(AUTH_SNAPSHOT)).toEqual(auth);
    expect(service.isAuthenticated()).toBe(false);
    logout.error(new ProgressEvent('error'));
    expect(service.logoutUncertain()).toBe(true);
    service.logout().subscribe();
    const retry = http.expectOne('/api/auth/logout');
    expect(retry.request.context.get(AUTH_SNAPSHOT)).toEqual(auth);
    retry.flush(null);
    expect(service.logoutUncertain()).toBe(false);
  });
  it('discards a late logout response after a new cookie session has been confirmed', () => {
    establish();
    const error = vi.fn();
    service.logout().subscribe({ error });
    const oldLogout = http.expectOne('/api/auth/logout');
    const renewed = { ...auth, csrfToken: 'renewed-csrf' };
    service.login({ email: auth.user.email, password: 'password' }).subscribe();
    http.expectOne('/api/auth/login').flush(renewed);
    http.expectOne('/api/auth/me').flush(renewed);
    oldLogout.flush(null);
    expect(error).toHaveBeenCalledOnce();
    expect(service.snapshot()).toEqual(renewed);
    expect(service.logoutUncertain()).toBe(false);
    http.expectNone('/api/auth/logout');
  });
  it('preserves drafts after involuntary expiry without sending logout', () => {
    establish();
    sessionStorage.setItem('draft-fixture', 'kept');
    service.expire();
    expect(sessionStorage.getItem('draft-fixture')).toBe('kept');
    http.expectNone('/api/auth/logout');
  });
  it('binds drafts only after /me, preserves on expiry, purges before failed logout', () => {
    const drafts = TestBed.inject(DraftStore);
    service.login({ email: auth.user.email, password: 'password' }).subscribe();
    http.expectOne('/api/auth/login').flush(auth);
    expect(drafts.lease()).toBeNull();
    http.expectOne('/api/auth/me').flush(auth);
    const lease = drafts.lease();
    drafts.save(lease, 'create:new', 1, 'saisie');
    service.expire();
    expect(drafts.lease()).toBeNull();
    establish();
    expect(drafts.find(drafts.lease(), 'create:new')?.value).toBe('saisie');
    service.logout().subscribe({ error: () => undefined });
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    http.expectOne('/api/auth/logout').error(new ProgressEvent('error'));
    expect(drafts.save(lease, 'create:new', 1, 'late')).toBe(false);
  });
  it('purges account A when account B is confirmed, including after involuntary expiry', () => {
    establish();
    const drafts = TestBed.inject(DraftStore);
    drafts.save(drafts.lease(), 'create:new', 1, 'private A');
    service.expire();
    const b = { ...auth, user: { ...auth.user, id: 'B' }, workspaceId: 'WB' };
    service.login({ email: 'b@example.test', password: 'password' }).subscribe();
    http.expectOne('/api/auth/login').flush(b);
    http.expectOne('/api/auth/me').flush(b);
    expect(drafts.find(drafts.lease(), 'create:new')).toBeNull();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
  it('requires explicit global confirmation on every retry and never downgrades it to local logout', () => {
    establish();
    const drafts = TestBed.inject(DraftStore);
    drafts.save(drafts.lease(), 'create:new', 1, 'private');
    service.logoutAll('password').subscribe({ error: () => undefined });
    const first = http.expectOne('/api/auth/logout-all');
    expect(first.request.body).toEqual({ password: 'password' });
    expect(first.request.headers.get('X-Barbook-CSRF')).toBe(auth.csrfToken);
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(service.globalLogoutUncertain()).toBe(true);
    first.error(new ProgressEvent('error'));
    const refused = vi.fn();
    service.logout().subscribe({ error: refused });
    service.loadCurrentUser().subscribe({ error: refused });
    expect(refused).toHaveBeenCalledTimes(2);
    http.expectNone('/api/auth/logout');
    http.expectNone('/api/auth/me');
    service.logoutAll('reentered').subscribe();
    const retry = http.expectOne('/api/auth/logout-all');
    expect(retry.request.body).toEqual({ password: 'reentered' });
    expect(retry.request.context.get(AUTH_SNAPSHOT)).toEqual(auth);
    retry.flush(null);
    expect(service.logoutUncertain()).toBe(false);
    expect(service.globalLogoutUncertain()).toBe(false);
  });
  it('does not claim global logout on wrong password or replay an uncertain operation', () => {
    establish();
    const error = vi.fn();
    service.logoutAll('wrong').subscribe({ error });
    http
      .expectOne('/api/auth/logout-all')
      .flush({ code: 'REAUTHENTICATION_FAILED' }, { status: 401, statusText: 'Unauthorized' });
    expect(error).toHaveBeenCalledOnce();
    expect(service.logoutUncertain()).toBe(true);
    expect(service.globalLogoutUncertain()).toBe(true);
    expect(service.logoutPending()).toBe(false);
    http.expectNone('/api/auth/logout-all');
  });
  it('ignores a late global response after identity B is confirmed, preserving B drafts', () => {
    establish();
    service.logoutAll('password').subscribe({ error: () => undefined });
    const pending = http.expectOne('/api/auth/logout-all');
    const b = { ...auth, user: { ...auth.user, id: 'B' }, workspaceId: 'WB', csrfToken: 'csrf-B' };
    service.login({ email: 'b@example.test', password: 'password' }).subscribe();
    http.expectOne('/api/auth/login').flush(b);
    http.expectOne('/api/auth/me').flush(b);
    const drafts = TestBed.inject(DraftStore);
    drafts.save(drafts.lease(), 'create:new', 1, 'B private');
    pending.flush(null);
    expect(service.snapshot()).toEqual(b);
    expect(service.logoutUncertain()).toBe(false);
    expect(drafts.find(drafts.lease(), 'create:new')?.value).toBe('B private');
  });
  it('purges a retained draft on voluntary server revocation but preserves expiry', () => {
    establish();
    const drafts = TestBed.inject(DraftStore);
    drafts.save(drafts.lease(), 'create:new', 1, 'private');
    service.expire(true);
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(drafts.lease()).toBeNull();
  });
  it('ignores delayed logout notifications for an older session of the same owner', async () => {
    TestBed.resetTestingModule();
    const messages: unknown[] = [];
    const channels: { onmessage: ((event: MessageEvent) => void) | null }[] = [];
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        onmessage = null;
        constructor() {
          channels.push(this);
        }
        postMessage(message: unknown): void {
          messages.push(message);
        }
        close(): void {
          /* fixture */
        }
      },
    );
    vi.stubGlobal('crypto', {
      subtle: { digest: async (_: string, data: Uint8Array) => data.buffer },
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: { url: '/cocktails', navigate: vi.fn().mockResolvedValue(true) },
        },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    establish();
    service.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const oldMessage = messages[0];
    expect(JSON.stringify(oldMessage)).not.toContain('csrf');
    const renewed = { ...auth, csrfToken: 'new-session' };
    service.login({ email: auth.user.email, password: 'password' }).subscribe();
    http.expectOne('/api/auth/login').flush(renewed);
    http.expectOne('/api/auth/me').flush(renewed);
    const drafts = TestBed.inject(DraftStore);
    drafts.save(drafts.lease(), 'create:new', 1, 'new private');
    channels[0].onmessage?.({ data: oldMessage } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(service.snapshot()).toEqual(renewed);
    expect(drafts.find(drafts.lease(), 'create:new')?.value).toBe('new private');
    // A matching notification still applies, including after involuntary expiry.
    const tag = Array.from(new TextEncoder().encode(renewed.csrfToken), (value) =>
      value.toString(16).padStart(2, '0'),
    ).join('');
    const barId = '00000000-0000-4000-8000-000000000001';
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const selection = firstValueFrom(
      TestBed.inject(WorkspaceContext).select(barId, () => Promise.resolve(true)),
    );
    http
      .expectOne(`/api/workspaces/${barId}`)
      .flush({ id: barId, name: 'Bar', role: 'MEMBER', accessVersion: 0 });
    await selection;
    drafts.save(drafts.lease(), 'create:new', 1, 'Bar private');
    expect(drafts.lease()?.owner.workspaceId).toBe(barId);
    service.expire();
    channels[0].onmessage?.({
      data: { kind: 'logout', owner: { userId: 'A', workspaceId: 'WA' }, tag },
    } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
  it('continues without crashing if BroadcastChannel construction is denied', () => {
    TestBed.resetTestingModule();
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        constructor() {
          throw new DOMException('denied', 'SecurityError');
        }
      },
    );
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: { url: '/cocktails', navigate: vi.fn().mockResolvedValue(true) },
        },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    establish();
    expect(service.currentUser()).toEqual(auth.user);
  });
  it('revalidates a resumed document without discarding a same-session form lease', () => {
    establish();
    const drafts = TestBed.inject(DraftStore);
    const lease = drafts.lease();
    drafts.save(lease, 'create:new', 1, 'preserved');
    service.revalidateSession().subscribe();
    http.expectOne('/api/auth/me').flush(auth);
    expect(service.snapshot()).toEqual(auth);
    expect(drafts.save(lease, 'create:new', 1, 'still editable')).toBe(true);
  });
  it('refuses a replacement cookie on resume even for the same owner, preserving explicit recovery', () => {
    establish();
    const drafts = TestBed.inject(DraftStore);
    drafts.save(drafts.lease(), 'create:new', 1, 'preserved');
    service.revalidateSession().subscribe({ error: () => undefined });
    http.expectOne('/api/auth/me').flush({ ...auth, csrfToken: 'replacement' });
    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(DRAFT_KEY)).toContain('preserved');
  });
  it('purges the previous owner when a different real identity is found on resume', () => {
    establish();
    const drafts = TestBed.inject(DraftStore);
    drafts.save(drafts.lease(), 'create:new', 1, 'private A');
    service.revalidateSession().subscribe({ error: () => undefined });
    http
      .expectOne('/api/auth/me')
      .flush({ ...auth, user: { ...auth.user, id: 'B' }, workspaceId: 'WB' });
    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
  it('removes the retired JWT at initialization without reading it as authority', () => {
    TestBed.resetTestingModule();
    sessionStorage.setItem('barbook.accessToken', 'old-jwt');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: { url: '/cocktails', navigate: vi.fn().mockResolvedValue(true) },
        },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('barbook.accessToken')).toBeNull();
  });
});
