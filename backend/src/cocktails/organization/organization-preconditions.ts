import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export interface ExpectedRecipeVersion {
  cocktailId: string;
  expectedVersion?: number | null;
}

// Keep the historical recipe import path compatible. The validation is domain independent.
export {
  requireVersion,
  requireVersionCapacity,
} from '../../common/version-preconditions';

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
