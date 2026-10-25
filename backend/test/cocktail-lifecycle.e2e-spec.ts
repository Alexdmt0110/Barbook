import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import * as request from 'supertest';
import { CocktailContentService } from '../src/cocktails/cocktail-content.service';
import { PrismaService } from '../src/database/prisma.service';
import {
  Actor,
  browserHeaders,
  createActor,
  createApplicationFixture,
  recipePayload,
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

type Content = Awaited<ReturnType<CocktailContentService['get']>>;
describe('Personal trash lifecycle over PostgreSQL and HTTP', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let alice: Actor;
  let bob: Actor;
  const api = () => request(app.getHttpServer());
  const auth = () => browserHeaders(alice);
  const path = (id: string) => `/api/cocktails/id/${id}`;
  const versions = (content = 0, organization = content) => ({
    expectedContentVersion: content,
    expectedOrganizationVersion: organization,
  });
  const remove = (id: string, body: object = versions()) =>
    api().delete(path(id)).set(auth()).send(body);
  const restore = (id: string, body: object = versions(1)) =>
    api()
      .post(`${path(id)}/restore`)
      .set(auth())
      .send(body);
  const snapshot = (id: string) =>
    prisma.cocktail.findUniqueOrThrow({
      where: { id },
      include: {
        ingredients: { orderBy: { sortOrder: 'asc' } },
        garnishes: { orderBy: { sortOrder: 'asc' } },
        steps: { orderBy: { sortOrder: 'asc' } },
        folderMemberships: { orderBy: { folderId: 'asc' } },
        tags: { orderBy: { tagId: 'asc' } },
      },
    });
  async function recipe(actor = alice) {
    const response = await api()
      .post('/api/cocktails')
      .set(browserHeaders(actor))
      .send(recipePayload())
      .expect(201);
    return response.body as { id: string; slug: string };
  }
  async function content(id: string) {
    const response = await api()
      .get(`${path(id)}/content`)
      .set(auth())
      .expect(200);
    return response.body as Content;
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

  it('round trips retained content and identities, reserves the slug, invalidates both old intentions and treats fresh duplicates as no-ops', async () => {
    const r = await recipe();
    const original = await snapshot(r.id);
    const loaded = await content(r.id);
    const deleted = await remove(r.id).expect(200);
    const state = deleted.body as { deletedAt: string; restoreUntil: string };
    expect(Date.parse(state.restoreUntil) - Date.parse(state.deletedAt)).toBe(
      30 * 86400000,
    );
    expect(deleted.body).toMatchObject({
      id: r.id,
      slug: r.slug,
      contentVersion: 1,
      organizationVersion: 1,
      canRestore: true,
    });
    await remove(r.id).expect(409);
    const duplicate = await remove(r.id, versions(1)).expect(200);
    expect(duplicate.body).toEqual(deleted.body);
    await api()
      .post('/api/cocktails')
      .set(auth())
      .send(recipePayload({ name: original.name }))
      .expect(409);
    await restore(r.id).expect(200);
    const restored = await snapshot(r.id);
    expect(restored).toEqual({
      ...original,
      contentVersion: 2,
      organizationVersion: 2,
      updatedAt: restored.updatedAt,
    });
    await restore(r.id, versions(2)).expect(200);
    expect(await snapshot(r.id)).toEqual(restored);
    await api()
      .put(`${path(r.id)}/content`)
      .set(auth())
      .send({ ...loaded.content, name: 'Stale', expectedContentVersion: 0 })
      .expect(409);
    await api()
      .put(`/api/cocktails/${r.slug}/organization`)
      .set(auth())
      .send({ folderIds: [], tagNames: [], expectedVersion: 0 })
      .expect(409);
    await remove(r.id).expect(409);
    expect(await snapshot(r.id)).toEqual(restored);
  });

  it.each([
    {},
    { expectedContentVersion: 0 },
    { expectedOrganizationVersion: 0 },
    versions(null as unknown as number),
    versions(1),
  ])(
    'rejects missing/null/stale preconditions without effects: %j',
    async (body) => {
      const r = await recipe();
      const before = await snapshot(r.id);
      await remove(r.id, body).expect(409);
      expect(await snapshot(r.id)).toEqual(before);
    },
  );
  it.each([-1, 0.5, 2147483648, '0', true])(
    'rejects malformed versions %j',
    async (value) => {
      const r = await recipe();
      const before = await snapshot(r.id);
      await remove(r.id, {
        ...versions(),
        expectedContentVersion: value,
      }).expect(400);
      expect(await snapshot(r.id)).toEqual(before);
    },
  );
  it.each(['contentVersion', 'organizationVersion'] as const)(
    'rejects exhausted %s atomically',
    async (field) => {
      const r = await recipe();
      await prisma.cocktail.update({
        where: { id: r.id },
        data: { [field]: 2147483647 },
      });
      const before = await snapshot(r.id);
      await remove(
        r.id,
        versions(before.contentVersion, before.organizationVersion),
      ).expect(409);
      expect(await snapshot(r.id)).toEqual(before);
    },
  );

  it('isolates foreign and missing IDs and enforces CSRF and workspace context', async () => {
    const foreign = await recipe(bob);
    const own = await recipe();
    for (const id of [foreign.id, randomUUID()]) {
      await api()
        .get(`${path(id)}/lifecycle`)
        .set(auth())
        .expect(404);
      await remove(id).expect(404);
      await restore(id).expect(404);
    }
    await api().delete(path(own.id)).send(versions()).expect(401);
    const headers = auth();
    delete headers['X-Barbook-CSRF'];
    await api().delete(path(own.id)).set(headers).send(versions()).expect(403);
    await api()
      .delete(path(own.id))
      .set({ ...auth(), 'X-Barbook-Expected-Workspace': bob.workspaceId })
      .send(versions())
      .expect(409);
    expect((await snapshot(own.id)).deletedAt).toBeNull();
  });

  it('hides trashed recipes from legacy reads, writes, bulk operations and folder counts; preserves surviving links on restore', async () => {
    const r = await recipe();
    const other = await recipe();
    const loaded = await content(r.id);
    const folder = await prisma.folder.create({
      data: { workspaceId: alice.workspaceId, name: `Folder ${randomUUID()}` },
    });
    await api()
      .put(`/api/folders/${folder.id}/cocktails/${r.id}?expectedVersion=0`)
      .set(auth())
      .expect(200);
    await remove(r.id, versions(0, 1)).expect(200);
    await api().get(`/api/cocktails/${r.slug}`).set(auth()).expect(404);
    await api()
      .get(`${path(r.id)}/content`)
      .set(auth())
      .expect(404);
    await api()
      .put(`${path(r.id)}/content`)
      .set(auth())
      .send({ ...loaded.content, expectedContentVersion: 1 })
      .expect(404);
    await api()
      .put(`/api/cocktails/${r.slug}/organization`)
      .set(auth())
      .send({ folderIds: [], tagNames: [], expectedVersion: 2 })
      .expect(404);
    for (const method of ['put', 'delete'] as const)
      await api()
        [method](
          `/api/folders/${folder.id}/cocktails/${r.id}?expectedVersion=2`,
        )
        .set(auth())
        .expect(404);
    await api()
      .post(`/api/folders/${folder.id}/cocktails`)
      .set(auth())
      .send({
        cocktailIds: [other.id, r.id],
        expectedVersions: [
          { cocktailId: other.id, expectedVersion: 0 },
          { cocktailId: r.id, expectedVersion: 2 },
        ],
      })
      .expect(404);
    expect((await snapshot(other.id)).organizationVersion).toBe(0);
    for (const url of [
      `/api/cocktails?folderId=${folder.id}`,
      `/api/cocktails?search=${encodeURIComponent(loaded.content.name)}`,
    ]) {
      const response = await api().get(url).set(auth()).expect(200);
      expect(JSON.stringify(response.body)).not.toContain(r.id);
    }
    const folders = await api().get('/api/folders').set(auth()).expect(200);
    expect(JSON.stringify(folders.body)).toContain(folder.id);
    const preview = await api()
      .get(`/api/folders/${folder.id}/deletion-preview`)
      .set(auth())
      .expect(200);
    const token = preview.body as {
      version: number;
      expectedMembershipToken: string;
    };
    await api()
      .delete(`/api/folders/${folder.id}`)
      .query({
        expectedVersion: token.version,
        expectedMembershipToken: token.expectedMembershipToken,
      })
      .set(auth())
      .expect(200);
    await restore(r.id, versions(1, 3)).expect(200);
    const restored = await snapshot(r.id);
    expect(restored.folderId).toBeNull();
    expect(restored.folderMemberships).toEqual([]);
    expect(restored.ingredients).toHaveLength(1);
  });

  async function hold() {
    const connection = await pool.connect();
    await connection.query('BEGIN');
    const pid = (
      await connection.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
    ).rows[0].pid;
    await connection.query(
      'SELECT "id" FROM "Workspace" WHERE "id"=$1 FOR NO KEY UPDATE',
      [alice.workspaceId],
    );
    return { connection, pid };
  }
  async function waiters(pid: number, count: number) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const blocked = await pool.query(
        `WITH RECURSIVE blocked(pid) AS (
        SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid)) UNION
        SELECT a.pid FROM pg_stat_activity a JOIN blocked ON blocked.pid=ANY(pg_blocking_pids(a.pid))
      ) SELECT DISTINCT pid FROM blocked`,
        [pid],
      );
      if (blocked.rows.length >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Expected actual PostgreSQL lock waits.');
  }
  it.each([false, true])(
    'serializes competing lifecycle commands (restore=%s), rejects replay after discarded response',
    async (restoring) => {
      const r = await recipe();
      if (restoring) await remove(r.id).expect(200);
      const held = await hold();
      const pending = [0, 1].map(() =>
        (restoring ? restore(r.id) : remove(r.id)).then((res) => res),
      );
      try {
        await waiters(held.pid, 2);
        await held.connection.query('COMMIT');
        expect(
          (await Promise.all(pending)).map((res) => res.status).sort(),
        ).toEqual([200, 409]);
        const saved = await snapshot(r.id);
        await (restoring ? restore(r.id) : remove(r.id)).expect(409);
        expect(await snapshot(r.id)).toEqual(saved);
      } finally {
        await held.connection.query('ROLLBACK');
        held.connection.release();
        await Promise.allSettled(pending);
      }
    },
  );

  it.each([
    ['edit', false],
    ['edit', true],
    ['organize', false],
    ['organize', true],
    ['folder', false],
    ['folder', true],
  ] as const)(
    'serializes %s against deletion in both lock orders (delete first=%s)',
    async (operation, deleteFirst) => {
      const r = await recipe();
      const loaded = await content(r.id);
      const folder = await prisma.folder.create({
        data: { workspaceId: alice.workspaceId, name: `Race ${randomUUID()}` },
      });
      if (operation === 'folder')
        await api()
          .put(`/api/folders/${folder.id}/cocktails/${r.id}?expectedVersion=0`)
          .set(auth())
          .expect(200);
      const organization = operation === 'folder' ? 1 : 0;
      const preview = await api()
        .get(`/api/folders/${folder.id}/deletion-preview`)
        .set(auth())
        .expect(200);
      const token = preview.body as {
        version: number;
        expectedMembershipToken: string;
      };
      const competitor = () =>
        operation === 'edit'
          ? api()
              .put(`${path(r.id)}/content`)
              .set(auth())
              .send({
                ...loaded.content,
                name: 'Concurrent rename',
                expectedContentVersion: 0,
              })
          : operation === 'organize'
            ? api()
                .put(`/api/cocktails/${r.slug}/organization`)
                .set(auth())
                .send({
                  folderIds: [folder.id],
                  tagNames: [],
                  expectedVersion: 0,
                })
            : api()
                .delete(`/api/folders/${folder.id}`)
                .query({
                  expectedVersion: token.version,
                  expectedMembershipToken: token.expectedMembershipToken,
                })
                .set(auth());
      const deletion = () => remove(r.id, versions(0, organization));
      const held = await hold();
      const pending: Promise<request.Response>[] = [];
      try {
        pending.push(
          (deleteFirst ? deletion() : competitor()).then((res) => res),
        );
        await waiters(held.pid, 1);
        pending.push(
          (deleteFirst ? competitor() : deletion()).then((res) => res),
        );
        await waiters(held.pid, 2);
        await held.connection.query('COMMIT');
        const results = await Promise.all(pending);
        expect(results[0].status).toBe(200);
        expect(results[1].status).toBe(
          deleteFirst && operation !== 'folder' ? 404 : 409,
        );
        const row = await snapshot(r.id);
        expect(row.deletedAt !== null).toBe(deleteFirst);
        expect(row.contentVersion).toBe(
          deleteFirst || operation === 'edit' ? 1 : 0,
        );
        expect(row.organizationVersion).toBe(
          organization + (deleteFirst || operation !== 'edit' ? 1 : 0),
        );
        if (deleteFirst) {
          await restore(
            r.id,
            versions(row.contentVersion, row.organizationVersion),
          ).expect(200);
          expect((await snapshot(r.id)).name).toBe(loaded.content.name);
        }
      } finally {
        await held.connection.query('ROLLBACK');
        held.connection.release();
        await Promise.allSettled(pending);
      }
    },
  );

  it('restores immediately before the deadline, rejects equal/past deadlines, and never deletes retained rows', async () => {
    for (const offset of [60000, 0, -1]) {
      const r = await recipe();
      await remove(r.id).expect(200);
      await pool.query(
        `WITH instant AS MATERIALIZED (SELECT (clock_timestamp() + $2 * interval '1 millisecond')::timestamptz(3) AS value)
        UPDATE "Cocktail" SET "restoreUntil"=instant.value,
        "deletedAt"=((instant.value AT TIME ZONE 'UTC') - interval '30 days') AT TIME ZONE 'UTC'
        FROM instant WHERE "id"=$1`,
        [r.id, offset],
      );
      await restore(r.id).expect(offset > 0 ? 200 : 409);
      expect(await prisma.cocktail.count({ where: { id: r.id } })).toBe(1);
    }
  });

  it('refuses recovery when the deadline passes while waiting on a real workspace lock', async () => {
    const r = await recipe();
    await remove(r.id).expect(200);
    const held = await hold();
    await held.connection.query(
      `WITH instant AS MATERIALIZED (SELECT (clock_timestamp() + interval '2 seconds')::timestamptz(3) AS value)
      UPDATE "Cocktail" SET "restoreUntil"=instant.value,
      "deletedAt"=((instant.value AT TIME ZONE 'UTC')-interval '30 days') AT TIME ZONE 'UTC'
      FROM instant WHERE "id"=$1`,
      [r.id],
    );
    const pending = restore(r.id).then((res) => res);
    try {
      await waiters(held.pid, 1);
      // The HTTP transaction started before expiry and is actually blocked.
      // Cross the deadline using PostgreSQL time, without mocking the clock.
      let expired = false;
      const deadline = Date.now() + 4000;
      while (!expired && Date.now() < deadline) {
        const clock = await held.connection.query<{ expired: boolean }>(
          'SELECT "restoreUntil" <= clock_timestamp() AS expired FROM "Cocktail" WHERE "id"=$1',
          [r.id],
        );
        expired = clock.rows[0].expired;
        if (!expired) await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(expired).toBe(true);
      await held.connection.query('COMMIT');
      expect((await pending).status).toBe(409);
      expect((await snapshot(r.id)).contentVersion).toBe(1);
      expect(await prisma.cocktail.count({ where: { id: r.id } })).toBe(1);
      const listing = await api()
        .get('/api/cocktails/trash/entries?pageSize=100')
        .set(auth())
        .expect(200);
      const entries = listing.body as {
        items: { id: string; canRestore: boolean }[];
      };
      expect(entries.items.find((item) => item.id === r.id)).toMatchObject({
        canRestore: false,
      });
    } finally {
      await held.connection.query('ROLLBACK');
      held.connection.release();
      await Promise.allSettled([pending]);
    }
  });

  it.each([false, true])(
    'rolls back dates and both versions when PostgreSQL rejects the transition (restore=%s)',
    async (restoring) => {
      const r = await recipe();
      if (restoring) await remove(r.id).expect(200);
      const before = await snapshot(r.id);
      const name = `lifecycle_${randomUUID().replaceAll('-', '')}`;
      await pool.query(
        `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."id"='${r.id}' THEN RAISE EXCEPTION 'synthetic lifecycle failure'; END IF; RETURN NEW; END $$`,
      );
      await pool.query(
        `CREATE TRIGGER "${name}" AFTER UPDATE ON "Cocktail" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
      );
      try {
        await (restoring ? restore(r.id) : remove(r.id)).expect(500);
        expect(await snapshot(r.id)).toEqual(before);
      } finally {
        await pool.query(`DROP TRIGGER "${name}" ON "Cocktail"`);
        await pool.query(`DROP FUNCTION "${name}"()`);
      }
    },
  );

  it.each(['page=0', 'page=1000001', 'pageSize=101', 'page=1.5'])(
    'bounds pagination: %s',
    async (query) => {
      await api()
        .get(`/api/cocktails/trash/entries?${query}`)
        .set(auth())
        .expect(400);
    },
  );
});
