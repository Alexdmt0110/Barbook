import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  LOGIN_RATE_LIMIT,
  REGISTER_RATE_LIMIT,
} from '../common/rate-limit.config';
import { AuthService } from './auth.service';
import { AuthResponse, AuthenticatedUser } from './auth.types';
import { CurrentUserId } from './decorators/current-user-id.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({
    default: REGISTER_RATE_LIMIT,
  })
  async register(
    @Body()
    dto: RegisterDto,
  ): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: LOGIN_RATE_LIMIT,
  })
  async login(
    @Body()
    dto: LoginDto,
  ): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @CurrentUserId()
    userId: string,
  ): Promise<AuthenticatedUser> {
    return this.authService.getCurrentUser(userId);
  }
}
