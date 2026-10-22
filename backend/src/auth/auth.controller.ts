import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import {
  LOGIN_RATE_LIMIT,
  REGISTER_RATE_LIMIT,
} from '../common/rate-limit.config';
import { AuthService, IssuedAuthentication } from './auth.service';
import { AuthResponse } from './auth.types';
import { AuthenticatedRequest } from './authenticated-request';
import { LogoutAllDto } from './dto/logout-all.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionBootstrap, SessionGuard } from './guards/session.guard';
import { issueSessionCookie } from './sessions/web-session-security';
import { WebSessionService } from './sessions/web-session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly web: WebSessionService,
  ) {}

  @Post('register')
  @Throttle({ default: REGISTER_RATE_LIMIT })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    response.setHeader('Cache-Control', 'no-store');
    return this.issue(
      response,
      await this.authService.register(dto, this.web.credential(request)),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: LOGIN_RATE_LIMIT })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    response.setHeader('Cache-Control', 'no-store');
    return this.issue(
      response,
      await this.authService.login(dto, this.web.credential(request)),
    );
  }

  @Get('me')
  @SessionBootstrap()
  @UseGuards(SessionGuard)
  me(@Req() request: AuthenticatedRequest): AuthResponse | undefined {
    return request.sessionContext;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    await this.web.logout(request);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: LOGIN_RATE_LIMIT })
  async logoutAll(
    @Body() dto: LogoutAllDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    const context = await this.web.globalLogoutContext(request);
    await this.authService.logoutAll(
      context.userId,
      context.credential,
      dto.password,
    );
  }

  private issue(
    response: Response,
    issued: IssuedAuthentication,
  ): AuthResponse {
    issueSessionCookie(
      response,
      this.web.config,
      issued.credential,
      issued.session.persistent,
    );
    return issued.response;
  }
}
