import { NestExpressApplication } from '@nestjs/platform-express';
import { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import * as request from 'supertest';
import { AuthResponse } from '../src/auth/auth.types';
import { PrismaService } from '../src/database/prisma.service';
import {
  Actor,
  browserHeaders,
  createActor,
  createApplicationFixture,
  FIXTURE_PASSWORD,
  originHeaders,
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

describe('Real web cookie sessions and server CSRF', () => {
  const rollbackSuffix = randomUUID().replaceAll('-', '');
  const rollbackEmail = `${rollbackSuffix}@example.test`;
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  let pool: Pool;
  let alice: Actor;
  let bob: Actor;
  const api = () => request(app.getHttpServer());
  beforeAll(async () => {
    pool = new Pool({ connectionString: requireTestDatabase() });
    app = await createApplicationFixture([rollbackEmail]);
    prisma = app.get(PrismaService);
    alice = await createActor(app);
    bob = await createActor(app);
  });
  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  it('bootstraps only public metadata from a cookie, no credential or hash', async () => {
    const result = await api()
      .get('/api/auth/me')
      .set(browserHeaders(alice))
      .expect(200);
    expect(result.body).toEqual({
      user: alice.user,
      workspaceId: alice.workspaceId,
      csrfToken: alice.csrfToken,
    });
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['set-cookie']).toBeUndefined();
  });
  it.each([
    'cookie only',
    'missing csrf',
    'foreign csrf',
    'foreign user',
    'foreign workspace',
    'foreign origin',
    'missing origin',
    'missing marker',
  ])(
    'rejects mutation with %s without writing or extending activity',
    async (variant) => {
      const headers = browserHeaders(alice);
      const before = await prisma.session.findFirstOrThrow({
        where: { userId: alice.user.id },
      });
      if (variant === 'cookie only')
        for (const key of Object.keys(headers)) {
          if (key !== 'Cookie') delete headers[key];
        }
      if (variant === 'missing csrf') delete headers['X-Barbook-CSRF'];
      if (variant === 'foreign csrf') headers['X-Barbook-CSRF'] = bob.csrfToken;
      if (variant === 'foreign user')
        headers['X-Barbook-Expected-User'] = bob.user.id;
      if (variant === 'foreign workspace')
        headers['X-Barbook-Expected-Workspace'] = bob.workspaceId;
      if (variant === 'foreign origin')
        headers.Origin = 'https://attacker.example';
      if (variant === 'missing origin') delete headers.Origin;
      if (variant === 'missing marker') delete headers['X-Barbook-Request'];
      const name = randomUUID();
      const result = await api()
        .post('/api/folders')
        .set(headers)
        .send({ name });
      expect([403, 409]).toContain(result.status);
      expect(await prisma.folder.count({ where: { name } })).toBe(0);
      expect(
        await prisma.session.findUnique({ where: { id: before.id } }),
      ).toEqual(before);
    },
  );
  it('rejects old-account reads and writes under a new-account cookie before resource access', async () => {
    const stale = {
      ...browserHeaders(alice),
      Cookie: browserHeaders(bob).Cookie,
    };
    await api().get('/api/cocktails').set(stale).expect(409);
    await api()
      .post('/api/folders')
      .set(stale)
      .send({ name: randomUUID() })
      .expect(409);
    await api().post('/api/auth/logout').set(stale).send({}).expect(409);
    await api().get('/api/auth/me').set(browserHeaders(bob)).expect(200);
  });
  it.each(['', 'Bearer forged', 'Basic fake'])(
    'refuses the retired Authorization transport %s',
    async (authorization) => {
      await api()
        .get('/api/cocktails')
        .set('Authorization', authorization)
        .expect(401);
    },
  );
  it('rejects an actual opaque credential used as Bearer instead of cookie', async () => {
    await api()
      .get('/api/cocktails')
      .set('Authorization', `Bearer ${alice.credential}`)
      .expect(401);
  });
  it('refuses ambiguous duplicate cookies and a forged canonical credential', async () => {
    const headers = browserHeaders(alice);
    await api()
      .get('/api/auth/me')
      .set('Cookie', `${headers.Cookie}; ${headers.Cookie}`)
      .expect(401);
    await api()
      .get('/api/auth/me')
      .set('Cookie', `barbook-session-dev=${'A'.repeat(43)}`)
      .expect(401);
  });
  it('enforces origin on login and registration before credentials or database effects', async () => {
    const email = `${randomUUID()}@example.test`;
    await api()
      .post('/api/auth/login')
      .send({ email, password: FIXTURE_PASSWORD })
      .expect(403);
    await api()
      .post('/api/auth/register')
      .set({ ...originHeaders(), Origin: 'https://attacker.example' })
      .send({ email, password: FIXTURE_PASSWORD, displayName: 'QA' })
      .expect(403);
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });
  it('rotates a supplied old cookie and revokes it atomically, with an opt-in persistent cookie', async () => {
    const actor = await createActor(app);
    const result = await api()
      .post('/api/auth/login')
      .set(browserHeaders(actor))
      .send({
        email: actor.user.email,
        password: FIXTURE_PASSWORD,
        rememberMe: true,
      })
      .expect(200);
    const body = result.body as AuthResponse;
    expect(body).not.toHaveProperty('credential');
    expect(body).not.toHaveProperty('accessToken');
    const cookie = (result.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=2592000');
    expect(cookie).not.toContain(actor.credential);
    await api().get('/api/auth/me').set(browserHeaders(actor)).expect(401);
    await api()
      .get('/api/auth/me')
      .set('Cookie', cookie.split(';')[0])
      .expect(200)
      .expect(body);
    const row = await prisma.session.findFirstOrThrow({
      where: { userId: actor.user.id, revokedAt: null },
    });
    expect(row.persistent).toBe(true);
    expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(
      30 * 86400000,
    );
  });
  it('revokes logout, rejects replay, is idempotent and never clears a later cookie', async () => {
    const actor = await createActor(app);
    const logout = await api()
      .post('/api/auth/logout')
      .set(browserHeaders(actor))
      .send({})
      .expect(204);
    expect(logout.headers['set-cookie']).toBeUndefined();
    await api().get('/api/auth/me').set(browserHeaders(actor)).expect(401);
    const replay = await api()
      .post('/api/auth/logout')
      .set(browserHeaders(actor))
      .send({})
      .expect(204);
    expect(replay.headers['set-cookie']).toBeUndefined();
    await api().get('/api/auth/me').set(browserHeaders(bob)).expect(200);
  });
  it.each(['idle', 'absolute'])(
    'enforces %s expiry through the real guard with no renewal or Set-Cookie',
    async (mode) => {
      const actor = await createActor(app);
      await pool.query(
        `UPDATE "Session" SET "createdAt"=statement_timestamp()-interval '3 hours',
        "lastSeenAt"=statement_timestamp()-interval '2 hours', "idleExpiresAt"=date_trunc('milliseconds', statement_timestamp())
        ${mode === 'absolute' ? ', "expiresAt"=date_trunc(\'milliseconds\', statement_timestamp())' : ''}
        WHERE "userId"=$1`,
        [actor.user.id],
      );
      const before = await prisma.session.findFirstOrThrow({
        where: { userId: actor.user.id },
      });
      const refused = await api()
        .get('/api/auth/me')
        .set(browserHeaders(actor))
        .expect(401);
      expect(refused.headers['set-cookie']).toBeUndefined();
      expect(
        await prisma.session.findUnique({ where: { id: before.id } }),
      ).toEqual(before);
    },
  );
  it('rolls all registration rows back if session insertion fails', async () => {
    const suffix = rollbackSuffix;
    const name = `bb_session_${suffix}`;
    const email = rollbackEmail;
    await pool.query(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM "User" WHERE "id"=NEW."userId" AND "email"='${email}') THEN RAISE EXCEPTION 'synthetic session failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${name}" BEFORE INSERT ON "Session" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
    );
    const workspaces = await prisma.workspace.count();
    try {
      await api()
        .post('/api/auth/register')
        .set(originHeaders())
        .send({ email, password: FIXTURE_PASSWORD, displayName: 'QA' })
        .expect(500);
      expect(await prisma.user.count({ where: { email } })).toBe(0);
      expect(await prisma.workspace.count()).toBe(workspaces);
    } finally {
      await pool.query(`DROP TRIGGER "${name}" ON "Session"`);
      await pool.query(`DROP FUNCTION "${name}"()`);
    }
  });
});
