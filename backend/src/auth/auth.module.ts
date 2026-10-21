import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './guards/session.guard';
import { PasswordService } from './password.service';
import { SessionService } from './sessions/session.service';
import { WebSessionService } from './sessions/web-session.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionGuard,
    SessionService,
    WebSessionService,
  ],
  exports: [SessionGuard, WebSessionService],
})
export class AuthModule {}
