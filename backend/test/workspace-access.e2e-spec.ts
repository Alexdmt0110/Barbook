import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import * as request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { WorkspaceAccessService } from '../src/workspaces/workspace-access.service';
import {
  Actor,
  browserHeaders,
  createActor,
  createApplicationFixture,
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

describe('Shared workspace authorization over PostgreSQL/HTTP', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let owner: Actor;
  let member: Actor;
  let stranger: Actor;
  const spaces: string[] = [];
  const api = () => request(app.getHttpServer());
  async function space() {
    const w = await prisma.workspace.create({
      data: {
        name: `Bar ${randomUUID()}`,
        kind: 'SHARED',
        members: {
          create: [
            { userId: owner.user.id, role: 'OWNER' },
            { userId: member.user.id, role: 'MEMBER' },
          ],
        },
      },
    });
    spaces.push(w.id);
    return w;
  }
  const revoke = (id: string, version = 0) =>
    api()
      .post(`/api/workspaces/${id}/members/${member.user.id}/revoke`)
      .set(browserHeaders(owner))
      .send({ expectedAccessVersion: version });
  beforeAll(async () => {
    pool = new Pool({ connectionString: requireTestDatabase() });
    app = await createApplicationFixture([], 3);
    prisma = app.get(PrismaService);
    owner = await createActor(app);
    member = await createActor(app);
    stranger = await createActor(app);
  });
  afterAll(async () => {
    try {
      await prisma.workspace.deleteMany({ where: { id: { in: spaces } } });
      await prisma.user.deleteMany({
        where: {
          id: { in: [owner.user.id, member.user.id, stranger.user.id] },
        },
      });
    } finally {
      await app?.close();
      await pool?.end();
    }
  });
  it('isolates lists and contexts, reserves membership management for OWNER and preserves personal APIs', async () => {
    const w = await space();
    await api()
      .get(`/api/workspaces/${w.id}`)
      .set(browserHeaders(member))
      .expect(200)
      .expect((r) => expect((r.body as { role: string }).role).toBe('MEMBER'));
    for (const id of [w.id, randomUUID(), owner.workspaceId])
      await api()
        .get(`/api/workspaces/${id}`)
        .set(browserHeaders(stranger))
        .expect(404);
    await api()
      .get(`/api/workspaces/${w.id}/members`)
      .set(browserHeaders(member))
      .expect(404);
    await api()
      .post(`/api/workspaces/${w.id}/members`)
      .set(browserHeaders(member))
      .send({ email: stranger.user.email, expectedAccessVersion: 0 })
      .expect(404);
    const listing = await api()
      .get('/api/workspaces')
      .set(browserHeaders(stranger))
      .expect(200);
    expect(JSON.stringify(listing.body)).not.toContain(w.id);
    await api().get('/api/cocktails').set(browserHeaders(member)).expect(200);
    await api()
      .get('/api/workspaces?pageSize=101')
      .set(browserHeaders(owner))
      .expect(400);
  });
  it('revokes without deleting membership, readmits explicitly and invalidates pre-revocation versions', async () => {
    const w = await space();
    await revoke(w.id).expect(200);
    await api()
      .get(`/api/workspaces/${w.id}`)
      .set(browserHeaders(member))
      .expect(404);
    expect(
      (
        await prisma.workspaceMember.findUniqueOrThrow({
          where: {
            workspaceId_userId: { workspaceId: w.id, userId: member.user.id },
          },
        })
      ).revokedAt,
    ).not.toBeNull();
    await revoke(w.id).expect(409);
    await revoke(w.id, 1).expect(200);
    await api()
      .post(`/api/workspaces/${w.id}/members`)
      .set(browserHeaders(owner))
      .send({ email: member.user.email, expectedAccessVersion: 1 })
      .expect(200)
      .expect((r) =>
        expect((r.body as { accessVersion: number }).accessVersion).toBe(2),
      );
    await api()
      .get(`/api/workspaces/${w.id}`)
      .set(browserHeaders(member))
      .expect(200);
    await expect(
      app
        .get(WorkspaceAccessService)
        .shared(member.user.id, w.id, () => Promise.resolve('unsafe'), {
          expectedAccessVersion: 0,
        }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await prisma.workspace.findUniqueOrThrow({ where: { id: w.id } }))
        .accessVersion,
    ).toBe(2);
  });
  it.each([undefined, null, -1, 0.5, '0', 2147483648])(
    'rejects invalid/missing precondition %j without effects',
    async (version) => {
      const w = await space();
      await api()
        .post(`/api/workspaces/${w.id}/members`)
        .set(browserHeaders(owner))
        .send({ email: stranger.user.email, expectedAccessVersion: version })
        .expect(version == null ? 409 : 400);
      expect(
        await prisma.workspaceMember.count({ where: { workspaceId: w.id } }),
      ).toBe(2);
      expect(
        (await prisma.workspace.findUniqueOrThrow({ where: { id: w.id } }))
          .accessVersion,
      ).toBe(0);
    },
  );
  it('preserves OWNER, rejects unknown targets and enforces CSRF', async () => {
    const w = await space();
    await api()
      .post(`/api/workspaces/${w.id}/members/${owner.user.id}/revoke`)
      .set(browserHeaders(owner))
      .send({ expectedAccessVersion: 0 })
      .expect(409);
    await api()
      .post(`/api/workspaces/${w.id}/members`)
      .set(browserHeaders(owner))
      .send({ email: 'missing@example.test', expectedAccessVersion: 0 })
      .expect(404);
    await api()
      .post(`/api/workspaces/${w.id}/members`)
      .set({ ...browserHeaders(owner), 'X-Barbook-CSRF': 'invalid' })
      .send({ email: stranger.user.email, expectedAccessVersion: 0 })
      .expect(403);
  });
  it.each([false, true])(
    'orders business access with revocation (access first=%s)',
    async (accessFirst) => {
      const w = await space();
      const holder = await pool.connect();
      await holder.query('BEGIN');
      const pid = (
        await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
      ).rows[0].pid;
      await holder.query(
        'SELECT "id" FROM "Workspace" WHERE "id"=$1 FOR NO KEY UPDATE',
        [w.id],
      );
      const access = () =>
        app
          .get(WorkspaceAccessService)
          .shared(
            member.user.id,
            w.id,
            async (tx) => {
              await tx.workspace.update({
                where: { id: w.id },
                data: { name: 'Authorized update' },
              });
              return 200;
            },
            { expectedAccessVersion: 0 },
          )
          .catch((e: { status: number }) => e.status);
      const removal = () => revoke(w.id).then((r) => r.status);
      async function waitFor(count: number) {
        const end = Date.now() + 5000;
        while (Date.now() < end) {
          const rows = await pool.query(
            'WITH RECURSIVE blocked(pid) AS (SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid)) UNION SELECT a.pid FROM pg_stat_activity a JOIN blocked b ON b.pid=ANY(pg_blocking_pids(a.pid))) SELECT DISTINCT pid FROM blocked',
            [pid],
          );
          if (rows.rowCount! >= count) return;
          await new Promise((r) => setTimeout(r, 10));
        }
        throw new Error('Expected observed PostgreSQL waits');
      }
      const pending: Promise<number>[] = [];
      try {
        pending.push(accessFirst ? access() : removal());
        await waitFor(1);
        pending.push(accessFirst ? removal() : access());
        await waitFor(2);
        await holder.query('COMMIT');
        expect(await Promise.all(pending)).toEqual(
          accessFirst ? [200, 200] : [200, 404],
        );
        expect(
          (await prisma.workspace.findUniqueOrThrow({ where: { id: w.id } }))
            .name,
        ).toBe(accessFirst ? 'Authorized update' : w.name);
        await api()
          .get(`/api/workspaces/${w.id}`)
          .set(browserHeaders(member))
          .expect(404);
      } finally {
        await holder.query('ROLLBACK');
        holder.release();
        await Promise.allSettled(pending);
      }
    },
  );
  it('rolls back membership when the version update fails', async () => {
    const w = await space();
    const name = `access_${randomUUID().replaceAll('-', '')}`;
    await pool.query(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."id"='${w.id}' THEN RAISE EXCEPTION 'synthetic access failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${name}" BEFORE UPDATE ON "Workspace" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
    );
    try {
      await revoke(w.id).expect(500);
      expect(
        (
          await prisma.workspaceMember.findUniqueOrThrow({
            where: {
              workspaceId_userId: { workspaceId: w.id, userId: member.user.id },
            },
          })
        ).revokedAt,
      ).toBeNull();
      expect(
        (await prisma.workspace.findUniqueOrThrow({ where: { id: w.id } }))
          .accessVersion,
      ).toBe(0);
    } finally {
      await pool.query(`DROP TRIGGER "${name}" ON "Workspace"`);
      await pool.query(`DROP FUNCTION "${name}"()`);
    }
  });
});
