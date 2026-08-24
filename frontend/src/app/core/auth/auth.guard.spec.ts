import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, Observable, of, throwError } from 'rxjs';
import { AuthenticatedUser } from './auth.models';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

class AuthServiceStub {
  authenticated = false;
  storedToken = false;

  loadCurrentUserResult: Observable<AuthenticatedUser> = of({
    id: 'user-123',
    email: 'alex@barbook.local',
    displayName: 'Alex',
  });

  logoutCalled = false;

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  hasStoredAccessToken(): boolean {
    return this.storedToken;
  }

  loadCurrentUser(): Observable<AuthenticatedUser> {
    return this.loadCurrentUserResult;
  }

  logout(): void {
    this.logoutCalled = true;
  }
}

describe('authGuard', () => {
  let authService: AuthServiceStub;
  let router: Router;

  const route = {} as ActivatedRouteSnapshot;

  const state = {
    url: '/cocktails',
  } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useClass: AuthServiceStub,
        },
      ],
    });

    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;

    router = TestBed.inject(Router);
  });

  it('allows an already authenticated user', () => {
    authService.authenticated = true;

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBe(true);
  });

  it('redirects to login when no token is stored', () => {
    authService.authenticated = false;
    authService.storedToken = false;

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result instanceof UrlTree).toBe(true);

    if (!(result instanceof UrlTree)) {
      throw new Error('Expected the guard to return a UrlTree.');
    }

    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fcocktails');
  });

  it('restores the user when a stored token is valid', async () => {
    authService.authenticated = false;
    authService.storedToken = true;

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    if (!isObservable(result)) {
      throw new Error('Expected the guard to return an Observable.');
    }

    const guardResult = await firstValueFrom(result);

    expect(guardResult).toBe(true);
    expect(authService.logoutCalled).toBe(false);
  });

  it('clears the session and redirects when the stored token is invalid', async () => {
    authService.authenticated = false;
    authService.storedToken = true;

    authService.loadCurrentUserResult = throwError(() => new Error('Unauthorized'));

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    if (!isObservable(result)) {
      throw new Error('Expected the guard to return an Observable.');
    }

    const guardResult = await firstValueFrom(result);

    expect(authService.logoutCalled).toBe(true);
    expect(guardResult instanceof UrlTree).toBe(true);

    if (!(guardResult instanceof UrlTree)) {
      throw new Error('Expected the guard to return a UrlTree.');
    }

    expect(router.serializeUrl(guardResult)).toBe('/login?returnUrl=%2Fcocktails');
  });
});
