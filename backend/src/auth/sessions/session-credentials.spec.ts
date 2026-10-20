import {
  generateOpaqueToken,
  hashSessionCredential,
  isOpaqueToken,
} from './session-credentials';
import { sessionPolicy } from './session-policy';

describe('Session credential boundaries and approved policy', () => {
  it('generates independent canonical 256-bit session and CSRF values', () => {
    const values = Array.from({ length: 32 }, generateOpaqueToken);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(isOpaqueToken(value)).toBe(true);
      expect(Buffer.from(value, 'base64url')).toHaveLength(32);
      expect(hashSessionCredential(value)).toMatch(/^[0-9a-f]{64}$/);
      expect(hashSessionCredential(value)).not.toBe(value);
    }
    expect(isOpaqueToken(Buffer.alloc(32, 255).toString('base64url'))).toBe(
      true,
    );
  });

  it.each([
    undefined,
    null,
    42,
    {},
    [],
    '',
    'A'.repeat(42),
    'A'.repeat(44),
    'A'.repeat(10000),
    'A'.repeat(42) + '=',
    '/'.repeat(43),
    '+'.repeat(43),
    'A'.repeat(43) + '\n',
    ' ' + 'A'.repeat(43),
    // Nonzero unused padding bits decode to the same bytes as a valid token.
    'A'.repeat(42) + 'B',
  ])('rejects malformed or noncanonical credentials: %p', (value) => {
    expect(isOpaqueToken(value)).toBe(false);
  });

  it('uses the exact D2b durations with no persistent default', () => {
    expect(sessionPolicy(false)).toEqual({
      idleSeconds: 7200,
      absoluteSeconds: 43200,
    });
    expect(sessionPolicy(true)).toEqual({
      idleSeconds: 604800,
      absoluteSeconds: 2592000,
    });
  });
});
