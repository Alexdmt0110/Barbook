import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  const login = router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  return auth.loadCurrentUser().pipe(
    map(() => true),
    catchError(() => of(login)),
  );
};
