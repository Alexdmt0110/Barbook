import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import * as request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import {
  Actor,
  browserHeaders,
  createActor,
  createApplicationFixture,
  recipePayload,
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

describe('Mandatory organization preconditions over real HTTP and PostgreSQL', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let alice: Actor;
  let bob: Actor;
  const api = () => request(app.getHttpServer());
  const auth = () => browserHeaders(alice);
  const folder = () =>
    prisma.folder.create({
      data: { workspaceId: alice.workspaceId, name: randomUUID() },
    });
  async function recipe(actor = alice) {
    const result = await api()
      .post('/api/cocktails')
      .set(browserHeaders(actor))
      .send(recipePayload())
      .expect(201);
    return result.body as { id: string; slug: string };
  }
  const row = (id: string) =>
    prisma.cocktail.findUniqueOrThrow({ where: { id } });
  const preconditions = (ids: string[], version = 0) =>
    ids.map((cocktailId) => ({ cocktailId, expectedVersion: version }));
  const add = (id: string, ids: string[], expectedVersions: unknown) =>
    api()
      .post(`/api/folders/${id}/cocktails`)
      .set(auth())
      .send({ cocktailIds: ids, expectedVersions });
  async function preview(id: string) {
    const result = await api()
      .get(`/api/folders/${id}/deletion-preview`)
      .set(auth())
      .expect(200);
    return result.body as { version: number; expectedMembershipToken: string };
  }
  beforeAll(async () => {
    pool = new Pool({ connectionString: requireTestDatabase() });
    app = await createApplicationFixture([], 2);
    prisma = app.get(PrismaService);
    alice = await createActor(app);
    bob = await createActor(app);
  });
  afterAll(async () => {
    try {
      if (alice && bob) {
        await prisma.cocktail.deleteMany({
          where: { workspaceId: { in: [alice.workspaceId, bob.workspaceId] } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: [alice.user.id, bob.user.id] } },
        });
      }
    } finally {
      await app?.close();
      await pool?.end();
    }
  });

  it.each([undefined, null])(
    'rejects absent/null preconditions on every historical writer, with no effect: %s',
    async (expectedVersion) => {
      const target = await folder();
      const created = await recipe();
      const before = await row(created.id);
      await api()
        .put(`/api/cocktails/${created.slug}/organization`)
        .set(auth())
        .send({
          folderId: target.id,
          tagNames: ['Never persisted'],
          expectedVersion,
        })
        .expect(409);
      await api()
        .put(`/api/cocktails/${created.slug}/organization`)
        .set(auth())
        .send({ folderIds: [target.id], tagNames: [], expectedVersion })
        .expect(409);
      await add(target.id, [created.id], expectedVersion).expect(409);
      await api()
        .put(`/api/folders/${target.id}/cocktails/${created.id}`)
        .set(auth())
        .expect(409);
      await api()
        .delete(`/api/folders/${target.id}/cocktails/${created.id}`)
        .set(auth())
        .expect(409);
      await api().delete(`/api/folders/${target.id}`).set(auth()).expect(409);
      expect(await row(created.id)).toEqual(before);
      expect(
        await prisma.cocktailFolder.count({
          where: { cocktailId: created.id },
        }),
      ).toBe(0);
      expect(
        await prisma.tag.count({
          where: { workspaceId: alice.workspaceId, slug: 'never-persisted' },
        }),
      ).toBe(0);
      expect(await prisma.folder.count({ where: { id: target.id } })).toBe(1);
    },
  );

  it('checks stale versions even for no-ops and keeps independent content versions unchanged', async () => {
    const target = await folder();
    const created = await recipe();
    const path = `/api/folders/${target.id}/cocktails/${created.id}`;
    await api()
      .put(path)
      .query({ expectedVersion: 0 })
      .set(auth())
      .expect(200)
      .expect({
        added: 1,
        versions: [{ cocktailId: created.id, organizationVersion: 1 }],
      });
    await api().put(path).query({ expectedVersion: 0 }).set(auth()).expect(409);
    await api()
      .put(path)
      .query({ expectedVersion: 1 })
      .set(auth())
      .expect(200)
      .expect({
        added: 0,
        versions: [{ cocktailId: created.id, organizationVersion: 1 }],
      });
    await api()
      .delete(path)
      .query({ expectedVersion: 0 })
      .set(auth())
      .expect(409);
    await add(target.id, [created.id], preconditions([created.id])).expect(409);
    await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set(auth())
      .send({ folderId: target.id, tagNames: [], expectedVersion: 0 })
      .expect(409);
    const stored = await row(created.id);
    expect(stored.contentVersion).toBe(0);
    expect(stored.organizationVersion).toBe(1);
    await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set(auth())
      .send({ folderIds: [target.id], tagNames: [], expectedVersion: 1 })
      .expect(200)
      .expect((result: request.Response) => {
        expect(result.body).toHaveProperty('organizationVersion', 1);
      });
    expect(await row(created.id)).toEqual(stored);
  });

  it.each([0, 1, 2])(
    'rolls back the complete batch when position %s has a stale version',
    async (position) => {
      const target = await folder();
      const recipes = await Promise.all([recipe(), recipe(), recipe()]);
      const ids = recipes.map((r) => r.id);
      const before = await Promise.all(ids.map(row));
      const expected = preconditions(ids);
      expected[position].expectedVersion = 1;
      await add(target.id, ids, expected).expect(409);
      expect(await Promise.all(ids.map(row))).toEqual(before);
      expect(
        await prisma.cocktailFolder.count({ where: { folderId: target.id } }),
      ).toBe(0);
    },
  );

  it('rejects missing coverage, extras, normalized duplicates and malformed numbers without effects', async () => {
    const target = await folder();
    const [a, b] = await Promise.all([recipe(), recipe()]);
    await add(target.id, [a.id, b.id], preconditions([a.id])).expect(409);
    await add(target.id, [a.id], preconditions([a.id, b.id])).expect(400);
    await add(
      target.id,
      [a.id],
      [...preconditions([a.id]), ...preconditions([a.id.toUpperCase()])],
    ).expect(400);
    for (const expectedVersion of [undefined, null])
      await add(
        target.id,
        [a.id],
        [{ cocktailId: a.id, expectedVersion }],
      ).expect(409);
    for (const expectedVersion of [-1, 0.5, '0', 2147483648])
      await add(
        target.id,
        [a.id],
        [{ cocktailId: a.id, expectedVersion }],
      ).expect(400);
    for (const expectedVersion of ['00', '-1', '', '1.1', '2147483648'])
      await api()
        .put(`/api/folders/${target.id}/cocktails/${a.id}`)
        .query({ expectedVersion })
        .set(auth())
        .expect(400);
    expect(
      await prisma.cocktailFolder.count({ where: { folderId: target.id } }),
    ).toBe(0);
  });

  it('does not leak foreign, unknown or soft-deleted recipes through any membership writer', async () => {
    const target = await folder();
    const own = await recipe();
    const foreign = await recipe(bob);
    const deleted = await recipe();
    await pool.query(
      `UPDATE "Cocktail" SET "deletedAt"=TIMESTAMPTZ '2026-01-01T00:00:00Z', "restoreUntil"=TIMESTAMPTZ '2026-01-31T00:00:00Z' WHERE "id"=$1`,
      [deleted.id],
    );
    for (const id of [foreign.id, randomUUID(), deleted.id]) {
      await add(target.id, [own.id, id], preconditions([own.id, id])).expect(
        404,
      );
      await api()
        .put(`/api/folders/${target.id}/cocktails/${id}`)
        .query({ expectedVersion: 0 })
        .set(auth())
        .expect(404);
      await api()
        .delete(`/api/folders/${target.id}/cocktails/${id}`)
        .query({ expectedVersion: 0 })
        .set(auth())
        .expect(404);
    }
    await api().get(`/api/cocktails/${deleted.slug}`).set(auth()).expect(404);
    await api()
      .put(`/api/cocktails/${deleted.slug}/organization`)
      .set(auth())
      .send({ folderIds: [], expectedVersion: 0, tagNames: [] })
      .expect(404);
    expect(
      await prisma.cocktailFolder.count({ where: { folderId: target.id } }),
    ).toBe(0);
    expect((await row(own.id)).organizationVersion).toBe(0);
  });

  it('rolls back links, representatives and versions after a real multi-row insert failure', async () => {
    const target = await folder();
    const [a, b] = await Promise.all([recipe(), recipe()]);
    const before = await Promise.all([row(a.id), row(b.id)]);
    const name = `bb_batch_${randomUUID().replaceAll('-', '')}`;
    await pool.query(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."cocktailId"='${b.id}' THEN RAISE EXCEPTION 'synthetic batch failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${name}" BEFORE INSERT ON "CocktailFolder" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
    );
    try {
      await add(target.id, [a.id, b.id], preconditions([a.id, b.id])).expect(
        500,
      );
      expect(await Promise.all([row(a.id), row(b.id)])).toEqual(before);
      expect(
        await prisma.cocktailFolder.count({ where: { folderId: target.id } }),
      ).toBe(0);
    } finally {
      await pool.query(`DROP TRIGGER "${name}" ON "CocktailFolder"`);
      await pool.query(`DROP FUNCTION "${name}"()`);
    }
  });

  async function hold(): Promise<{ connection: PoolClient; pid: number }> {
    const connection = await pool.connect();
    await connection.query('BEGIN');
    const result = await connection.query<{ pid: number }>(
      'SELECT pg_backend_pid() AS pid',
    );
    await connection.query(
      'SELECT "id" FROM "Workspace" WHERE "id"=$1 FOR NO KEY UPDATE',
      [alice.workspaceId],
    );
    return { connection, pid: result.rows[0].pid };
  }
  async function waiters(pid: number, count: number) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const result = await pool.query<{ pid: number }>(
        `WITH RECURSIVE blocked(pid) AS (
          SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))
          UNION
          SELECT activity.pid FROM pg_stat_activity activity
          JOIN blocked ON blocked.pid=ANY(pg_blocking_pids(activity.pid))
        ) SELECT DISTINCT pid FROM blocked`,
        [pid],
      );
      if (result.rows.length >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Expected actual PostgreSQL lock wait.');
  }

  it('observes two blocked writers and allows exactly one expected version to win', async () => {
    const [a, b] = await Promise.all([folder(), folder()]);
    const created = await recipe();
    const held = await hold();
    const pending = [a, b].map((f) =>
      api()
        .put(`/api/folders/${f.id}/cocktails/${created.id}`)
        .query({ expectedVersion: 0 })
        .set(auth())
        .then((r) => r),
    );
    try {
      await waiters(held.pid, 2);
      await held.connection.query('COMMIT');
      const responses = await Promise.all(pending);
      expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
      expect((await row(created.id)).organizationVersion).toBe(1);
      expect(
        await prisma.cocktailFolder.count({
          where: { cocktailId: created.id },
        }),
      ).toBe(1);
    } finally {
      await held.connection.query('ROLLBACK');
      held.connection.release();
      await Promise.allSettled(pending);
    }
  });

  it('invalidates every old route and deletion token after a retained-ID lifecycle barrier', async () => {
    const target = await folder();
    const created = await recipe();
    await add(target.id, [created.id], preconditions([created.id])).expect(200);
    const observed = await preview(target.id);
    // B5d endpoints are not active: exercise their specified monotonically increasing barrier in a synthetic transaction.
    const held = await hold();
    const pending = api()
      .delete(`/api/folders/${target.id}/cocktails/${created.id}`)
      .query({ expectedVersion: 1 })
      .set(auth())
      .then((r) => r);
    try {
      await waiters(held.pid, 1);
      await held.connection.query(
        `UPDATE "Cocktail" SET "deletedAt"=TIMESTAMPTZ '2026-01-01T00:00:00Z', "restoreUntil"=TIMESTAMPTZ '2026-01-31T00:00:00Z', "contentVersion"="contentVersion"+1, "organizationVersion"="organizationVersion"+1 WHERE "id"=$1`,
        [created.id],
      );
      await held.connection.query(
        'UPDATE "Cocktail" SET "deletedAt"=NULL, "restoreUntil"=NULL, "contentVersion"="contentVersion"+1, "organizationVersion"="organizationVersion"+1 WHERE "id"=$1',
        [created.id],
      );
      await held.connection.query('COMMIT');
      expect((await pending).status).toBe(409);
    } finally {
      await held.connection.query('ROLLBACK');
      held.connection.release();
      await Promise.allSettled([pending]);
    }
    await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set(auth())
      .send({ folderId: null, expectedVersion: 1, tagNames: [] })
      .expect(409);
    await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set(auth())
      .send({ folderIds: [], expectedVersion: 1, tagNames: [] })
      .expect(409);
    await api()
      .put(`/api/folders/${target.id}/cocktails/${created.id}`)
      .query({ expectedVersion: 1 })
      .set(auth())
      .expect(409);
    await add(target.id, [created.id], preconditions([created.id], 1)).expect(
      409,
    );
    await api()
      .delete(`/api/folders/${target.id}`)
      .query({
        expectedVersion: observed.version,
        expectedMembershipToken: observed.expectedMembershipToken,
      })
      .set(auth())
      .expect(409);
    expect(await row(created.id)).toMatchObject({
      id: created.id,
      slug: created.slug,
      organizationVersion: 3,
      contentVersion: 2,
      deletedAt: null,
    });
    expect(
      await prisma.cocktailFolder.count({ where: { cocktailId: created.id } }),
    ).toBe(1);
  });

  it('rejects a deletion preview made stale by another member, including legacy-only retained recipes', async () => {
    const target = await folder();
    const created = await recipe();
    const observed = await preview(target.id);
    await add(target.id, [created.id], preconditions([created.id])).expect(200);
    await api()
      .delete(`/api/folders/${target.id}`)
      .query({
        expectedVersion: observed.version,
        expectedMembershipToken: observed.expectedMembershipToken,
      })
      .set(auth())
      .expect(409);
    const legacy = await recipe();
    await prisma.cocktail.update({
      where: { id: legacy.id },
      data: { folderId: target.id },
    });
    const fresh = await preview(target.id);
    await api()
      .delete(`/api/folders/${target.id}`)
      .query({
        expectedVersion: fresh.version,
        expectedMembershipToken: fresh.expectedMembershipToken,
      })
      .set(auth())
      .expect(200);
    expect(await row(legacy.id)).toMatchObject({
      folderId: null,
      organizationVersion: 1,
      contentVersion: 0,
    });
    expect(await row(created.id)).toMatchObject({
      folderId: null,
      organizationVersion: 2,
      contentVersion: 0,
    });
  });

  it('keeps real CSRF, identity and private preview protections ahead of mutations', async () => {
    const target = await folder();
    const created = await recipe();
    const headers = auth();
    delete headers['X-Barbook-CSRF'];
    await api()
      .put(`/api/folders/${target.id}/cocktails/${created.id}`)
      .query({ expectedVersion: 0 })
      .set(headers)
      .expect(403);
    await api()
      .put(`/api/folders/${target.id}/cocktails/${created.id}`)
      .query({ expectedVersion: 0 })
      .set({ ...auth(), 'X-Barbook-Expected-Workspace': bob.workspaceId })
      .expect(409);
    await api()
      .get(`/api/folders/${target.id}/deletion-preview`)
      .set(browserHeaders(bob))
      .expect(404);
    await api().get(`/api/folders/${target.id}/deletion-preview`).expect(401);
    expect((await row(created.id)).organizationVersion).toBe(0);
    expect(
      await prisma.cocktailFolder.count({ where: { folderId: target.id } }),
    ).toBe(0);
  });
});
