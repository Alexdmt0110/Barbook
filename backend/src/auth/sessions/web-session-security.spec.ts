import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Request, Response } from 'express';
import * as request from 'supertest';
import {
  assertExpectedSessionContext,
  assertSessionCsrf,
  assertTrustedBrowserRequest,
  clearSessionCookie,
  issueSessionCookie,
  parseSessionCookie,
  resolveWebSessionConfig,
  WebSessionConfig,
} from './web-session-security';

const CONFIG = Symbol('synthetic web boundary config');
const credential = 'A'.repeat(43);
const csrf = 'B'.repeat(42) + 'A';
const actual = { userId: 'synthetic-user', workspaceId: 'synthetic-workspace' };
const origin = 'http://127.0.0.1:4200';
const validHeaders = {
  Origin: origin,
  'X-Barbook-Request': '1',
  'X-Barbook-CSRF': csrf,
  'X-Barbook-Expected-User': actual.userId,
  'X-Barbook-Expected-Workspace': actual.workspaceId,
};

function responseCookies(response: request.Response): string[] {
  const value: unknown = response.headers['set-cookie'];
  if (!Array.isArray(value)) throw new Error('Expected Set-Cookie headers.');
  return value.map((entry: unknown) => {
    if (typeof entry !== 'string')
      throw new Error('Invalid Set-Cookie header.');
    return entry;
  });
}

/** Test-only probe: proves helpers on real HTTP, not the application's auth wiring. */
@Controller('probe')
class BoundaryProbe {
  private effects = 0;
  constructor(@Inject(CONFIG) private readonly config: WebSessionConfig) {}

  @Post('session')
  save(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: { persistent?: boolean },
  ): void {
    assertTrustedBrowserRequest(this.config, req);
    assertExpectedSessionContext(req.headers, actual);
    assertSessionCsrf(csrf, req.headers['x-barbook-csrf']);
    this.effects += 1;
    issueSessionCookie(res, this.config, credential, body.persistent === true);
    res.json({ ok: true });
  }

  @Delete('session')
  logout(@Req() req: Request, @Res() res: Response): void {
    assertTrustedBrowserRequest(this.config, req);
    assertExpectedSessionContext(req.headers, actual);
    assertSessionCsrf(csrf, req.headers['x-barbook-csrf']);
    clearSessionCookie(res, this.config);
    res.status(204).send();
  }

  @Get('cookie')
  cookie(@Req() req: Request): { state: string } {
    assertTrustedBrowserRequest(this.config, req);
    return { state: parseSessionCookie(req.headers.cookie, this.config).state };
  }

  @Get('effects')
  count(): { effects: number } {
    return { effects: this.effects };
  }
}

async function application(
  config: WebSessionConfig,
): Promise<NestExpressApplication> {
  const module = await Test.createTestingModule({
    controllers: [BoundaryProbe],
    providers: [{ provide: CONFIG, useValue: config }],
  }).compile();
  const app = module.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  app.set('trust proxy', 1);
  await app.init();
  return app;
}

describe('Prepared web session boundary (not active routes yet)', () => {
  let app: NestExpressApplication;
  let production: NestExpressApplication;
  beforeAll(async () => {
    app = await application(resolveWebSessionConfig(origin, 'test'));
    production = await application(
      resolveWebSessionConfig('https://barbook.example', 'production'),
    );
  });
  afterAll(async () => {
    await app?.close();
    await production?.close();
  });

  it.each([
    ['', 'production'],
    ['not a URL', 'test'],
    ['null', 'test'],
    ['https://barbook.example/', 'production'],
    ['https://barbook.example/path', 'production'],
    ['https://barbook.example?query', 'production'],
    ['https://barbook.example#fragment', 'production'],
    ['https://user:password@barbook.example', 'production'],
    ['file:///tmp/site', 'test'],
    [origin, 'production'],
    [origin, 'prod'],
  ])('rejects unsafe configuration %s / %s', (url, mode) => {
    expect(() => resolveWebSessionConfig(url, mode)).toThrow();
  });

  it('serializes standard and persistent cookies without exposing the credential in JSON', async () => {
    for (const persistent of [false, true]) {
      const result = await request(app.getHttpServer())
        .post('/probe/session')
        .set(validHeaders)
        .send({ persistent })
        .expect(201);
      const cookies = responseCookies(result);
      expect(cookies).toHaveLength(1);
      expect(cookies[0]).toContain(`barbook-session-dev=${credential};`);
      for (const attribute of ['Path=/', 'HttpOnly', 'SameSite=Lax'])
        expect(cookies[0]).toContain(attribute);
      expect(cookies[0]).not.toContain('Domain=');
      expect(cookies[0]).not.toContain('Secure');
      expect(result.text).not.toContain(credential);
      expect(result.headers['cache-control']).toBe('no-store');
      if (persistent) expect(cookies[0]).toContain('Max-Age=2592000');
      else {
        expect(cookies[0]).not.toContain('Max-Age');
        expect(cookies[0]).not.toContain('Expires');
      }
    }
  });

  it('requires secure production transport and emits the Host cookie attributes', async () => {
    const api = request(production.getHttpServer());
    const headers = { ...validHeaders, Origin: 'https://barbook.example' };
    await api.post('/probe/session').set(headers).send({}).expect(503);
    const response = await api
      .post('/probe/session')
      .set(headers)
      .set('X-Forwarded-Proto', 'https')
      .send({})
      .expect(201);
    const cookie = responseCookies(response)[0];
    expect(cookie).toContain(`__Host-barbook-session=${credential};`);
    expect(cookie).toContain('Path=/; HttpOnly; Secure; SameSite=Lax');
    expect(cookie).not.toContain('Domain=');
    const cleared = await api
      .delete('/probe/session')
      .set(headers)
      .set('X-Forwarded-Proto', 'https')
      .expect(204);
    const deletion = responseCookies(cleared)[0];
    expect(cleared.headers['cache-control']).toBe('no-store');
    expect(deletion).toContain('__Host-barbook-session=;');
    expect(deletion).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    expect(deletion).toContain('Path=/; Expires=');
    expect(deletion).toContain('HttpOnly; Secure; SameSite=Lax');
    expect(deletion).not.toContain('Domain=');
    expect(deletion).not.toContain('Max-Age');
  });

  it.each([
    ['Origin', undefined],
    ['Origin', 'null'],
    ['Origin', 'https://evil.example'],
    ['Origin', origin + '/'],
    ['Origin', 'http://127.0.0.1:4200.evil.example'],
    ['X-Barbook-Request', undefined],
    ['X-Barbook-Request', '0'],
    ['Sec-Fetch-Site', 'cross-site'],
    ['X-Barbook-CSRF', undefined],
    ['X-Barbook-CSRF', credential],
    ['X-Barbook-CSRF', 'short'],
    ['X-Barbook-CSRF', csrf + '='],
  ])('rejects hostile %s=%s before effects', async (header, value) => {
    const before = await request(app.getHttpServer())
      .get('/probe/effects')
      .expect(200);
    const headers: Record<string, string> = { ...validHeaders };
    if (value === undefined) delete headers[header];
    else headers[header] = value;
    await request(app.getHttpServer())
      .post('/probe/session')
      .set(headers)
      .send({})
      .expect(403);
    const after = await request(app.getHttpServer())
      .get('/probe/effects')
      .expect(200);
    expect(after.body as unknown).toEqual(before.body as unknown);
  });

  it.each([
    'text/plain',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
  ])('rejects simple content %s before effects', async (type) => {
    await request(app.getHttpServer())
      .post('/probe/session')
      .set(validHeaders)
      .set('Content-Type', type)
      .send('persistent=true')
      .expect(403);
  });

  it.each([
    ['X-Barbook-Expected-User', undefined],
    ['X-Barbook-Expected-User', 'other-user'],
    ['X-Barbook-Expected-Workspace', undefined],
    ['X-Barbook-Expected-Workspace', 'other-workspace'],
  ])(
    'refuses missing/changed context %s=%s before effects',
    async (header, value) => {
      const before = await request(app.getHttpServer()).get('/probe/effects');
      const headers: Record<string, string> = { ...validHeaders };
      if (value === undefined) delete headers[header];
      else headers[header] = value;
      const response = await request(app.getHttpServer())
        .post('/probe/session')
        .set(headers)
        .send({})
        .expect(409);
      expect(response.body as unknown).toMatchObject({
        code: 'AUTH_CONTEXT_CHANGED',
      });
      const after = await request(app.getHttpServer()).get('/probe/effects');
      expect(after.body as unknown).toEqual(before.body as unknown);
    },
  );

  it.each([
    [undefined, 'missing'],
    ['unrelated=value', 'missing'],
    [`barbook-session-dev=${credential}`, 'valid'],
    [`unrelated=value; barbook-session-dev=${credential}; other=1`, 'valid'],
    [
      `barbook-session-dev=${credential}; barbook-session-dev=${credential}`,
      'invalid',
    ],
    [`barbook-session-dev=${credential}; barbook-session-dev=bad`, 'invalid'],
    [`barbook-session-dev=${credential}%3D`, 'invalid'],
    ['barbook-session-dev=' + 'A'.repeat(42) + 'B', 'invalid'],
    ['barbook-session-dev=bad', 'invalid'],
    ['barbook-session-dev=', 'invalid'],
    ['unrelated=' + 'x'.repeat(8192), 'invalid'],
  ])(
    'parses only one canonical bounded cookie (case %#)',
    async (cookie, expected) => {
      // Oversized header is below Node's limit but above our boundary limit.
      const query = request(app.getHttpServer()).get('/probe/cookie');
      if (cookie !== undefined) query.set('Cookie', cookie);
      const response = await query.expect(200);
      expect(response.body as unknown).toEqual({ state: expected });
      expect(response.text).not.toContain(credential);
    },
  );

  it('does not accept a Host cookie under the development name or vice versa', () => {
    const productionConfig = resolveWebSessionConfig(
      'https://barbook.example',
      'production',
    );
    expect(
      parseSessionCookie(`barbook-session-dev=${credential}`, productionConfig),
    ).toEqual({ state: 'missing' });
    expect(
      parseSessionCookie(
        `__Host-barbook-session=${credential}`,
        resolveWebSessionConfig(origin),
      ),
    ).toEqual({ state: 'missing' });
  });
});
