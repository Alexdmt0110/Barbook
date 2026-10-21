import { NestExpressApplication } from '@nestjs/platform-express';
import { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import * as request from 'supertest';
import { AuthService } from '../src/auth/auth.service';
import { SessionService } from '../src/auth/sessions/session.service';
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

describe('Reauthenticated global logout over real HTTP and PostgreSQL', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  let pool: Pool;
  let alice: Actor;
  let bob: Actor;
  const api = () => request(app.getHttpServer());
  const logoutAll = (actor = alice, password = FIXTURE_PASSWORD) =>
    api()
      .post('/api/auth/logout-all')
      .set(browserHeaders(actor))
      .send({ password });
  const issue = async (): Promise<Actor> => {
    const result = await app
      .get(AuthService)
      .login({ email: alice.user.email, password: FIXTURE_PASSWORD });
    return { ...result.response, credential: result.credential };
  };
  const rows = () =>
    prisma.session.findMany({
      where: { userId: alice.user.id },
      orderBy: { id: 'asc' },
    });
  beforeAll(() => {
    pool = new Pool({ connectionString: requireTestDatabase() });
  });
  beforeEach(async () => {
    app = await createApplicationFixture([], 2);
    prisma = app.get(PrismaService);
    alice = await createActor(app);
    bob = await createActor(app);
  });
  afterEach(async () => {
    await app?.close();
  });
  afterAll(async () => {
    await pool?.end();
  });

  async function lock(
    table: 'User' | 'Workspace' | 'Session',
    id: string,
  ): Promise<{ connection: PoolClient; pid: number }> {
    const connection = await pool.connect();
    await connection.query('BEGIN');
    const result = await connection.query<{ pid: number }>(
      'SELECT pg_backend_pid() AS pid',
    );
    await connection.query(
      `SELECT "id" FROM "${table}" WHERE "id"=$1 FOR NO KEY UPDATE`,
      [id],
    );
    return { connection, pid: result.rows[0].pid };
  }
  async function waiter(pid: number): Promise<number> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const result = await pool.query<{ pid: number }>(
        'SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',
        [pid],
      );
      if (result.rows[0]) return result.rows[0].pid;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Expected actual PostgreSQL lock wait.');
  }

  it('revokes every existing device across instances, preserves another user, refuses replay and renewal', async () => {
    const second = await issue();
    const other = await createApplicationFixture([], 0);
    try {
      const result = await logoutAll().expect(204);
      expect(result.headers['cache-control']).toBe('no-store');
      expect(result.headers['set-cookie']).toBeUndefined();
      const revoked = await rows();
      expect(revoked).toHaveLength(2);
      expect(revoked.every((r) => r.revokedAt !== null)).toBe(true);
      for (const actor of [alice, second]) {
        const response = await request(other.getHttpServer())
          .get('/api/auth/me')
          .set(browserHeaders(actor))
          .expect(401);
        expect(response.body).toMatchObject({ code: 'SESSION_REVOKED' });
        await logoutAll(actor).expect(401);
        await api()
          .post('/api/folders')
          .set(browserHeaders(actor))
          .send({ name: randomUUID() })
          .expect(401);
        expect(
          await app.get(SessionService).authenticate(actor.credential),
        ).toBeNull();
      }
      expect(await rows()).toEqual(revoked);
      await api().get('/api/auth/me').set(browserHeaders(bob)).expect(200);
    } finally {
      await other.close();
    }
  });
  it('requires the current account password without changing session activity on failure', async () => {
    const before = await rows();
    const failure = await logoutAll(alice, 'incorrect password').expect(401);
    expect(failure.body).toMatchObject({ code: 'REAUTHENTICATION_FAILED' });
    expect(await rows()).toEqual(before);
    await api().get('/api/auth/me').set(browserHeaders(alice)).expect(200);
  });
  it.each(['csrf', 'origin', 'marker', 'user', 'workspace', 'bearer'])(
    'rejects hostile %s before revocation or renewal',
    async (mode) => {
      const headers = browserHeaders(alice);
      if (mode === 'csrf') headers['X-Barbook-CSRF'] = bob.csrfToken;
      if (mode === 'origin') headers.Origin = 'https://attacker.example';
      if (mode === 'marker') delete headers['X-Barbook-Request'];
      if (mode === 'user') headers['X-Barbook-Expected-User'] = bob.user.id;
      if (mode === 'workspace')
        headers['X-Barbook-Expected-Workspace'] = bob.workspaceId;
      if (mode === 'bearer') {
        delete headers.Cookie;
        headers.Authorization = `Bearer ${alice.credential}`;
      }
      const before = await rows();
      const result = await api()
        .post('/api/auth/logout-all')
        .set(headers)
        .send({ password: FIXTURE_PASSWORD });
      expect(mode === 'bearer' ? [401] : [403, 409]).toContain(result.status);
      expect(await rows()).toEqual(before);
    },
  );
  it.each([
    {},
    { password: '' },
    { password: 42 },
    { password: 'x'.repeat(129) },
    { password: FIXTURE_PASSWORD, userId: 'foreign' },
  ])('rejects malformed or target-selecting body %j', async (body) => {
    const before = await rows();
    await api()
      .post('/api/auth/logout-all')
      .set(browserHeaders(alice))
      .send(body)
      .expect(400);
    expect(await rows()).toEqual(before);
  });
  it('retains the strict per-route reauthentication rate limit', async () => {
    for (let i = 0; i < 10; i++) await logoutAll(alice, 'wrong').expect(401);
    await logoutAll().expect(429);
    expect((await rows()).every((r) => r.revokedAt === null)).toBe(true);
  });
  it('refuses a credential revoked while password verification / User locking was in flight', async () => {
    const second = await issue();
    const held = await lock('User', alice.user.id);
    const pending = logoutAll().then((r) => r);
    try {
      await waiter(held.pid);
      await app.get(SessionService).revoke(alice.credential);
    } finally {
      await held.connection.query('COMMIT');
      held.connection.release();
    }
    expect((await pending).status).toBe(401);
    await api().get('/api/auth/me').set(browserHeaders(second)).expect(200);
  });
  it('refuses a password changed while verification / User locking was in flight', async () => {
    const held = await lock('User', alice.user.id);
    const pending = logoutAll().then((r) => r);
    try {
      await waiter(held.pid);
      await held.connection.query(
        'UPDATE "User" SET "passwordHash"=$1 WHERE "id"=$2',
        ['synthetic replacement hash', alice.user.id],
      );
    } finally {
      await held.connection.query('COMMIT');
      held.connection.release();
    }
    const response = await pending;
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: 'REAUTHENTICATION_FAILED' });
    expect((await rows()).every((r) => r.revokedAt === null)).toBe(true);
  });
  it('checks expiry after waiting on the current Session lock, without global effects', async () => {
    const second = await issue();
    const first = (await rows()).find((r) => r.csrfToken === alice.csrfToken)!;
    const held = await lock('Session', first.id);
    const pending = logoutAll().then((r) => r);
    try {
      await waiter(held.pid);
      await held.connection.query(
        `UPDATE "Session" SET "createdAt"=clock_timestamp()-interval '3 hours', "lastSeenAt"=clock_timestamp()-interval '2 hours', "idleExpiresAt"=date_trunc('milliseconds', clock_timestamp()) WHERE "id"=$1`,
        [first.id],
      );
    } finally {
      await held.connection.query('COMMIT');
      held.connection.release();
    }
    expect((await pending).status).toBe(401);
    expect((await rows()).every((r) => r.revokedAt === null)).toBe(true);
    await api().get('/api/auth/me').set(browserHeaders(second)).expect(200);
  });
  it('revokes a login committed before the waiting global request acquires User', async () => {
    const held = await lock('User', alice.user.id);
    const login = api()
      .post('/api/auth/login')
      .set(originHeaders())
      .send({ email: alice.user.email, password: FIXTURE_PASSWORD })
      .then((r) => r);
    let global: Promise<request.Response> | undefined;
    try {
      const loginPid = await waiter(held.pid);
      global = logoutAll().then((r) => r);
      await waiter(loginPid);
    } finally {
      await held.connection.query('COMMIT');
      held.connection.release();
    }
    const signedIn = await login;
    expect(signedIn.status).toBe(200);
    expect((await global).status).toBe(204);
    const cookie = (
      signedIn.headers['set-cookie'] as unknown as string[]
    )[0].split(';')[0];
    await api().get('/api/auth/me').set('Cookie', cookie).expect(401);
  });
  it('allows a new login created after global revocation, and an old response cannot clear its cookie', async () => {
    const first = (await rows())[0];
    const held = await lock('Session', first.id);
    const global = logoutAll().then((r) => r);
    let login: Promise<request.Response> | undefined;
    try {
      const globalPid = await waiter(held.pid); // Global already owns User.
      login = api()
        .post('/api/auth/login')
        .set(originHeaders())
        .send({ email: alice.user.email, password: FIXTURE_PASSWORD })
        .then((r) => r);
      await waiter(globalPid);
    } finally {
      await held.connection.query('COMMIT');
      held.connection.release();
    }
    const [loggedOut, signedIn] = await Promise.all([global, login]);
    expect(loggedOut.status).toBe(204);
    expect(loggedOut.headers['set-cookie']).toBeUndefined();
    expect(signedIn.status).toBe(200);
    const cookie = (
      signedIn.headers['set-cookie'] as unknown as string[]
    )[0].split(';')[0];
    await api().get('/api/auth/me').set('Cookie', cookie).expect(200);
    await api().get('/api/auth/me').set(browserHeaders(alice)).expect(401);
  });
  it('lets a previously authorized business request finish but blocks all new requests after global commit', async () => {
    const held = await lock('Workspace', alice.workspaceId);
    const name = `in-flight ${randomUUID()}`;
    const business = api()
      .post('/api/folders')
      .set(browserHeaders(alice))
      .send({ name })
      .then((r) => r);
    try {
      await waiter(held.pid); // Real guard already authorized; business transaction waits.
      await logoutAll().expect(204);
      await api()
        .post('/api/folders')
        .set(browserHeaders(alice))
        .send({ name: randomUUID() })
        .expect(401);
    } finally {
      await held.connection.query('COMMIT');
      held.connection.release();
    }
    expect((await business).status).toBe(201);
    expect(
      await prisma.folder.count({
        where: { workspaceId: alice.workspaceId, name },
      }),
    ).toBe(1);
    await api().get('/api/auth/me').set(browserHeaders(alice)).expect(401);
  });
});
