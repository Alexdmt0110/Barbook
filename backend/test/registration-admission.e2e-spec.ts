import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import * as request from 'supertest';
import { AuthResponse } from '../src/auth/auth.types';
import { PrismaService } from '../src/database/prisma.service';
import {
  createApplicationFixture,
  FIXTURE_PASSWORD,
  originHeaders,
} from './helpers/application-fixture';

describe('Private admission through the real API and PostgreSQL', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  let email: string;
  const api = () => request(app.getHttpServer());
  const payload = () => ({
    email,
    password: FIXTURE_PASSWORD,
    displayName: 'Admission fixture',
  });
  const counts = async () =>
    Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.workspaceMember.count(),
      prisma.session.count(),
    ]);
  beforeEach(async () => {
    email = `admitted-${randomUUID()}@example.test`;
    app = await createApplicationFixture([email], 0);
    prisma = app.get(PrismaService);
  });
  afterEach(async () => app?.close());

  it('rejects an unlisted email before any account/workspace/member/session or cookie is created', async () => {
    const before = await counts();
    const result = await api()
      .post('/api/auth/register')
      .set(originHeaders())
      .send({ ...payload(), email: `not-${email}` })
      .expect(403);
    expect(result.body).toMatchObject({ code: 'REGISTRATION_NOT_ALLOWED' });
    expect(result.headers['set-cookie']).toBeUndefined();
    expect(await counts()).toEqual(before);
  });

  it('is closed for the real empty configuration, with no test-environment bypass', async () => {
    const closed = await createApplicationFixture([], 0);
    try {
      const before = await counts();
      await request(closed.getHttpServer())
        .post('/api/auth/register')
        .set(originHeaders())
        .send(payload())
        .expect(403);
      expect(await counts()).toEqual(before);
    } finally {
      await closed.close();
    }
  });

  it('admits an exact normalized email through the existing transaction and HttpOnly cookie', async () => {
    const result = await api()
      .post('/api/auth/register')
      .set(originHeaders())
      .send({ ...payload(), email: ` ${email.toUpperCase()} ` })
      .expect(201);
    const auth = result.body as AuthResponse;
    expect(auth.user.email).toBe(email);
    expect(result.body).not.toHaveProperty('credential');
    expect((result.headers['set-cookie'] as unknown as string[])[0]).toContain(
      'HttpOnly',
    );
    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      include: { personalWorkspace: true, memberships: true, sessions: true },
    });
    expect(user.personalWorkspace).not.toBeNull();
    expect(user.memberships).toHaveLength(1);
    expect(user.memberships[0].role).toBe('OWNER');
    expect(user.sessions).toHaveLength(1);
  });

  it('does not widen an admitted address to aliases, other local parts or suffix domains', async () => {
    const before = await counts();
    const [local, domain] = email.split('@');
    for (const candidate of [
      `${local}+extra@${domain}`,
      `other@${domain}`,
      `${email}.attacker.test`,
    ]) {
      await api()
        .post('/api/auth/register')
        .set(originHeaders())
        .send({ ...payload(), email: candidate })
        .expect(403);
    }
    expect(await counts()).toEqual(before);
  });

  it('does not accept client flags, headers or an injected allowlist as authority', async () => {
    const before = await counts();
    const result = await api()
      .post('/api/auth/register')
      .set({
        ...originHeaders(),
        'X-Registration-Allowed': 'true',
        REGISTRATION_ALLOWED_EMAILS: `not-${email}`,
      })
      .send({ ...payload(), email: `not-${email}` })
      .expect(403);
    expect(result.body).toMatchObject({ code: 'REGISTRATION_NOT_ALLOWED' });
    await api()
      .post('/api/auth/register')
      .set(originHeaders())
      .send({ ...payload(), registrationAllowed: true })
      .expect(400);
    expect(await counts()).toEqual(before);
  });

  it('leaves existing accounts and sessions usable after their address is removed from admission', async () => {
    const registered = await api()
      .post('/api/auth/register')
      .set(originHeaders())
      .send(payload())
      .expect(201);
    const cookie = (
      registered.headers['set-cookie'] as unknown as string[]
    )[0].split(';')[0];
    const closed = await createApplicationFixture([], 0);
    const server = () => request(closed.getHttpServer());
    try {
      const before = await counts();
      // The same refusal for existing and unknown addresses avoids an admission lookup oracle.
      await server()
        .post('/api/auth/register')
        .set(originHeaders())
        .send(payload())
        .expect(403);
      expect(await counts()).toEqual(before);
      await server().get('/api/auth/me').set('Cookie', cookie).expect(200);
      await server()
        .post('/api/auth/login')
        .set(originHeaders())
        .send({ email, password: FIXTURE_PASSWORD })
        .expect(200);
      expect(await prisma.user.count({ where: { email } })).toBe(1);
    } finally {
      await closed.close();
    }
  });

  it('does not revoke or modify a current session when another registration is refused', async () => {
    const registered = await api()
      .post('/api/auth/register')
      .set(originHeaders())
      .send(payload())
      .expect(201);
    const cookie = (
      registered.headers['set-cookie'] as unknown as string[]
    )[0].split(';')[0];
    const auth = registered.body as AuthResponse;
    const before = await prisma.session.findMany({
      where: { userId: auth.user.id },
    });
    const result = await api()
      .post('/api/auth/register')
      .set({ ...originHeaders(), Cookie: cookie })
      .send({ ...payload(), email: `not-${email}` })
      .expect(403);
    expect(result.headers['set-cookie']).toBeUndefined();
    expect(
      await prisma.session.findMany({
        where: { userId: auth.user.id },
      }),
    ).toEqual(before);
    await api().get('/api/auth/me').set('Cookie', cookie).expect(200);
  });
});
