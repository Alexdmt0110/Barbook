import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from '../authenticated-request';
import { JwtPayload } from '../auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new UnauthorizedException('Invalid or expired access token.');
      }

      request.auth = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }

  private extractBearerToken(
    request: AuthenticatedRequest,
  ): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    const [type, token, ...remainingParts] = authorization.trim().split(/\s+/);

    if (
      type?.toLowerCase() !== 'bearer' ||
      !token ||
      remainingParts.length > 0
    ) {
      return undefined;
    }

    return token;
  }
}
