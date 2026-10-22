import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isPrismaKnownRequestError } from '../common/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import {
  Prisma,
  WorkspaceKind,
  WorkspaceRole,
} from '../generated/prisma/client';
import { RegistrationAdmissionPolicy } from './admission/registration-admission.policy';
import { AuthResponse, AuthenticatedUser } from './auth.types';
import { IssuedSession, SessionService } from './sessions/session.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';

export interface IssuedAuthentication extends IssuedSession {
  response: AuthResponse;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessions: SessionService,
    private readonly admission: RegistrationAdmissionPolicy,
  ) {}

  async register(
    dto: RegisterDto,
    previousCredential?: string,
  ): Promise<IssuedAuthentication> {
    this.admission.assertAllowed(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('An account already exists with this email.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const createdUser = await transaction.user.create({
            data: {
              email: dto.email,
              passwordHash,
              displayName: dto.displayName,
            },
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          });

          const personalWorkspace = await transaction.workspace.create({
            data: {
              name: 'Personal Barbook',
              kind: WorkspaceKind.PERSONAL,
              personalOwnerId: createdUser.id,
            },
            select: {
              id: true,
            },
          });

          await transaction.workspaceMember.create({
            data: {
              workspaceId: personalWorkspace.id,
              userId: createdUser.id,
              role: WorkspaceRole.OWNER,
            },
          });

          const issued = await this.sessions.create(
            transaction,
            createdUser.id,
          );
          await this.sessions.revoke(previousCredential, transaction);
          return this.describe(createdUser, personalWorkspace.id, issued);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error: unknown) {
      if (isPrismaKnownRequestError(error, 'P2002')) {
        throw new ConflictException(
          'An account already exists with this email.',
        );
      }

      throw error;
    }
  }

  async login(
    dto: LoginDto,
    previousCredential?: string,
  ): Promise<IssuedAuthentication> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
      },
    });

    if (!user) {
      await this.passwordService.hash(dto.password);

      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const issued = await this.sessions.create(
          transaction,
          user.id,
          dto.rememberMe === true,
        );
        const workspace = await transaction.workspace.findUnique({
          where: { personalOwnerId: user.id },
          select: { id: true },
        });
        if (!workspace) throw new UnauthorizedException('Account unavailable.');
        await this.sessions.revoke(previousCredential, transaction);
        return this.describe(user, workspace.id, issued);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async logoutAll(
    userId: string,
    credential: string,
    password: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (
      !user ||
      !(await this.passwordService.verify(user.passwordHash, password))
    ) {
      throw new UnauthorizedException({
        code: 'REAUTHENTICATION_FAILED',
        message: 'Password verification failed.',
      });
    }
    await this.prisma.$transaction(
      async (tx) => {
        await this.sessions.lockForGlobalRevocation(tx, userId, credential);
        // User remains locked: a password changed during Argon2 cannot authorize this action.
        const current = await tx.user.findUnique({
          where: { id: userId },
          select: { passwordHash: true },
        });
        if (current?.passwordHash !== user.passwordHash) {
          throw new UnauthorizedException({
            code: 'REAUTHENTICATION_FAILED',
            message: 'Password changed. Authenticate again.',
          });
        }
        await this.sessions.revokeAll(tx, userId);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  private describe(
    user: AuthenticatedUser,
    workspaceId: string,
    issued: IssuedSession,
  ): IssuedAuthentication {
    return {
      ...issued,
      response: {
        user: { id: user.id, email: user.email, displayName: user.displayName },
        workspaceId,
        csrfToken: issued.session.csrfToken,
      },
    };
  }
}
