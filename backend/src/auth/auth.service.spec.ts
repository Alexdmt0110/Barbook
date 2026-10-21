import { ConfigService } from '@nestjs/config';
import { RegistrationAdmissionPolicy } from './admission/registration-admission.policy';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { AuthService } from './auth.service';
import { SessionService } from './sessions/session.service';

describe('AuthService session transactions', () => {
  const dto = {
    email: 'qa@example.test',
    password: 'Synthetic password long enough',
    displayName: 'QA',
  };
  const user = { id: 'user', email: dto.email, displayName: dto.displayName };
  const issued = {
    credential: 'internal-credential',
    session: { csrfToken: 'csrf', persistent: false },
  };
  let service: AuthService;
  let findUser: jest.Mock;
  let createUser: jest.Mock;
  let createWorkspace: jest.Mock;
  let createMember: jest.Mock;
  let createSession: jest.Mock;
  let revoke: jest.Mock;
  let hash: jest.Mock;
  let verify: jest.Mock;
  let transaction: jest.Mock;
  let tx: object;
  beforeEach(() => {
    findUser = jest.fn().mockResolvedValue(null);
    createUser = jest.fn().mockResolvedValue(user);
    createWorkspace = jest.fn().mockResolvedValue({ id: 'workspace' });
    createMember = jest.fn();
    createSession = jest.fn().mockResolvedValue(issued);
    revoke = jest.fn();
    hash = jest.fn().mockResolvedValue('hash');
    verify = jest.fn().mockResolvedValue(true);
    tx = {
      user: { create: createUser },
      workspace: { create: createWorkspace, findUnique: createWorkspace },
      workspaceMember: { create: createMember },
    };
    transaction = jest.fn(async (fn: (client: object) => Promise<unknown>) =>
      fn(tx),
    );
    service = new AuthService(
      {
        user: { findUnique: findUser },
        $transaction: transaction,
      } as unknown as PrismaService,
      { hash, verify },
      { create: createSession, revoke } as unknown as SessionService,
      new RegistrationAdmissionPolicy(
        new ConfigService({ REGISTRATION_ALLOWED_EMAILS: dto.email }),
      ),
    );
  });
  it('rejects a non-admitted email before lookup, hash or transaction', async () => {
    await expect(
      service.register({ ...dto, email: 'unlisted@example.test' }),
    ).rejects.toMatchObject({
      response: { code: 'REGISTRATION_NOT_ALLOWED' },
    });
    expect(findUser).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });
  it('creates account, workspace, OWNER and session in the same ReadCommitted transaction', async () => {
    const result = await service.register(dto, 'old');
    expect(createUser).toHaveBeenCalledWith({
      data: {
        email: dto.email,
        passwordHash: 'hash',
        displayName: dto.displayName,
      },
      select: { id: true, email: true, displayName: true },
    });
    expect(createWorkspace).toHaveBeenCalledWith({
      data: {
        name: 'Personal Barbook',
        kind: 'PERSONAL',
        personalOwnerId: user.id,
      },
      select: { id: true },
    });
    expect(createMember).toHaveBeenCalledWith({
      data: { workspaceId: 'workspace', userId: user.id, role: 'OWNER' },
    });
    expect(createSession).toHaveBeenCalledWith(tx, user.id);
    expect(revoke).toHaveBeenCalledWith('old', tx);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'ReadCommitted',
    });
    expect(result).toEqual({
      ...issued,
      response: { user, workspaceId: 'workspace', csrfToken: 'csrf' },
    });
    expect(result.response).not.toHaveProperty('credential');
    expect(result.response).not.toHaveProperty('accessToken');
  });
  it('rejects an existing account before hashing or transaction', async () => {
    findUser.mockResolvedValue(user);
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(hash).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
  it('maps concurrent uniqueness failure to conflict', async () => {
    const error = Object.create(
      Prisma.PrismaClientKnownRequestError.prototype,
    ) as Prisma.PrismaClientKnownRequestError;
    Object.defineProperty(error, 'code', { value: 'P2002' });
    transaction.mockRejectedValue(error);
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('propagates session failure so the caller transaction rolls back', async () => {
    createSession.mockRejectedValue(new Error('store failed'));
    await expect(service.register(dto)).rejects.toThrow('store failed');
    expect(revoke).not.toHaveBeenCalled();
  });
  it.each([undefined, false, true])(
    'logs in with explicit persistence %s and rotates the previous credential',
    async (rememberMe) => {
      findUser.mockResolvedValue({ ...user, passwordHash: 'hash' });
      const result = await service.login({ ...dto, rememberMe }, 'old');
      expect(verify).toHaveBeenCalledWith('hash', dto.password);
      expect(createSession).toHaveBeenCalledWith(
        tx,
        user.id,
        rememberMe === true,
      );
      expect(revoke).toHaveBeenCalledWith('old', tx);
      expect(result.response.user).toEqual(user);
      expect(result.response.user).not.toHaveProperty('passwordHash');
    },
  );
  it('hashes the supplied password before rejecting an unknown user', async () => {
    await expect(service.login(dto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(hash).toHaveBeenCalledWith(dto.password);
    expect(verify).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });
  it('rejects an incorrect password without issuing a session', async () => {
    findUser.mockResolvedValue({ ...user, passwordHash: 'hash' });
    verify.mockResolvedValue(false);
    await expect(service.login(dto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(createSession).not.toHaveBeenCalled();
  });
});
