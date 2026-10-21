import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('cookie authGuard', () => {
  let authenticated: boolean;
  let load: ReturnType<typeof vi.fn>;
  const state = { url: '/cocktails' } as RouterStateSnapshot;
  beforeEach(() => {
    authenticated = false;
    load = vi.fn(() => of({ user: { id: 'A' } }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => authenticated,
            loadCurrentUser: load,
          },
        },
      ],
    });
  });
  it('allows a verified session without another bootstrap', () => {
    authenticated = true;
    expect(
      TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state)),
    ).toBe(true);
    expect(load).not.toHaveBeenCalled();
  });
  it('restores from the HttpOnly cookie without requiring browser storage', async () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, state),
    );
    if (!isObservable(result)) throw new Error('Expected bootstrap');
    expect(await firstValueFrom(result)).toBe(true);
    expect(load).toHaveBeenCalledOnce();
  });
  it.each(['Unauthorized', 'Unavailable'])(
    'returns a controlled login route for %s without server logout',
    async (message) => {
      load.mockReturnValue(throwError(() => new Error(message)));
      const result = TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, state),
      );
      if (!isObservable(result)) throw new Error('Expected bootstrap');
      const route = await firstValueFrom(result);
      expect(route).toBeInstanceOf(UrlTree);
      expect(TestBed.inject(Router).serializeUrl(route as UrlTree)).toBe(
        '/login?returnUrl=%2Fcocktails',
      );
    },
  );
});
