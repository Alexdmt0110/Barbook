import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from './password.service';
import { SessionService } from './sessions/session.service';
import { RegistrationAdmissionPolicy } from './admission/registration-admission.policy';

describe('Reauthenticated global logout', () => {
  let service: AuthService;
  let verify: jest.Mock;
  let lock: jest.Mock;
  let revokeAll: jest.Mock;
  let transaction: jest.Mock;
  let current: jest.Mock;
  let lookup: jest.Mock;
  beforeEach(() => {
    lookup = jest.fn().mockResolvedValue({ passwordHash: 'hash' });
    current = jest.fn().mockResolvedValue({ passwordHash: 'hash' });
    verify = jest.fn().mockResolvedValue(true);
    lock = jest.fn();
    revokeAll = jest.fn();
    transaction = jest.fn(async (fn: (tx: object) => Promise<unknown>) =>
      fn({ user: { findUnique: current } }),
    );
    service = new AuthService(
      {
        user: { findUnique: lookup },
        $transaction: transaction,
      } as unknown as PrismaService,
      { verify } as unknown as PasswordService,
      { lockForGlobalRevocation: lock, revokeAll } as unknown as SessionService,
      {} as RegistrationAdmissionPolicy,
    );
  });
  it('verifies before the transaction and rechecks locked session and current password before revokeAll', async () => {
    await service.logoutAll('A', 'cookie', 'password');
    expect(lookup).toHaveBeenCalledWith({
      where: { id: 'A' },
      select: { passwordHash: true },
    });
    expect(verify).toHaveBeenCalledWith('hash', 'password');
    expect(verify.mock.invocationCallOrder[0]).toBeLessThan(
      transaction.mock.invocationCallOrder[0],
    );
    expect(lock).toHaveBeenCalledWith(expect.anything(), 'A', 'cookie');
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(
      current.mock.invocationCallOrder[0],
    );
    expect(current.mock.invocationCallOrder[0]).toBeLessThan(
      revokeAll.mock.invocationCallOrder[0],
    );
    expect(revokeAll).toHaveBeenCalledWith(expect.anything(), 'A');
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'ReadCommitted',
    });
  });
  it.each(['missing', 'incorrect'])(
    'rejects %s reauthentication without a transaction',
    async (mode) => {
      if (mode === 'missing') lookup.mockResolvedValue(null);
      else verify.mockResolvedValue(false);
      await expect(
        service.logoutAll('A', 'cookie', 'wrong'),
      ).rejects.toMatchObject({
        response: { code: 'REAUTHENTICATION_FAILED' },
      });
      expect(transaction).not.toHaveBeenCalled();
      expect(revokeAll).not.toHaveBeenCalled();
    },
  );
  it('propagates revoked/expired credential failure without global revocation', async () => {
    lock.mockRejectedValue(new Error('credential lost authority'));
    await expect(service.logoutAll('A', 'old', 'password')).rejects.toThrow(
      'credential lost authority',
    );
    expect(revokeAll).not.toHaveBeenCalled();
    expect(current).not.toHaveBeenCalled();
  });
  it('rolls back if the password changed while verification was in flight', async () => {
    current.mockResolvedValue({ passwordHash: 'changed' });
    await expect(
      service.logoutAll('A', 'cookie', 'password'),
    ).rejects.toMatchObject({ response: { code: 'REAUTHENTICATION_FAILED' } });
    expect(revokeAll).not.toHaveBeenCalled();
  });
  it('propagates storage failure instead of claiming success', async () => {
    revokeAll.mockRejectedValue(new Error('database failed'));
    await expect(service.logoutAll('A', 'cookie', 'password')).rejects.toThrow(
      'database failed',
    );
  });
});
