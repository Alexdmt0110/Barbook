import { BadRequestException, ConflictException } from '@nestjs/common';

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
