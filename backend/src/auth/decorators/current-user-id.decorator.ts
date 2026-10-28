import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../authenticated-request';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.auth?.sub;

    if (!userId) {
      throw new UnauthorizedException('Authentication required.');
    }

    return userId;
  },
);
