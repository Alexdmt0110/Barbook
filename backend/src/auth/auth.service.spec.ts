import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  const registerDto = {
    email: 'alex.test@barbook.local',
    password: 'une phrase de passe suffisamment longue',
    displayName: 'Alex',
  };

  const createdUser = {
    id: 'user-123',
    email: 'alex.test@barbook.local',
    displayName: 'Alex',
  };

  let userFindUnique: jest.Mock;
  let userCreate: jest.Mock;
  let workspaceCreate: jest.Mock;
  let workspaceMemberCreate: jest.Mock;
  let transaction: jest.Mock;

  let hashPassword: jest.Mock;
  let verifyPassword: jest.Mock;
  let signToken: jest.Mock;

  let service: AuthService;

  beforeEach(() => {
    userFindUnique = jest.fn();
    userCreate = jest.fn();
    workspaceCreate = jest.fn();
    workspaceMemberCreate = jest.fn();

    const transactionClient = {
      user: {
        create: userCreate,
      },
      workspace: {
        create: workspaceCreate,
      },
      workspaceMember: {
        create: workspaceMemberCreate,
      },
    };

    transaction = jest.fn(
      async (
        callback: (client: typeof transactionClient) => Promise<unknown>,
      ): Promise<unknown> => callback(transactionClient),
    );

    const prismaService = {
      user: {
        findUnique: userFindUnique,
      },
      $transaction: transaction,
    } as unknown as PrismaService;

    hashPassword = jest.fn();
    verifyPassword = jest.fn();

    const passwordService = {
      hash: hashPassword,
      verify: verifyPassword,
    } as unknown as PasswordService;

    signToken = jest.fn();

    const jwtService = {
      signAsync: signToken,
    } as unknown as JwtService;

    service = new AuthService(prismaService, passwordService, jwtService);
  });

  it('creates a user, a personal workspace and an owner membership when registering', async () => {
    userFindUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue('hashed-password');

    userCreate.mockResolvedValue(createdUser);

    workspaceCreate.mockResolvedValue({
      id: 'workspace-123',
    });

    workspaceMemberCreate.mockResolvedValue({
      workspaceId: 'workspace-123',
      userId: 'user-123',
      role: 'OWNER',
    });

    signToken.mockResolvedValue('access-token');

    const result = await service.register(registerDto);

    expect(userCreate).toHaveBeenCalledWith({
      data: {
        email: registerDto.email,
        passwordHash: 'hashed-password',
        displayName: registerDto.displayName,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    expect(workspaceCreate).toHaveBeenCalledWith({
      data: {
        name: 'Personal Barbook',
        kind: 'PERSONAL',
        personalOwnerId: createdUser.id,
      },
      select: {
        id: true,
      },
    });

    expect(workspaceMemberCreate).toHaveBeenCalledWith({
      data: {
        workspaceId: 'workspace-123',
        userId: createdUser.id,
        role: 'OWNER',
      },
    });

    expect(transaction).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      user: createdUser,
      accessToken: 'access-token',
    });

    expect(signToken).toHaveBeenCalledWith({
      sub: createdUser.id,
    });
  });

  it('rejects registration when the email already exists', async () => {
    userFindUnique.mockResolvedValue({
      id: 'existing-user',
    });

    await expect(service.register(registerDto)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(hashPassword).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('logs in a user with valid credentials', async () => {
    userFindUnique.mockResolvedValue({
      ...createdUser,
      passwordHash: 'stored-password-hash',
    });

    verifyPassword.mockResolvedValue(true);
    signToken.mockResolvedValue('access-token');

    const result = await service.login({
      email: registerDto.email,
      password: registerDto.password,
    });

    expect(verifyPassword).toHaveBeenCalledWith(
      'stored-password-hash',
      registerDto.password,
    );

    expect(result).toEqual({
      user: createdUser,
      accessToken: 'access-token',
    });

    expect(signToken).toHaveBeenCalledWith({
      sub: createdUser.id,
    });
  });

  it('performs password hashing before rejecting an unknown user', async () => {
    userFindUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue('discarded-password-hash');

    await expect(
      service.login({
        email: registerDto.email,
        password: registerDto.password,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(hashPassword).toHaveBeenCalledWith(registerDto.password);
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(signToken).not.toHaveBeenCalled();
  });

  it('rejects login when the password is incorrect', async () => {
    userFindUnique.mockResolvedValue({
      ...createdUser,
      passwordHash: 'stored-password-hash',
    });

    verifyPassword.mockResolvedValue(false);

    await expect(
      service.login({
        email: registerDto.email,
        password: registerDto.password,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(signToken).not.toHaveBeenCalled();
  });

  it('returns the authenticated user', async () => {
    userFindUnique.mockResolvedValue(createdUser);

    await expect(service.getCurrentUser(createdUser.id)).resolves.toEqual(
      createdUser,
    );

    expect(userFindUnique).toHaveBeenCalledWith({
      where: {
        id: createdUser.id,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });
  });

  it('rejects a token belonging to a deleted user', async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(service.getCurrentUser('deleted-user')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
