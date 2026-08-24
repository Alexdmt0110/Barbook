import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  Prisma,
  WorkspaceKind,
  WorkspaceRole,
} from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthResponse, AuthenticatedUser, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
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

    let user: AuthenticatedUser;

    try {
      user = await this.prisma.$transaction(async (transaction) => {
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

        return createdUser;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account already exists with this email.',
        );
      }

      throw error;
    }

    return this.createAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
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

    return this.createAuthResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  }

  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    return user;
  }

  private async createAuthResponse(
    user: AuthenticatedUser,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      user,
      accessToken,
    };
  }
}
