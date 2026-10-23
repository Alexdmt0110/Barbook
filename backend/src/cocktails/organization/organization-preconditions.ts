import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export interface ExpectedRecipeVersion {
  cocktailId: string;
  expectedVersion?: number | null;
}

export function requireVersion(actual: number, expected?: number | null): void {
  if (expected == null)
    throw new ConflictException('A version precondition is required.');
  if (!Number.isSafeInteger(expected) || expected < 0 || expected > 2147483647)
    throw new BadRequestException('Invalid version precondition.');
  if (actual !== expected)
    throw new ConflictException(
      'The resource has changed. Reload before continuing.',
    );
}

export function requireVersionCapacity(version: number): void {
  if (version >= 2147483647)
    throw new ConflictException(
      'Version capacity reached. No change was saved.',
    );
}

/** Exact coverage: never replace a missing client version with a fresh server value. */
export function recipePreconditions(
  ids: readonly string[],
  expected?: readonly ExpectedRecipeVersion[] | null,
): Map<string, number | null | undefined> {
  if (expected == null)
    throw new ConflictException('Recipe version preconditions are required.');
  const versions = new Map<string, number | null | undefined>();
  for (const item of expected) {
    const id = item.cocktailId.toLowerCase();
    if (!ids.includes(id) || versions.has(id))
      throw new BadRequestException('Ambiguous recipe version preconditions.');
    versions.set(id, item.expectedVersion);
  }
  if (ids.some((id) => !versions.has(id)))
    throw new ConflictException(
      'Every recipe requires a version precondition.',
    );
  return versions;
}

export function membershipToken(
  recipes: readonly { id: string; organizationVersion: number }[],
): string {
  const pairs = recipes
    .map(({ id, organizationVersion }) => [id, organizationVersion] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return createHash('sha256').update(JSON.stringify(pairs)).digest('hex');
}
