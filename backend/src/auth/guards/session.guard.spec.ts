import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../authenticated-request';
import { WebSessionService } from '../sessions/web-session.service';
import { SessionBootstrap, SessionGuard } from './session.guard';

describe('SessionGuard', () => {
  const auth = {
    user: { id: 'A', email: 'qa@example.test', displayName: 'QA' },
    workspaceId: 'WA',
    csrfToken: 'csrf',
  };
  class Controller {
    @SessionBootstrap()
    me(this: void): void {}
    privateRoute(this: void): void {}
  }
  function fixture(bootstrap = false) {
    const request = { headers: {}, method: 'GET' } as AuthenticatedRequest;
    const response = { setHeader: jest.fn() };
    const authenticate = jest.fn().mockResolvedValue(auth);
    const guard = new SessionGuard(
      { authenticate } as unknown as WebSessionService,
      new Reflector(),
    );
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () =>
        bootstrap ? Controller.prototype.me : Controller.prototype.privateRoute,
    } as unknown as ExecutionContext;
    return { guard, context, request, response, authenticate };
  }
  it.each([false, true])(
    'marks only the explicitly decorated bootstrap route (%s)',
    async (bootstrap) => {
      const f = fixture(bootstrap);
      await expect(f.guard.canActivate(f.context)).resolves.toBe(true);
      expect(f.authenticate).toHaveBeenCalledWith(f.request, bootstrap);
      expect(f.request.auth).toEqual({ sub: 'A' });
      expect(f.request.sessionContext).toEqual(auth);
      expect(f.response.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store',
      );
    },
  );
  it('propagates authentication failures without setting identity', async () => {
    const f = fixture();
    f.authenticate.mockRejectedValue(new Error('expired'));
    await expect(f.guard.canActivate(f.context)).rejects.toThrow('expired');
    expect(f.request.auth).toBeUndefined();
  });
  it('does not disguise database unavailability as anonymous access', async () => {
    const f = fixture();
    const error = new Error('synthetic database outage');
    f.authenticate.mockRejectedValue(error);
    await expect(f.guard.canActivate(f.context)).rejects.toBe(error);
  });
});
