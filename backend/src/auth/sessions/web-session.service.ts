import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { AuthResponse } from '../auth.types';
import { SessionService, SessionState } from './session.service';
import {
  assertExpectedSessionContext,
  assertSessionCsrf,
  assertTrustedBrowserRequest,
  parseSessionCookie,
  resolveWebSessionConfig,
} from './web-session-security';

/** HTTP authentication policy; business services retain resource authorization. */
@Injectable()
export class WebSessionService {
  readonly config;

  constructor(
    config: ConfigService,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {
    this.config = resolveWebSessionConfig(
      config.getOrThrow<string>('FRONTEND_ORIGIN'),
      config.get<string>('NODE_ENV', 'development'),
    );
  }

  credential(request: Request): string | undefined {
    assertTrustedBrowserRequest(this.config, request);
    const cookie = parseSessionCookie(request.headers.cookie, this.config);
    return cookie.state === 'valid' ? cookie.credential : undefined;
  }

  async authenticate(
    request: Request,
    bootstrap = false,
  ): Promise<AuthResponse> {
    const credential = this.credential(request);
    const session = await this.sessions.inspect(credential);
    if (!session) throw new UnauthorizedException('Authentication required.');
    const response = await this.describe(session);
    this.assertRequestContext(request, response, bootstrap);
    if (!(await this.sessions.authenticate(credential))) {
      throw new UnauthorizedException('Session expired or revoked.');
    }
    return response;
  }

  async logout(request: Request): Promise<void> {
    const credential = this.credential(request);
    const session = await this.sessions.inspect(credential);
    // An expired/revoked/missing cookie has no authority left to revoke.
    if (!session) return;
    this.assertRequestContext(request, await this.describe(session), false);
    await this.sessions.revoke(credential);
    // No Set-Cookie: a late logout response must not erase a newer login.
  }

  private assertRequestContext(
    request: Request,
    auth: AuthResponse,
    bootstrap: boolean,
  ): void {
    if (!bootstrap) {
      assertExpectedSessionContext(request.headers, {
        userId: auth.user.id,
        workspaceId: auth.workspaceId,
      });
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      assertSessionCsrf(auth.csrfToken, request.headers['x-barbook-csrf']);
    }
  }

  private async describe(session: SessionState): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        personalWorkspace: { select: { id: true } },
      },
    });
    if (!user?.personalWorkspace)
      throw new UnauthorizedException('Account unavailable.');
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName },
      workspaceId: user.personalWorkspace.id,
      csrfToken: session.csrfToken,
    };
  }
}
