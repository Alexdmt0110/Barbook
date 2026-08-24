import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from '../authenticated-request';
import { JwtAuthGuard } from './jwt-auth.guard';

function createExecutionContext(authorization?: string): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
} {
  const request = {
    headers: authorization
      ? {
          authorization,
        }
      : {},
  } as AuthenticatedRequest;

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;

  return {
    context,
    request,
  };
}

describe('JwtAuthGuard', () => {
  let jwtService: JwtService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwtService = new JwtService({
      secret: 'test-jwt-secret',
      signOptions: {
        expiresIn: 60,
      },
    });

    guard = new JwtAuthGuard(jwtService);
  });

  it('accepts a valid bearer token', async () => {
    const token = await jwtService.signAsync({
      sub: 'user-123',
    });

    const { context, request } = createExecutionContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.auth).toEqual(
      expect.objectContaining({
        sub: 'user-123',
      }),
    );
  });

  it('rejects a request without an authorization header', async () => {
    const { context } = createExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Authentication required.',
    );
  });

  it('rejects a malformed authorization header', async () => {
    const { context } = createExecutionContext('Basic abcdef');

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Authentication required.',
    );
  });

  it('rejects an invalid bearer token', async () => {
    const { context } = createExecutionContext('Bearer ceci-est-un-faux-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired access token.',
    );
  });

  it('rejects a token without a valid subject', async () => {
    const token = await jwtService.signAsync({
      value: 'missing-subject',
    });

    const { context } = createExecutionContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired access token.',
    );
  });
});
