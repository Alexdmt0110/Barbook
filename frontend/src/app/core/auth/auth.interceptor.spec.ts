import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

class AuthServiceStub {
  accessToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: AuthServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useClass: AuthServiceStub,
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('adds the bearer token to API requests', () => {
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
});
