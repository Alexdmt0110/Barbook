import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes and verifies a password with Argon2id', async () => {
    const password = 'une phrase de passe suffisamment longue';

    const hash = await service.hash(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(service.verify(hash, password)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('une phrase de passe suffisamment longue');

    await expect(
      service.verify(hash, 'une autre phrase de passe suffisamment longue'),
    ).resolves.toBe(false);
  });
});
