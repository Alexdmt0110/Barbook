import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor web boundary', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let epoch: number;
  let expire: ReturnType<typeof vi.fn>;
  const auth = { user: { id: 'A' }, workspaceId: 'WA', csrfToken: 'csrf' };
  beforeEach(() => {
    epoch = 0;
    expire = vi.fn(() => {
      epoch++;
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { snapshot: () => auth, epoch: () => epoch, expire } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });
  afterEach(() => http.verify());
  it('sends context and CSRF on API mutation, with credentials and no Bearer', () => {
    client.post('/api/folders', { name: 'QA' }).subscribe();
    const req = http.expectOne('/api/folders');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('Authorization')).toBeNull();
    expect(req.request.headers.get('X-Barbook-CSRF')).toBe('csrf');
    expect(req.request.headers.get('X-Barbook-Expected-User')).toBe('A');
    expect(req.request.headers.get('X-Barbook-Expected-Workspace')).toBe('WA');
    expect(req.request.headers.get('X-Barbook-Request')).toBe('1');
    req.flush({});
  });
  it.each(['https://external.test/api/private', '//external.test/api/private', '/api-evil/path'])(
    'never leaks authentication to %s',
    (url) => {
      client.post(url, {}).subscribe();
      const req = http.expectOne(url);
      expect(req.request.withCredentials).toBe(false);
      expect(req.request.headers.keys()).toEqual([]);
      req.flush({});
    },
  );
  it('does not send previous account proofs on login', () => {
    client.post('/api/auth/login', {}).subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.headers.get('X-Barbook-CSRF')).toBeNull();
    expect(req.request.headers.get('X-Barbook-Expected-User')).toBeNull();
    req.flush({});
  });
  it('sends context but not CSRF on GET', () => {
    client.get('/api/cocktails').subscribe();
    const req = http.expectOne('/api/cocktails');
    expect(req.request.headers.get('X-Barbook-Expected-User')).toBe('A');
    expect(req.request.headers.get('X-Barbook-CSRF')).toBeNull();
    req.flush({});
  });
  it('expires only once for concurrent 401s, without replay', () => {
    const errors = vi.fn();
    client.post('/api/folders', {}).subscribe({ error: errors });
    client.get('/api/cocktails').subscribe({ error: errors });
    http.expectOne('/api/folders').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/cocktails').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(expire).toHaveBeenCalledOnce();
    expect(errors).toHaveBeenCalledTimes(2);
  });
  it('discards a successful late response after a generation change', () => {
    const next = vi.fn();
    const error = vi.fn();
    client.get('/api/cocktails').subscribe({ next, error });
    const req = http.expectOne('/api/cocktails');
    epoch++;
    req.flush({ private: 'A' });
    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
  });
  it('expires for a context conflict, while ordinary version conflicts preserve the session', () => {
    client.put('/api/organization', {}).subscribe({ error: () => undefined });
    http
      .expectOne('/api/organization')
      .flush({ code: 'VERSION_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    expect(expire).not.toHaveBeenCalled();
    client.put('/api/organization', {}).subscribe({ error: () => undefined });
    http
      .expectOne('/api/organization')
      .flush({ code: 'AUTH_CONTEXT_CHANGED' }, { status: 409, statusText: 'Conflict' });
    expect(expire).toHaveBeenCalledOnce();
  });
  it('distinguishes revocation from expiry and excludes failed global reauthentication', () => {
    client.post('/api/auth/logout-all', {}).subscribe({ error: () => undefined });
    http
      .expectOne('/api/auth/logout-all')
      .flush({ code: 'REAUTHENTICATION_FAILED' }, { status: 401, statusText: 'Unauthorized' });
    expect(expire).not.toHaveBeenCalled();
    client.get('/api/cocktails').subscribe({ error: () => undefined });
    http
      .expectOne('/api/cocktails')
      .flush({ code: 'SESSION_REVOKED' }, { status: 401, statusText: 'Unauthorized' });
    expect(expire).toHaveBeenCalledWith(true);
  });
  it('does not convert a 500 into expiry or revoke after a logout failure', () => {
    for (const url of ['/api/cocktails', '/api/auth/logout', '/api/auth/logout-all']) {
      client.post(url, {}).subscribe({ error: () => undefined });
      http.expectOne(url).flush({}, { status: 500, statusText: 'Unavailable' });
    }
    expect(expire).not.toHaveBeenCalled();
  });
});
