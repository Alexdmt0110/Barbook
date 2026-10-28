import { hours, minutes } from '@nestjs/throttler';

export const DEFAULT_RATE_LIMIT = {
  limit: 120,
  ttl: minutes(1),
} as const;

export const LOGIN_RATE_LIMIT = {
  limit: 10,
  ttl: minutes(1),
  blockDuration: minutes(5),
} as const;

export const REGISTER_RATE_LIMIT = {
  limit: 5,
  ttl: hours(1),
  blockDuration: hours(1),
} as const;
