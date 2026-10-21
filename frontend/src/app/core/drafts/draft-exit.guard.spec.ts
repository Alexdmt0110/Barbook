import { draftExitGuard } from './draft-exit.guard';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('draft exit during authentication teardown', () => {
  it('allows the route to leave when the gated outlet has already destroyed the form', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    expect(draftExitGuard(null, route, state, state)).toBe(true);
    expect(draftExitGuard({ canLeave: () => false }, route, state, state)).toBe(false);
  });
});
