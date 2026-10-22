import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
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
describe('Atomic personal content editing over real HTTP and PostgreSQL', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let alice: Actor;
  let bob: Actor;
  const api = () => request(app.getHttpServer());
  const auth = () => browserHeaders(alice);
  const path = (id: string) => `/api/cocktails/id/${id}/content`;
  async function recipe(actor = alice) {
    const result = await api()
      .post('/api/cocktails')
      .set(browserHeaders(actor))
      .send(recipePayload())
      .expect(201);
    return result.body as { id: string; slug: string };
  }
  async function get(id: string): Promise<Content> {
    const result = await api().get(path(id)).set(auth()).expect(200);
    return result.body as Content;
  }
  const put = (id: string, payload: object) =>
    api().put(path(id)).set(auth()).send(payload);
  const stored = (id: string) =>
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
        // Only this suite's disposable recipes; release legacy Restrict references before workspace cascades.
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

  it('round trips unchanged content without touching versions, child identities, catalogue or another recipe', async () => {
    const created = await recipe();
    const other = await recipe();
    const original = await stored(created.id);
    const untouched = await stored(other.id);
    const catalogue = await prisma.ingredient.findMany({
      where: { workspaceId: alice.workspaceId },
      orderBy: { id: 'asc' },
    });
    const loaded = await get(created.id);
    expect(loaded).toMatchObject({
      id: created.id,
      slug: created.slug,
      contentVersion: 0,
      organizationVersion: 0,
    });
    expect(loaded.content.ingredients[0]).toMatchObject({
      abvMode: 'INHERIT',
      abvOverride: null,
      ingredientDefaultAbv: 40,
    });
    await put(created.id, { ...loaded.content, expectedContentVersion: 0 })
      .expect(200)
      .expect(loaded);
    expect(await stored(created.id)).toEqual(original);
    expect(await stored(other.id)).toEqual(untouched);
    expect(
      await prisma.ingredient.findMany({
        where: { workspaceId: alice.workspaceId },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(catalogue);
  });

  it('renames without changing slug, workspace, image, folders or tags and searches by the new display name', async () => {
    const created = await recipe();
    const folder = await prisma.folder.create({
      data: { workspaceId: alice.workspaceId, name: randomUUID() },
    });
    await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set(auth())
      .send({
        folderIds: [folder.id],
        expectedVersion: 0,
        tagNames: ['Preserved'],
      })
      .expect(200);
    await prisma.cocktail.update({
      where: { id: created.id },
      data: { imageUrl: '/synthetic/retained.png' },
    });
    const before = await stored(created.id);
    const loaded = await get(created.id);
    const name = `Renamed ${randomUUID()}`;
    const saved = await put(created.id, {
      ...loaded.content,
      name,
      expectedContentVersion: 0,
    }).expect(200);
    expect(saved.body).toMatchObject({
      id: created.id,
      slug: created.slug,
      contentVersion: 1,
      organizationVersion: 1,
      content: { name },
    });
    const after = await stored(created.id);
    expect(after).toMatchObject({
      id: before.id,
      workspaceId: before.workspaceId,
      slug: before.slug,
      folderId: before.folderId,
      imageUrl: before.imageUrl,
      organizationVersion: 1,
    });
    expect(after.folderMemberships).toEqual(before.folderMemberships);
    expect(after.tags).toEqual(before.tags);
    await api()
      .get(`/api/cocktails/${created.slug}`)
      .set(auth())
      .expect(200)
      .expect((r: request.Response) =>
        expect(r.body).toHaveProperty('name', name),
      );
    await api()
      .get('/api/cocktails')
      .query({ search: name })
      .set(auth())
      .expect(200)
      .expect((r: request.Response) =>
        expect(r.body).toHaveProperty('items.0.id', created.id),
      );
    await api()
      .post('/api/cocktails')
      .set(auth())
      .send(recipePayload({ name: before.name }))
      .expect(409);
  });

  it('preserves inherit, unknown catalogue, explicit unknown, zero and equal overrides with honest ABV readers', async () => {
    const created = await recipe();
    const loaded = await get(created.id);
    const suffix = randomUUID();
    const ingredients = [
      {
        ingredientName: 'Gin',
        ingredientDefaultAbv: 99,
        abvMode: 'INHERIT',
        abvOverride: null,
      },
      {
        ingredientName: `Unknown ${suffix}`,
        ingredientDefaultAbv: null,
        abvMode: 'INHERIT',
        abvOverride: null,
      },
      {
        ingredientName: `Explicit unknown ${suffix}`,
        ingredientDefaultAbv: 35,
        abvMode: 'UNKNOWN',
        abvOverride: null,
      },
      {
        ingredientName: `Zero ${suffix}`,
        ingredientDefaultAbv: 40,
        abvMode: 'OVERRIDE',
        abvOverride: 0,
      },
      {
        ingredientName: `Equal ${suffix}`,
        ingredientDefaultAbv: 40,
        abvMode: 'OVERRIDE',
        abvOverride: 40,
      },
      {
        ingredientName: `Other ${suffix}`,
        ingredientDefaultAbv: 25,
        abvMode: 'OVERRIDE',
        abvOverride: 37,
      },
    ].map((line) => ({
      ...line,
      amount: 12.345,
      unit: 'ML',
      specification: 'Exact',
      notes: 'Kept',
    }));
    await put(created.id, {
      ...loaded.content,
      ingredients,
      expectedContentVersion: 0,
    }).expect(200);
    const current = await get(created.id);
    expect(
      current.content.ingredients.map((line) => [
        line.abvMode,
        line.abvOverride,
        line.ingredientDefaultAbv,
      ]),
    ).toEqual([
      ['INHERIT', null, 40],
      ['INHERIT', null, null],
      ['UNKNOWN', null, 35],
      ['OVERRIDE', 0, 40],
      ['OVERRIDE', 40, 40],
      ['OVERRIDE', 37, 25],
    ]);
    const before = await stored(created.id);
    await put(created.id, { ...current.content, expectedContentVersion: 1 })
      .expect(200)
      .expect(current);
    expect(await stored(created.id)).toEqual(before);
    const detail = await api()
      .get(`/api/cocktails/${created.slug}`)
      .set(auth())
      .expect(200);
    expect(detail.body).toHaveProperty('estimatedAbv', null);
    expect(detail.body).toHaveProperty('ingredients.2.abv', null);
    expect(detail.body).toHaveProperty('ingredients.3.abv', 0);
    expect(detail.body).toHaveProperty('ingredients.4.abv', 40);
    expect(
      (
        await prisma.ingredient.findUniqueOrThrow({
          where: {
            workspaceId_slug: { workspaceId: alice.workspaceId, slug: 'gin' },
          },
        })
      ).defaultAbv?.toString(),
    ).toBe('40');
  });

  it.each([undefined, null])(
    'requires a supplied content version, even for unchanged content: %s',
    async (expectedContentVersion) => {
      const created = await recipe();
      const loaded = await get(created.id);
      const before = await stored(created.id);
      await put(created.id, {
        ...loaded.content,
        expectedContentVersion,
      }).expect(409);
      expect(await stored(created.id)).toEqual(before);
    },
  );

  it('refuses contradictory modes and invalid main alcohol without changing existing data or catalogue', async () => {
    const created = await recipe();
    const loaded = await get(created.id);
    const before = await stored(created.id);
    for (const change of [
      { abvMode: 'UNKNOWN', abvOverride: 0 },
      { abvMode: 'INHERIT', abvOverride: 40 },
      { abvMode: 'OVERRIDE', abvOverride: null },
    ]) {
      await put(created.id, {
        ...loaded.content,
        ingredients: [{ ...loaded.content.ingredients[0], ...change }],
        expectedContentVersion: 0,
      }).expect(400);
    }
    await put(created.id, {
      ...loaded.content,
      ingredients: [{ ...loaded.content.ingredients[0], abvMode: 'UNKNOWN' }],
      expectedContentVersion: 0,
    }).expect(400);
    await put(created.id, {
      ...loaded.content,
      mainAlcoholName: 'Missing',
      expectedContentVersion: 0,
    }).expect(400);
    expect(await stored(created.id)).toEqual(before);
  });

  it.each([
    'Cocktail',
    'CocktailIngredient',
    'GarnishIngredient',
    'PreparationStep',
  ])(
    'rolls back the full replacement and new catalogue rows on failure at %s',
    async (table) => {
      const created = await recipe();
      const loaded = await get(created.id);
      const before = await stored(created.id);
      const ingredientName = `New rollback ${randomUUID()}`;
      const name = `bb_content_${randomUUID().replaceAll('-', '')}`;
      const event = table === 'Cocktail' ? 'UPDATE' : 'INSERT';
      const key = table === 'Cocktail' ? 'id' : 'cocktailId';
      await pool.query(
        `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."${key}"='${created.id}' THEN RAISE EXCEPTION 'synthetic content failure'; END IF; RETURN NEW; END $$`,
      );
      await pool.query(
        `CREATE TRIGGER "${name}" BEFORE ${event} ON "${table}" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
      );
      try {
        await put(created.id, {
          ...loaded.content,
          name: 'Must roll back',
          mainAlcoholName: null,
          ingredients: [
            { ingredientName, amount: 25, unit: 'ML', abvMode: 'UNKNOWN' },
          ],
          expectedContentVersion: 0,
        }).expect(500);
        expect(await stored(created.id)).toEqual(before);
        expect(
          await prisma.ingredient.count({
            where: { workspaceId: alice.workspaceId, name: ingredientName },
          }),
        ).toBe(0);
      } finally {
        await pool.query(`DROP TRIGGER "${name}" ON "${table}"`);
        await pool.query(`DROP FUNCTION "${name}"()`);
      }
    },
  );

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
  async function waiters(pid: number) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const result = await pool.query(
        'SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',
        [pid],
      );
      if (result.rows.length >= 2) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Expected two actual PostgreSQL lock waits.');
  }
  it('allows one of two blocked editors and rejects a stale replay after a committed response is discarded', async () => {
    const created = await recipe();
    const loaded = await get(created.id);
    const held = await hold();
    const commands = ['First edit', 'Second edit'].map((name) => ({
      ...loaded.content,
      name,
      expectedContentVersion: 0,
    }));
    const pending = commands.map((command) =>
      put(created.id, command).then((r) => r),
    );
    try {
      await waiters(held.pid);
      await held.connection.query('COMMIT');
      const results = await Promise.all(pending);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const winner = results.findIndex((r) => r.status === 200);
      const current = await get(created.id);
      expect(current).toMatchObject({
        contentVersion: 1,
        organizationVersion: 0,
        content: { name: commands[winner].name },
      });
      await put(created.id, commands[winner]).expect(409);
      expect(await get(created.id)).toEqual(current);
    } finally {
      await held.connection.query('ROLLBACK');
      held.connection.release();
      await Promise.allSettled(pending);
    }
  });

  it('commits disjoint content and organization writes with independent versions under real contention', async () => {
    const created = await recipe();
    const loaded = await get(created.id);
    const folder = await prisma.folder.create({
      data: { workspaceId: alice.workspaceId, name: randomUUID() },
    });
    const held = await hold();
    const pending = [
      put(created.id, {
        ...loaded.content,
        notes: 'Independent edit',
        expectedContentVersion: 0,
      }).then((r) => r),
      api()
        .put(`/api/cocktails/${created.slug}/organization`)
        .set(auth())
        .send({ folderIds: [folder.id], tagNames: [], expectedVersion: 0 })
        .then((r) => r),
    ];
    try {
      await waiters(held.pid);
      await held.connection.query('COMMIT');
      expect((await Promise.all(pending)).map((r) => r.status)).toEqual([
        200, 200,
      ]);
      expect(await stored(created.id)).toMatchObject({
        notes: 'Independent edit',
        contentVersion: 1,
        organizationVersion: 1,
        folderId: folder.id,
      });
    } finally {
      await held.connection.query('ROLLBACK');
      held.connection.release();
      await Promise.allSettled(pending);
    }
  });

  it('keeps unknown, foreign and deleted IDs private and preserves session/CSRF boundaries', async () => {
    const own = await recipe();
    const foreign = await recipe(bob);
    const deleted = await recipe();
    const loaded = await get(own.id);
    await pool.query(
      `UPDATE "Cocktail" SET "deletedAt"=TIMESTAMPTZ '2026-01-01T00:00:00Z', "restoreUntil"=TIMESTAMPTZ '2026-01-31T00:00:00Z' WHERE "id"=$1`,
      [deleted.id],
    );
    for (const id of [foreign.id, deleted.id, randomUUID()]) {
      await api().get(path(id)).set(auth()).expect(404);
      await put(id, { ...loaded.content, expectedContentVersion: 0 }).expect(
        404,
      );
    }
    await api().get(path(own.id)).expect(401);
    const headers = auth();
    delete headers['X-Barbook-CSRF'];
    await api()
      .put(path(own.id))
      .set(headers)
      .send({ ...loaded.content, expectedContentVersion: 0 })
      .expect(403);
    await api()
      .put(path(own.id))
      .set({ ...auth(), 'X-Barbook-Expected-User': bob.user.id })
      .send({ ...loaded.content, expectedContentVersion: 0 })
      .expect(409);
    expect((await stored(own.id)).contentVersion).toBe(0);
  });

  it('rejects the old content intention after a synthetic retained-ID deletion/restoration barrier', async () => {
    const created = await recipe();
    const loaded = await get(created.id);
    const held = await hold();
    try {
      await held.connection.query(
        `UPDATE "Cocktail" SET "deletedAt"=TIMESTAMPTZ '2026-01-01T00:00:00Z', "restoreUntil"=TIMESTAMPTZ '2026-01-31T00:00:00Z', "contentVersion"="contentVersion"+1, "organizationVersion"="organizationVersion"+1 WHERE "id"=$1`,
        [created.id],
      );
      await held.connection.query(
        'UPDATE "Cocktail" SET "deletedAt"=NULL, "restoreUntil"=NULL, "contentVersion"="contentVersion"+1, "organizationVersion"="organizationVersion"+1 WHERE "id"=$1',
        [created.id],
      );
      await held.connection.query('COMMIT');
    } finally {
      await held.connection.query('ROLLBACK');
      held.connection.release();
    }
    await put(created.id, {
      ...loaded.content,
      name: 'Obsolete edit',
      expectedContentVersion: 0,
    }).expect(409);
    expect(await get(created.id)).toMatchObject({
      id: created.id,
      slug: created.slug,
      contentVersion: 2,
      organizationVersion: 2,
      content: { name: loaded.content.name },
    });
  });
});
