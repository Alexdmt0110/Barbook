import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

class AuthServiceStub {
  accessToken: string | null = null;

  authenticated = false;

  logoutCalled = false;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  logout(): void {
    this.logoutCalled = true;

    this.accessToken = null;

    this.authenticated = false;
  }
}

class RouterStub {
  url = '/cocktails';

  readonly navigate = vi.fn().mockResolvedValue(true);
}

describe('authInterceptor', () => {
  let httpClient: HttpClient;

  let httpTestingController: HttpTestingController;

  let authService: AuthServiceStub;

  let router: RouterStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),

        provideHttpClientTesting(),

        {
          provide: AuthService,
          useClass: AuthServiceStub,
        },

        {
          provide: Router,
          useClass: RouterStub,
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);

    httpTestingController = TestBed.inject(HttpTestingController);

    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;

    router = TestBed.inject(Router) as unknown as RouterStub;
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('adds the bearer token to private API requests', () => {
    authService.accessToken = 'access-token';

    httpClient.get('/api/auth/me').subscribe();

    const request = httpTestingController.expectOne('/api/auth/me');

    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');

    request.flush({});
  });

  it('does not add an authorization header without a token', () => {
    authService.accessToken = null;

    httpClient.get('/api/auth/me').subscribe();

    const request = httpTestingController.expectOne('/api/auth/me');

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({});
  });

  it('does not send the token to non API URLs', () => {
    authService.accessToken = 'access-token';

    httpClient.get('https://example.com/data').subscribe();

    const request = httpTestingController.expectOne('https://example.com/data');

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({});
  });

  it('does not attach an existing token to the login endpoint', () => {
    authService.accessToken = 'stale-access-token';

    httpClient
      .post('/api/auth/login', {
        email: 'alex@barbook.local',
        password: 'wrong-password',
      })
      .subscribe({
        error: () => undefined,
      });

    const request = httpTestingController.expectOne('/api/auth/login');

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush(
      {
        message: 'Unauthorized',
      },
      {
        status: 401,
        statusText: 'Unauthorized',
      },
    );

    expect(authService.logoutCalled).toBe(false);

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears an active session and redirects to login after an authenticated 401', () => {
    authService.accessToken = 'expired-token';

    authService.authenticated = true;

    router.url = '/cocktails/aviation?tab=recipe';

    httpClient.get('/api/cocktails').subscribe({
      error: () => undefined,
    });

    const request = httpTestingController.expectOne('/api/cocktails');

    request.flush(
      {
        message: 'Unauthorized',
      },
      {
        status: 401,
        statusText: 'Unauthorized',
      },
    );

    expect(authService.logoutCalled).toBe(true);

    expect(authService.accessToken).toBeNull();

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: {
        returnUrl: '/cocktails/aviation?tab=recipe',
      },
    });
  });

  it('clears an invalid stored token without competing with the auth guard redirect', () => {
    authService.accessToken = 'invalid-stored-token';

    authService.authenticated = false;

    httpClient.get('/api/auth/me').subscribe({
      error: () => undefined,
    });

    const request = httpTestingController.expectOne('/api/auth/me');

    request.flush(
      {
        message: 'Unauthorized',
      },
      {
        status: 401,
        statusText: 'Unauthorized',
      },
    );

    expect(authService.logoutCalled).toBe(true);

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not clear the session for non authentication errors', () => {
    authService.accessToken = 'access-token';

    authService.authenticated = true;

    httpClient.get('/api/cocktails').subscribe({
      error: () => undefined,
    });

    const request = httpTestingController.expectOne('/api/cocktails');

    request.flush(
      {
        message: 'Server error',
      },
      {
        status: 500,
        statusText: 'Internal Server Error',
      },
    );

    expect(authService.logoutCalled).toBe(false);

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
