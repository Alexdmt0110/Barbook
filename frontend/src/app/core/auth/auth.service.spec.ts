import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;

  const user = {
    id: 'user-123',
    email: 'alex@barbook.local',
    displayName: 'Alex',
  };

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('logs in and persists the authenticated session', () => {
    service
      .login({
        email: 'alex@barbook.local',
        password: 'une phrase de passe suffisamment longue',
      })
      .subscribe();

    const request = httpTestingController.expectOne('/api/auth/login');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'alex@barbook.local',
      password: 'une phrase de passe suffisamment longue',
    });

    request.flush({
      user,
      accessToken: 'access-token',
    });

    expect(service.currentUser()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe('access-token');
    expect(sessionStorage.getItem('barbook.accessToken')).toBe('access-token');
  });

  it('registers and persists the authenticated session', () => {
    service
      .register({
        displayName: 'Alex',
        email: 'alex@barbook.local',
        password: 'une phrase de passe suffisamment longue',
      })
      .subscribe();

    const request = httpTestingController.expectOne('/api/auth/register');

    expect(request.request.method).toBe('POST');

    request.flush({
      user,
      accessToken: 'access-token',
    });

    expect(service.currentUser()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
    expect(sessionStorage.getItem('barbook.accessToken')).toBe('access-token');
  });

  it('loads the current user without replacing the stored token', () => {
    sessionStorage.setItem('barbook.accessToken', 'stored-access-token');

    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);

    service.loadCurrentUser().subscribe();

    const request = httpTestingController.expectOne('/api/auth/me');

    expect(request.request.method).toBe('GET');

    request.flush(user);

    expect(service.currentUser()).toEqual(user);
    expect(service.getAccessToken()).toBe('stored-access-token');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('clears the authenticated session on logout', () => {
    service
      .login({
        email: 'alex@barbook.local',
        password: 'une phrase de passe suffisamment longue',
      })
      .subscribe();

    const request = httpTestingController.expectOne('/api/auth/login');

    request.flush({
      user,
      accessToken: 'access-token',
    });

    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(service.getAccessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('barbook.accessToken')).toBeNull();
  });

  it('restores a stored access token when the service is created', () => {
    sessionStorage.setItem('barbook.accessToken', 'stored-access-token');

    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const restoredService = TestBed.inject(AuthService);

    expect(restoredService.getAccessToken()).toBe('stored-access-token');
    expect(restoredService.hasStoredAccessToken()).toBe(true);
    expect(restoredService.currentUser()).toBeNull();
    expect(restoredService.isAuthenticated()).toBe(false);
  });
});
