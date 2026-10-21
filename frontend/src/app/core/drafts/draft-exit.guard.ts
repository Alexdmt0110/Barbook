import { CanDeactivateFn } from '@angular/router';
export interface DraftPage {
  canLeave(): boolean;
}
export const draftExitGuard: CanDeactivateFn<DraftPage> = (page) => page.canLeave();
