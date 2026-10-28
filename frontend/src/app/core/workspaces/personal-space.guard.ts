import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WorkspaceContext } from './workspace-context';
export const personalSpaceGuard: CanActivateFn = () => {
  const context = inject(WorkspaceContext);
  if (context.current()?.kind === 'PERSONAL') return true;
  context.error.set(
    'Ce parcours est réservé au carnet Personnel. Aucun changement d’espace automatique n’a été effectué.',
  );
  return inject(Router).createUrlTree(['/cocktails']);
};
