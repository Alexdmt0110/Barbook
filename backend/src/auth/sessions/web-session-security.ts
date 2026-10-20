import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CookieOptions, Request, Response } from 'express';
import { IncomingHttpHeaders } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { isOpaqueToken } from './session-credentials';
import { PERSISTENT_SESSION } from './session-policy';

export interface WebSessionConfig {
  readonly origin: string;
  readonly secure: boolean;
  readonly cookieName: string;
}

export function resolveWebSessionConfig(
  origin: string,
  environment = 'development',
): Readonly<WebSessionConfig> {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('FRONTEND_ORIGIN must be an exact HTTP(S) origin.');
  }
  if (
    !['development', 'test', 'production'].includes(environment) ||
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.origin !== origin ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error('Web session environment or origin is invalid.');
  }
  const secure = environment === 'production';
  if (secure && parsed.protocol !== 'https:') {
    throw new Error('Production web sessions require an HTTPS origin.');
  }
  return Object.freeze({
    origin,
    secure,
    cookieName: secure ? '__Host-barbook-session' : 'barbook-session-dev',
  });
}

/** Called before credentials or stateful operations at the web boundary. */
export function assertTrustedBrowserRequest(
  config: WebSessionConfig,
  request: Pick<Request, 'method' | 'headers' | 'secure'>,
): void {
  if (config.secure && !request.secure) {
    throw new ServiceUnavailableException('A secure connection is required.');
  }
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const origin = request.headers.origin;
  if (
    request.headers['sec-fetch-site'] === 'cross-site' ||
    (origin !== undefined && origin !== config.origin) ||
    (unsafe &&
      (origin !== config.origin ||
        request.headers['x-barbook-request'] !== '1'))
  ) {
    throw new ForbiddenException({
      code: 'REQUEST_ORIGIN_REJECTED',
      message: 'Request origin verification failed.',
    });
  }
  const contentType = request.headers['content-type'];
  if (
    unsafe &&
    contentType &&
    !/^application\/json(?:\s*;.*)?$/i.test(contentType)
  ) {
    throw new ForbiddenException({
      code: 'REQUEST_CONTENT_REJECTED',
      message: 'JSON requests are required.',
    });
  }
}

export type SessionCookie =
  | { state: 'missing' }
  | { state: 'invalid' }
  | { state: 'valid'; credential: string };

/** Opaque base64url needs no decoding; reject ambiguous duplicate cookies. */
export function parseSessionCookie(
  header: string | undefined,
  config: WebSessionConfig,
): SessionCookie {
  if (header === undefined) return { state: 'missing' };
  if (header.length > 8192) return { state: 'invalid' };
  const values: string[] = [];
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== config.cookieName)
      continue;
    values.push(part.slice(separator + 1).trim());
  }
  if (values.length === 0) return { state: 'missing' };
  if (values.length !== 1 || !isOpaqueToken(values[0]))
    return { state: 'invalid' };
  return { state: 'valid', credential: values[0] };
}

function cookieOptions(config: WebSessionConfig): CookieOptions {
  return { httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/' };
}

export function issueSessionCookie(
  response: Response,
  config: WebSessionConfig,
  credential: string,
  persistent: boolean,
): void {
  if (!isOpaqueToken(credential))
    throw new Error('Invalid internal session credential.');
  response.setHeader('Cache-Control', 'no-store');
  response.cookie(config.cookieName, credential, {
    ...cookieOptions(config),
    ...(persistent
      ? { maxAge: PERSISTENT_SESSION.absoluteSeconds * 1000 }
      : {}),
  });
}

export function clearSessionCookie(
  response: Response,
  config: WebSessionConfig,
): void {
  response.setHeader('Cache-Control', 'no-store');
  response.clearCookie(config.cookieName, cookieOptions(config));
}

export function assertSessionCsrf(expected: string, received: unknown): void {
  if (
    !isOpaqueToken(expected) ||
    !isOpaqueToken(received) ||
    !timingSafeEqual(
      Buffer.from(expected, 'ascii'),
      Buffer.from(received, 'ascii'),
    )
  ) {
    throw new ForbiddenException({
      code: 'CSRF_REJECTED',
      message: 'Request verification failed.',
    });
  }
}

/** Expected context is a consistency precondition, never a grant of rights. */
export function assertExpectedSessionContext(
  headers: IncomingHttpHeaders,
  actual: { userId: string; workspaceId: string },
): void {
  if (
    headers['x-barbook-expected-user'] !== actual.userId ||
    headers['x-barbook-expected-workspace'] !== actual.workspaceId
  ) {
    throw new ConflictException({
      code: 'AUTH_CONTEXT_CHANGED',
      message: 'Account or workspace changed.',
    });
  }
}
