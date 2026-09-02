import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const PUBLIC_AUTH_ENDPOINTS = new Set(['/api/auth/login', '/api/auth/register']);

/**
 * Ajoute le token aux requêtes API privées
 * et invalide centralement une session refusée
 * par le backend.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  const router = inject(Router);

  const accessToken = authService.getAccessToken();

  if (!accessToken || !isApiRequest(request.url) || isPublicAuthRequest(request.url)) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      /*
       * Pendant une restauration après
       * rechargement, un token peut exister
       * sans utilisateur encore chargé.
       *
       * Dans ce cas le guard connaît mieux
       * la destination demandée et réalisera
       * lui-même la redirection.
       */
      const shouldRedirect = authService.isAuthenticated();

      const returnUrl = router.url;

      authService.logout();

      if (shouldRedirect && !isAuthenticationPage(returnUrl)) {
        void router.navigate(['/login'], {
          queryParams: {
            returnUrl,
          },
        });
      }

      return throwError(() => error);
    }),
  );
};

function isApiRequest(url: string): boolean {
  return url.startsWith('/api/');
}

function isPublicAuthRequest(url: string): boolean {
  const [path] = url.split('?');

  return path !== undefined && PUBLIC_AUTH_ENDPOINTS.has(path);
}

function isAuthenticationPage(url: string): boolean {
  return (
    url === '/login' ||
    url.startsWith('/login?') ||
    url === '/register' ||
    url.startsWith('/register?')
  );
}
