import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  generateOpaqueToken,
  hashSessionCredential,
} from '../src/auth/sessions/session-credentials';
import {
  IssuedSession,
  SessionService,
} from '../src/auth/sessions/session.service';
import { PrismaService } from '../src/database/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { createApplicationFixture } from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 15000,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('PostgreSQL opaque session store (not yet the web auth boundary)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let service: SessionService;
  let pool: Pool;
  let alice: string;
  let bob: string;
  const ownedUsers: string[] = [];

  const issue = (userId = alice, persistent = false) =>
    prisma.$transaction(
      (tx) => service.create(tx, userId, persistent),
      transactionOptions,
    );
  const revokeAll = (userId = alice) =>
    prisma.$transaction(
      (tx) => service.revokeAll(tx, userId),
      transactionOptions,
    );

  async function user(): Promise<string> {
    const id = randomUUID();
    await prisma.user.create({
      data: {
        id,
        email: `session-${id}@example.test`,
        displayName: 'Synthetic session fixture',
        passwordHash: 'unusable-synthetic-fixture-hash',
      },
    });
    ownedUsers.push(id);
    return id;
  }

  async function waitUntilBlocked(pid: number): Promise<void> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const result = await pool.query<{ blocked: boolean }>(
        'SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked',
        [pid],
      );
      if (result.rows[0]?.blocked) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Expected an actual PostgreSQL lock wait.');
  }

  async function waitForWaiter(blocker: number): Promise<number> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const result = await pool.query<{ pid: number }>(
        'SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',
        [blocker],
      );
      if (result.rows[0]) return result.rows[0].pid;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Expected a real session operation to wait on PostgreSQL.');
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: requireTestDatabase() });
    app = await createApplicationFixture();
    prisma = app.get(PrismaService);
    service = app.get(SessionService);
  });
  beforeEach(async () => {
    alice = await user();
    bob = await user();
  });
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: ownedUsers } } });
    ownedUsers.length = 0;
  });
  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  it.each([
    [false, 7200, 43200],
    [true, 604800, 2592000],
  ])(
    'stores only the hash and applies approved durations (persistent=%s)',
    async (persistent, idleSeconds, absoluteSeconds) => {
      const result = await issue(alice, persistent);
      const row = await prisma.session.findUniqueOrThrow({
        where: { id: result.session.id },
      });
      expect(row.tokenHash).toBe(hashSessionCredential(result.credential));
      expect(JSON.stringify(row)).not.toContain(result.credential);
      expect(JSON.stringify(result.session)).not.toContain(row.tokenHash);
      expect(result.session.csrfToken).not.toBe(result.credential);
      expect(row.lastSeenAt).toEqual(row.createdAt);
      expect(row.idleExpiresAt.getTime() - row.createdAt.getTime()).toBe(
        idleSeconds * 1000,
      );
      expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(
        absoluteSeconds * 1000,
      );
      expect(await service.authenticate(result.credential)).toMatchObject({
        id: row.id,
        userId: alice,
      });
      expect(await service.authenticate(row.id)).toBeNull();
      expect(await service.authenticate(row.tokenHash)).toBeNull();
      expect(await service.authenticate(row.csrfToken)).toBeNull();
    },
  );

  it('inspects without renewing and cannot authorize a session revoked after preflight', async () => {
    const issued = await issue();
    const before = await prisma.session.findUniqueOrThrow({
      where: { id: issued.session.id },
    });
    expect(await service.inspect(issued.credential)).toEqual(issued.session);
    expect(await service.inspect(issued.credential)).toEqual(issued.session);
    expect(
      await prisma.session.findUnique({ where: { id: before.id } }),
    ).toEqual(before);
    await service.revoke(issued.credential);
    expect(await service.inspect(issued.credential)).toBeNull();
    expect(await service.authenticate(issued.credential)).toBeNull();
    expect(await service.inspect(undefined)).toBeNull();
    expect(await service.inspect(generateOpaqueToken())).toBeNull();
  });

  it('refuses expiration between read-only preflight and final authorization without activity changes', async () => {
    const issued = await issue();
    expect(await service.inspect(issued.credential)).not.toBeNull();
    await pool.query(
      `UPDATE "Session" SET "createdAt"=statement_timestamp()-interval '3 hours', "lastSeenAt"=statement_timestamp()-interval '2 hours', "idleExpiresAt"=date_trunc('milliseconds', statement_timestamp()) WHERE "id"=$1`,
      [issued.session.id],
    );
    const expired = await prisma.session.findUniqueOrThrow({
      where: { id: issued.session.id },
    });
    expect(await service.inspect(issued.credential)).toBeNull();
    expect(await service.authenticate(issued.credential)).toBeNull();
    expect(
      await prisma.session.findUnique({ where: { id: expired.id } }),
    ).toEqual(expired);
  });

  it('issues independent sessions and another Nest instance reads the same store', async () => {
    const first = await issue();
    const second = await issue();
    expect(first.credential).not.toBe(second.credential);
    expect(first.session.csrfToken).not.toBe(second.session.csrfToken);
    const other = await createApplicationFixture();
    try {
      expect(
        await other.get(SessionService).authenticate(first.credential),
      ).toMatchObject({ id: first.session.id, userId: alice });
    } finally {
      await other.close();
    }
  });

  it('renews actual activity without extending the absolute limit', async () => {
    const issued = await issue();
    const result = await pool.query<{ expiresAt: Date }>(
      `UPDATE "Session" SET "createdAt"=clock_timestamp()-interval '11 hours 50 minutes',
       "lastSeenAt"=clock_timestamp()-interval '5 minutes',
       "idleExpiresAt"=clock_timestamp()+interval '2 minutes',
       "expiresAt"=clock_timestamp()+interval '10 minutes'
       WHERE "id"=$1 RETURNING "expiresAt"`,
      [issued.session.id],
    );
    const active = await service.authenticate(issued.credential);
    expect(active?.idleExpiresAt).toEqual(result.rows[0].expiresAt);
    expect(active?.expiresAt).toEqual(result.rows[0].expiresAt);
  });

  it.each(['idleExpiresAt', 'expiresAt'] as const)(
    'rejects at the %s boundary and cannot revive expired activity',
    async (boundary) => {
      const issued = await issue();
      const expiry =
        boundary === 'expiresAt'
          ? `, "expiresAt"=date_trunc('milliseconds', statement_timestamp())`
          : '';
      await pool.query(
        `UPDATE "Session" SET "createdAt"=statement_timestamp()-interval '3 hours',
         "lastSeenAt"=statement_timestamp()-interval '2 hours',
         "idleExpiresAt"=date_trunc('milliseconds', statement_timestamp()) ${expiry} WHERE "id"=$1`,
        [issued.session.id],
      );
      const before = await prisma.session.findUniqueOrThrow({
        where: { id: issued.session.id },
      });
      expect(await service.authenticate(issued.credential)).toBeNull();
      expect(await service.authenticate(issued.credential)).toBeNull();
      expect(
        await prisma.session.findUnique({ where: { id: before.id } }),
      ).toEqual(before);
    },
  );

  it.each(['idle', 'absolute'])(
    'does not authorize or renew %s expiry while queued behind a row lock',
    async (boundary) => {
      const issued = await issue();
      const connection = await pool.connect();
      let activity: ReturnType<SessionService['authenticate']> | undefined;
      try {
        const {
          rows: [row],
        } = await connection.query<{ pid: number }>(
          'SELECT pg_backend_pid() AS pid',
        );
        await connection.query(
          `UPDATE "Session" SET "idleExpiresAt"=statement_timestamp()+interval '1 second' ${boundary === 'absolute' ? `, "expiresAt"=statement_timestamp()+interval '1 second'` : ''} WHERE "id"=$1`,
          [issued.session.id],
        );
        // This lock changes no row: a pre-lock WHERE check alone is insufficient.
        await connection.query('BEGIN');
        await connection.query(
          'SELECT "id" FROM "Session" WHERE "id"=$1 FOR UPDATE',
          [issued.session.id],
        );
        activity = service.authenticate(issued.credential);
        await waitForWaiter(row.pid);
        const initially = await connection.query<{ active: boolean }>(
          'SELECT "idleExpiresAt" > clock_timestamp() AS active FROM "Session" WHERE "id"=$1',
          [issued.session.id],
        );
        expect(initially.rows[0].active).toBe(true);
        const deadline = Date.now() + 5000;
        let expired = false;
        while (Date.now() < deadline) {
          const result = await connection.query<{ expired: boolean }>(
            'SELECT "idleExpiresAt" <= clock_timestamp() AS expired FROM "Session" WHERE "id"=$1',
            [issued.session.id],
          );
          if (result.rows[0].expired) {
            expired = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(expired).toBe(true);
        await connection.query('COMMIT');
        expect(await activity).toBeNull();
        expect(await service.authenticate(issued.credential)).toBeNull();
      } finally {
        await connection.query('ROLLBACK');
        connection.release();
        await activity;
      }
    },
  );

  it('makes revocation idempotent, rejects replay and preserves other sessions', async () => {
    const [first, second, foreign] = await Promise.all([
      issue(),
      issue(),
      issue(bob),
    ]);
    await service.revoke(first.credential);
    const revoked = await prisma.session.findUniqueOrThrow({
      where: { id: first.session.id },
    });
    await service.revoke(first.credential);
    expect(
      await prisma.session.findUnique({ where: { id: first.session.id } }),
    ).toEqual(revoked);
    expect(await service.authenticate(first.credential)).toBeNull();
    expect(await service.authenticate(second.credential)).not.toBeNull();
    expect(await service.authenticate(foreign.credential)).not.toBeNull();
    expect(await revokeAll()).toBe(1);
    expect(await revokeAll()).toBe(0);
    expect(await service.authenticate(second.credential)).toBeNull();
    expect(await service.authenticate(foreign.credential)).not.toBeNull();
    await service.revoke('malformed');
    await service.revoke(generateOpaqueToken());
    expect(await service.authenticate(generateOpaqueToken())).toBeNull();
  });

  it('rolls back a session with the caller transaction and refuses deleted users', async () => {
    let credential: string | undefined;
    await expect(
      prisma.$transaction(async (tx) => {
        credential = (await service.create(tx, alice)).credential;
        throw new Error('Synthetic caller rollback');
      }, transactionOptions),
    ).rejects.toThrow('Synthetic caller rollback');
    expect(await prisma.session.count({ where: { userId: alice } })).toBe(0);
    expect(await service.authenticate(credential)).toBeNull();
    const missing = randomUUID();
    await expect(issue(missing)).rejects.toThrow('Account is unavailable.');
    expect(await revokeAll(missing)).toBe(0);
  });

  it('rolls back newly created account/workspace/member/session rows together', async () => {
    const id = randomUUID();
    let credential: string | undefined;
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id,
            email: `rollback-${id}@example.test`,
            displayName: 'Rollback fixture',
            passwordHash: 'synthetic-unusable-hash',
          },
        });
        const workspace = await tx.workspace.create({
          data: {
            name: 'Synthetic personal workspace',
            kind: 'PERSONAL',
            personalOwnerId: id,
          },
        });
        await tx.workspaceMember.create({
          data: { workspaceId: workspace.id, userId: id, role: 'OWNER' },
        });
        credential = (await service.create(tx, id)).credential;
        throw new Error('Synthetic failure after session insertion');
      }, transactionOptions),
    ).rejects.toThrow('Synthetic failure after session insertion');
    expect(credential).toBeDefined();
    expect(await prisma.user.findUnique({ where: { id } })).toBeNull();
    expect(
      await prisma.workspace.count({ where: { personalOwnerId: id } }),
    ).toBe(0);
    expect(await prisma.workspaceMember.count({ where: { userId: id } })).toBe(
      0,
    );
    expect(await prisma.session.count({ where: { userId: id } })).toBe(0);
    expect(await service.authenticate(credential)).toBeNull();
  });

  it.each([
    [false, 7200],
    [true, 604800],
  ])(
    'renews the approved idle period for persistent=%s',
    async (persistent, idleSeconds) => {
      const issued = await issue(alice, persistent);
      await pool.query(
        `UPDATE "Session" SET "createdAt"=clock_timestamp()-interval '1 hour', "lastSeenAt"=clock_timestamp()-interval '30 minutes', "idleExpiresAt"=clock_timestamp()+interval '1 minute' WHERE "id"=$1`,
        [issued.session.id],
      );
      const active = await service.authenticate(issued.credential);
      expect(active).not.toBeNull();
      expect(
        Math.abs(
          active!.idleExpiresAt.getTime() -
            active!.lastSeenAt.getTime() -
            idleSeconds * 1000,
        ),
      ).toBeLessThanOrEqual(2);
      expect(active!.expiresAt).toEqual(issued.session.expiresAt);
    },
  );

  it('rejects an incompatible repeatable snapshot instead of silently missing a concurrent login', async () => {
    await expect(
      prisma.$transaction((tx) => service.revokeAll(tx, alice), {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      }),
    ).rejects.toThrow('Session transaction configuration is invalid.');
  });

  it.each(['create-first', 'revoke-first'] as const)(
    'linearizes global revocation against creation: %s',
    async (order) => {
      const existing = await issue();
      const locked = deferred<void>();
      const release = deferred<void>();
      const waiterPid = deferred<number>();
      let created: IssuedSession | undefined;
      const first = prisma.$transaction(async (tx) => {
        if (order === 'create-first') created = await service.create(tx, alice);
        else await service.revokeAll(tx, alice);
        locked.resolve();
        await release.promise;
      }, transactionOptions);
      await locked.promise;
      const second = prisma.$transaction(async (tx) => {
        const [row] = await tx.$queryRaw<
          { pid: number }[]
        >`SELECT pg_backend_pid() AS pid`;
        waiterPid.resolve(row.pid);
        if (order === 'create-first') await service.revokeAll(tx, alice);
        else created = await service.create(tx, alice);
      }, transactionOptions);
      try {
        await waitUntilBlocked(await waiterPid.promise);
      } finally {
        release.resolve();
        await Promise.all([first, second]);
      }
      expect(await service.authenticate(existing.credential)).toBeNull();
      expect(created).toBeDefined();
      const authenticated = await service.authenticate(created!.credential);
      expect(authenticated === null).toBe(order === 'create-first');
    },
  );

  it('rejects activity that was waiting for an uncommitted global revocation', async () => {
    const issued = await issue();
    const locked = deferred<number>();
    const release = deferred<void>();
    const revocation = prisma.$transaction(async (tx) => {
      await service.revokeAll(tx, alice);
      const [row] = await tx.$queryRaw<
        { pid: number }[]
      >`SELECT pg_backend_pid() AS pid`;
      locked.resolve(row.pid);
      await release.promise;
    }, transactionOptions);
    const blocker = await locked.promise;
    const activity = service.authenticate(issued.credential);
    try {
      await waitForWaiter(blocker);
    } finally {
      release.resolve();
      await revocation;
    }
    expect(await activity).toBeNull();
    expect(await service.authenticate(issued.credential)).toBeNull();
  });

  it('lets already queued activity finish before revocation without resurrecting afterwards', async () => {
    const issued = await issue();
    const connection = await pool.connect();
    let activity: ReturnType<SessionService['authenticate']> | undefined;
    let revocation: Promise<void> | undefined;
    try {
      await connection.query('BEGIN');
      const {
        rows: [row],
      } = await connection.query<{ pid: number }>(
        'SELECT pg_backend_pid() AS pid',
      );
      await connection.query(
        'SELECT "id" FROM "Session" WHERE "id"=$1 FOR UPDATE',
        [issued.session.id],
      );
      activity = service.authenticate(issued.credential);
      const activityPid = await waitForWaiter(row.pid);
      revocation = service.revoke(issued.credential);
      await waitForWaiter(activityPid);
      await connection.query('COMMIT');
      expect(await activity).not.toBeNull();
      await revocation;
      expect(await service.authenticate(issued.credential)).toBeNull();
      const stored = await prisma.session.findUniqueOrThrow({
        where: { id: issued.session.id },
      });
      expect(stored.revokedAt).not.toBeNull();
    } finally {
      await connection.query('ROLLBACK');
      connection.release();
      await Promise.all([activity, revocation]);
    }
  });

  it.each([
    [
      'invalid hash',
      'UPDATE "Session" SET "tokenHash"=\'raw-secret\' WHERE "id"=$1',
      '23514',
    ],
    [
      'invalid CSRF',
      'UPDATE "Session" SET "csrfToken"=\'short\' WHERE "id"=$1',
      '23514',
    ],
    [
      'idle after absolute',
      'UPDATE "Session" SET "idleExpiresAt"="expiresAt"+interval \'1 second\' WHERE "id"=$1',
      '23514',
    ],
    [
      'backdated activity',
      'UPDATE "Session" SET "lastSeenAt"="createdAt"-interval \'1 second\' WHERE "id"=$1',
      '23514',
    ],
    [
      'backdated revocation',
      'UPDATE "Session" SET "revokedAt"="createdAt"-interval \'1 second\' WHERE "id"=$1',
      '23514',
    ],
    [
      'foreign user',
      'UPDATE "Session" SET "userId"=\'missing-user\' WHERE "id"=$1',
      '23503',
    ],
  ])('enforces %s against direct DB writers', async (_label, sql, code) => {
    const issued = await issue();
    await expect(pool.query(sql, [issued.session.id])).rejects.toMatchObject({
      code,
    });
  });

  it('enforces unique hashes and cascades deletion of the owning user', async () => {
    const first = await issue();
    const second = await issue(bob);
    await expect(
      pool.query('UPDATE "Session" SET "tokenHash"=$1 WHERE "id"=$2', [
        hashSessionCredential(first.credential),
        second.session.id,
      ]),
    ).rejects.toMatchObject({ code: '23505' });
    await prisma.user.delete({ where: { id: alice } });
    expect(await prisma.session.count({ where: { userId: alice } })).toBe(0);
    expect(await service.authenticate(first.credential)).toBeNull();
    expect(await service.authenticate(second.credential)).not.toBeNull();
  });

  it('bounds cleanup to 500 inactive rows and preserves active standard/persistent sessions', async () => {
    const standard = await issue();
    const persistent = await issue(alice, true);
    const revoked = await issue();
    await service.revoke(revoked.credential);
    const now = Date.now();
    await prisma.session.createMany({
      data: Array.from({ length: 501 }, () => ({
        userId: alice,
        tokenHash: hashSessionCredential(generateOpaqueToken()),
        csrfToken: generateOpaqueToken(),
        createdAt: new Date(now - 10000),
        lastSeenAt: new Date(now - 10000),
        idleExpiresAt: new Date(now - 1000),
        expiresAt: new Date(now + 3600000),
      })),
    });
    expect(await service.prune()).toBe(500);
    expect(await service.prune()).toBe(2);
    expect(await service.prune()).toBe(0);
    expect(await service.authenticate(standard.credential)).not.toBeNull();
    expect(await service.authenticate(persistent.credential)).not.toBeNull();
    expect(await prisma.session.count({ where: { userId: alice } })).toBe(2);
  });
});
