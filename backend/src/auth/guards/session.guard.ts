import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../authenticated-request';
import { WebSessionService } from '../sessions/web-session.service';

const SESSION_BOOTSTRAP = 'barbook:session-bootstrap';
export const SessionBootstrap = () => SetMetadata(SESSION_BOOTSTRAP, true);

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly web: WebSessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context
      .switchToHttp()
      .getResponse<{ setHeader(name: string, value: string): void }>();
    response.setHeader('Cache-Control', 'no-store');
    const bootstrap =
      this.reflector.get<boolean>(SESSION_BOOTSTRAP, context.getHandler()) ===
      true;
    const auth = await this.web.authenticate(request, bootstrap);
    request.auth = { sub: auth.user.id };
    request.sessionContext = auth;
    return true;
  }
}
