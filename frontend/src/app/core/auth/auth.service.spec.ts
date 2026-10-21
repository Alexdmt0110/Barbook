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
