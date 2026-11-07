import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AddressInfo } from 'node:net';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { frontendDelivery } from '../src/delivery/frontend-delivery';
import { resolveListener } from '../src/delivery/listener-config';
import { requireTestDatabase } from './helpers/test-database';
import { FIXTURE_PASSWORD } from './helpers/application-fixture';
import { AuthResponse } from '../src/auth/auth.types';

describe('Production single-origin release with real PostgreSQL', () => {
  const origin = 'https://barbook.synthetic.ts.net';
  const email = `release-${randomUUID()}@example.test`;
  const root = mkdtempSync(join(tmpdir(), 'barbook-release-'));
  let app: NestExpressApplication;
  beforeAll(async () => {
    requireTestDatabase();
    writeFileSync(
      join(root, 'index.html'),
      '<!doctype html><title>Release fixture</title>',
    );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          ...process.env,
          NODE_ENV: 'production',
          FRONTEND_ORIGIN: origin,
          REGISTRATION_ALLOWED_EMAILS: email,
        }),
      )
      .compile();
    app = module.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    configureApplication(app);
    app.use(frontendDelivery(root));
    const listener = resolveListener(undefined, undefined);
    await app.listen(0, listener.host);
  });
  afterAll(async () => {
    await app?.close();
    rmSync(root, { recursive: true, force: true });
  });
  it('binds only loopback, preserves HTTPS cookies, CSRF, CORS and API errors', async () => {
    expect((app.getHttpServer().address() as AddressInfo).address).toBe(
      '127.0.0.1',
    );
    const api = () => request(app.getHttpServer());
    await api().get('/cocktails/deep/edit').accept('html').expect(200);
    const missing = await api()
      .get('/api/not-a-route')
      .accept('html')
      .expect(404);
    expect(missing.headers['content-type']).toContain('json');
    await api().get('/api/auth/me').set('Origin', origin).expect(503);
    const registered = await api()
      .post('/api/auth/register')
      .set({
        Origin: origin,
        'X-Forwarded-Proto': 'https',
        'X-Barbook-Request': '1',
      })
      .send({
        email,
        password: FIXTURE_PASSWORD,
        displayName: 'Release fixture',
      })
      .expect(201);
    const cookies = registered.headers['set-cookie'] as unknown as string[];
    const cookie = cookies.find((value) =>
      value.startsWith('__Host-barbook-session='),
    )!;
    expect(cookie).toContain('; Secure');
    expect(cookie).toContain('; HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toMatch(/Domain=/i);
    expect(registered.headers['access-control-allow-origin']).toBe(origin);
    expect(registered.headers['cache-control']).toBe('no-store');
    const auth = registered.body as AuthResponse;
    const headers = {
      Origin: origin,
      'X-Forwarded-Proto': 'https',
      'X-Barbook-Request': '1',
      Cookie: cookie.split(';')[0],
      'X-Barbook-Expected-User': auth.user.id,
      'X-Barbook-Expected-Workspace': auth.workspaceId,
    };
    await api().get('/api/auth/me').set(headers).expect(200);
    await api().post('/api/auth/logout').set(headers).send({}).expect(403);
    await api()
      .post('/api/auth/logout')
      .set({
        ...headers,
        Origin: 'https://foreign.example',
        'X-Barbook-CSRF': auth.csrfToken,
      })
      .send({})
      .expect(403);
    await api()
      .post('/api/auth/logout')
      .set({ ...headers, 'X-Barbook-CSRF': auth.csrfToken })
      .send({})
      .expect(204);
    await api().get('/api/auth/me').set(headers).expect(401);
  });
});
