import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  membershipToken,
  recipePreconditions,
  requireVersion,
} from './organization-preconditions';

describe('Client-owned organization preconditions', () => {
  it.each([undefined, null])('requires a supplied version: %s', (expected) => {
    expect(() => requireVersion(0, expected)).toThrow(ConflictException);
  });
  it.each([-1, 0.5, NaN, 2147483648])(
    'rejects a malformed supplied version: %s',
    (expected) => {
      expect(() => requireVersion(0, expected)).toThrow(BadRequestException);
    },
  );
  it('accepts exact zero and rejects stale values', () => {
    expect(() => requireVersion(0, 0)).not.toThrow();
    expect(() => requireVersion(1, 0)).toThrow(ConflictException);
  });
  it('requires exact coverage, rejects extras and case-normalized duplicates', () => {
    expect(() =>
      recipePreconditions(
        ['a', 'b'],
        [{ cocktailId: 'a', expectedVersion: 0 }],
      ),
    ).toThrow(ConflictException);
    expect(() =>
      recipePreconditions(['a'], [{ cocktailId: 'b', expectedVersion: 0 }]),
    ).toThrow(BadRequestException);
    expect(() =>
      recipePreconditions(
        ['a'],
        [
          { cocktailId: 'a', expectedVersion: 0 },
          { cocktailId: 'A', expectedVersion: 0 },
        ],
      ),
    ).toThrow(BadRequestException);
    expect(
      recipePreconditions(['a'], [{ cocktailId: 'A', expectedVersion: 7 }]).get(
        'a',
      ),
    ).toBe(7);
  });
  it('hashes the exact sorted set and detects every version change, including an ABA cycle', () => {
    const rows = [
      { id: 'b', organizationVersion: 2 },
      { id: 'a', organizationVersion: 0 },
    ];
    expect(membershipToken(rows)).toBe(membershipToken([...rows].reverse()));
    expect(membershipToken(rows)).toMatch(/^[a-f0-9]{64}$/);
    expect(membershipToken(rows)).not.toBe(
      membershipToken([{ ...rows[0], organizationVersion: 4 }, rows[1]]),
    );
    expect(membershipToken(rows)).not.toBe(membershipToken(rows.slice(1)));
  });
});
