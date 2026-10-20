import { createHash, randomBytes } from 'node:crypto';

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Reject alternate encodings and unbounded input before hashing or querying. */
export function isOpaqueToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(value) &&
    Buffer.from(value, 'base64url').toString('base64url') === value
  );
}

export function hashSessionCredential(credential: string): string {
  return createHash('sha256').update(credential, 'ascii').digest('hex');
}
