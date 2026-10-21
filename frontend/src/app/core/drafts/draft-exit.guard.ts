import { CanDeactivateFn } from '@angular/router';
export interface DraftPage {
  canLeave(): boolean;
}
export const draftExitGuard: CanDeactivateFn<DraftPage | null> = (page) => page?.canLeave() ?? true;
