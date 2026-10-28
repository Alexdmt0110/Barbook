import { WorkspaceContext } from '../workspaces/workspace-context';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, map, throwError } from 'rxjs';
import { AUTH_SNAPSHOT } from './auth.models';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Only relative same-origin API URLs. Never attach context/CSRF externally.
  if (!request.url.startsWith('/api/')) return next(request);
  const auth = inject(AuthService);
  const epoch = auth.epoch();
  const workspace = inject(WorkspaceContext);
  const workspaceEpoch = workspace.epoch();
  const path = request.url.split('?')[0];
  const publicAuth = path === '/api/auth/login' || path === '/api/auth/register';
  const snapshot = request.context.has(AUTH_SNAPSHOT)
    ? request.context.get(AUTH_SNAPSHOT)
    : auth.snapshot();
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const personalBusiness = /^\/api\/(cocktails|folders|tags|ingredients)(\/|$)/.test(path);
  const business = personalBusiness || path.startsWith('/api/workspaces');
  if (personalBusiness && workspace.current()?.kind === 'SHARED')
    return throwError(() => new Error('La route personnelle est indisponible dans le carnet Bar.'));
  const release = business && unsafe ? workspace.trackMutation() : () => undefined;
  const headers: Record<string, string> = { 'X-Barbook-Request': '1' };
  if (!publicAuth && snapshot) {
    headers['X-Barbook-Expected-User'] = snapshot.user.id;
    headers['X-Barbook-Expected-Workspace'] = snapshot.workspaceId;
    if (unsafe) headers['X-Barbook-CSRF'] = snapshot.csrfToken;
  }
  return next(request.clone({ withCredentials: true, setHeaders: headers })).pipe(
    map((event) => {
      if (epoch !== auth.epoch()) throw new Error('La session a changé. Réponse abandonnée.');
      if (business && workspaceEpoch !== workspace.epoch())
        throw new Error('L’espace a changé. Réponse abandonnée.');
      return event;
    }),
    catchError((error: unknown) => {
      if (
        epoch === auth.epoch() &&
        !publicAuth &&
        path !== '/api/auth/logout' &&
        path !== '/api/auth/logout-all' &&
        error instanceof HttpErrorResponse &&
        (error.status === 401 ||
          (error.status === 409 && error.error?.code === 'AUTH_CONTEXT_CHANGED'))
      ) {
        auth.expire(error.error?.code === 'SESSION_REVOKED');
      }
      return throwError(() => error);
    }),
    finalize(release),
  );
};
