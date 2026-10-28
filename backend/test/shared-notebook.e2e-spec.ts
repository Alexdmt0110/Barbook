import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
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

describe('Shared notebook reads, catalogue and atomic creation over HTTP/PostgreSQL', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let owner: Actor;
  let member: Actor;
  let stranger: Actor;
  const spaces: string[] = [];
  const api = () => request(app.getHttpServer());
  const root = (id: string) => `/api/workspaces/${id}`;
  const list = (id: string) => `${root(id)}/cocktails`;
  async function space() {
    const w = await prisma.workspace.create({
      data: {
        name: 'Synthetic notebook',
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
  const create = (id: string, actor: Actor, body: object) =>
    api().post(list(id)).set(browserHeaders(actor)).send(body);
  const revoke = (id: string) =>
    api()
      .post(`${root(id)}/members/${member.user.id}/revoke`)
      .set(browserHeaders(owner))
      .send({ expectedAccessVersion: 0 });
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
      await prisma.cocktail.deleteMany({
        where: {
          workspaceId: {
            in: [
              ...spaces,
              owner.workspaceId,
              member.workspaceId,
              stranger.workspaceId,
            ],
          },
        },
      });
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

  it('shares MEMBER creation with OWNER, preserving personal recipes and ingredient catalogues', async () => {
    const w = await space();
    const payload = recipePayload({
      name: `Shared ${randomUUID()}`,
      notes: 'Shared notes',
    });
    const personal = await api()
      .post('/api/cocktails')
      .set(browserHeaders(owner))
      .send(payload)
      .expect(201);
    const created = await create(w.id, member, {
      ...payload,
      expectedAccessVersion: 0,
    }).expect(201);
    const recipe = created.body as {
      id: string;
      slug: string;
      accessVersion: number;
    };
    expect(recipe.accessVersion).toBe(0);
    expect(recipe.id).not.toBe((personal.body as { id: string }).id);
    const detail = await api()
      .get(`${list(w.id)}/${recipe.slug}`)
      .set(browserHeaders(owner))
      .expect(200);
    expect(detail.body).toMatchObject({
      id: recipe.id,
      notes: 'Shared notes',
      estimatedAbv: 40,
      accessVersion: 0,
      ingredients: [{ ingredient: { name: 'Gin' } }],
      steps: [{ content: 'Shaker puis filtrer.' }],
    });
    await api()
      .get(`${list(w.id)}?search=shared&pageSize=1`)
      .set(browserHeaders(owner))
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject({
          total: 1,
          page: 1,
          totalPages: 1,
          items: [{ id: recipe.id }],
        }),
      );
    await api()
      .get('/api/cocktails')
      .set(browserHeaders(member))
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ total: 0, items: [] }));
    await api()
      .get(`${root(w.id)}/ingredients?query=Gin`)
      .set(browserHeaders(member))
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject([{ name: 'Gin', defaultAbv: 40 }]),
      );
    const sharedIngredient = await prisma.ingredient.findUniqueOrThrow({
      where: { workspaceId_slug: { workspaceId: w.id, slug: 'gin' } },
    });
    const privateIngredient = await prisma.ingredient.findUniqueOrThrow({
      where: {
        workspaceId_slug: { workspaceId: owner.workspaceId, slug: 'gin' },
      },
    });
    expect(sharedIngredient.id).not.toBe(privateIngredient.id);
    await api()
      .get(`${list(w.id)}/${recipe.slug}`)
      .set(browserHeaders(stranger))
      .expect(404);
    await api()
      .get(`${root(w.id)}/ingredients?query=Gin`)
      .set(browserHeaders(stranger))
      .expect(404);
    await api()
      .get(`${list(owner.workspaceId)}/${recipe.slug}`)
      .set(browserHeaders(owner))
      .expect(404);
  });

  it('rejects missing/stale access versions, foreign workspaces and invalid CSRF before writing', async () => {
    const w = await space();
    const payload = recipePayload();
    for (const expectedAccessVersion of [undefined, null, 1])
      await create(w.id, member, { ...payload, expectedAccessVersion }).expect(
        409,
      );
    await create(w.id, stranger, {
      ...payload,
      expectedAccessVersion: 0,
    }).expect(404);
    await create(member.workspaceId, member, {
      ...payload,
      expectedAccessVersion: 0,
    }).expect(404);
    await api()
      .post(list(w.id))
      .set({ ...browserHeaders(member), 'X-Barbook-CSRF': 'invalid' })
      .send({ ...payload, expectedAccessVersion: 0 })
      .expect(403);
    await api().get(list(w.id)).expect(401);
    expect(await prisma.cocktail.count({ where: { workspaceId: w.id } })).toBe(
      0,
    );
    expect(
      await prisma.ingredient.count({ where: { workspaceId: w.id } }),
    ).toBe(0);
  });

  it('serializes duplicate creation, does not replay, and reserves slugs of logically deleted recipes', async () => {
    const w = await space();
    const body = { ...recipePayload(), expectedAccessVersion: 0 };
    const results = await Promise.all([
      create(w.id, owner, body),
      create(w.id, member, body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const id = (results.find((r) => r.status === 201)!.body as { id: string })
      .id;
    await prisma.cocktail.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        restoreUntil: new Date(Date.now() + 86400000),
        contentVersion: 1,
        organizationVersion: 1,
      },
    });
    await create(w.id, member, body).expect(409);
    await api()
      .get(list(w.id))
      .set(browserHeaders(owner))
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ total: 0, items: [] }));
    expect(await prisma.cocktail.count({ where: { workspaceId: w.id } })).toBe(
      1,
    );
  });

  it('rolls back recipe, ingredients, garnishes and steps when final persistence fails', async () => {
    const w = await space();
    const name = `nb_${randomUUID().replaceAll('-', '')}`;
    await pool.query(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM "Cocktail" WHERE "id"=NEW."cocktailId" AND "workspaceId"='${w.id}') THEN RAISE EXCEPTION 'synthetic recipe failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${name}" BEFORE INSERT ON "PreparationStep" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
    );
    try {
      await create(w.id, member, {
        ...recipePayload(),
        expectedAccessVersion: 0,
      }).expect(500);
      expect(
        await prisma.cocktail.count({ where: { workspaceId: w.id } }),
      ).toBe(0);
      expect(
        await prisma.ingredient.count({ where: { workspaceId: w.id } }),
      ).toBe(0);
      expect(
        await prisma.cocktailIngredient.count({ where: { workspaceId: w.id } }),
      ).toBe(0);
      expect(
        await prisma.garnishIngredient.count({ where: { workspaceId: w.id } }),
      ).toBe(0);
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS "${name}" ON "PreparationStep"`);
      await pool.query(`DROP FUNCTION IF EXISTS "${name}"()`);
    }
  });

  it.each([true, false])(
    'orders actual recipe creation against revocation (creation first=%s)',
    async (creationFirst) => {
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
      const pending: Promise<number>[] = [];
      const write = () =>
        create(w.id, member, {
          ...recipePayload(),
          expectedAccessVersion: 0,
        }).then((r) => r.status);
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
      try {
        pending.push(creationFirst ? write() : removal());
        await waitFor(1);
        pending.push(creationFirst ? removal() : write());
        await waitFor(2);
        await holder.query('COMMIT');
        expect(await Promise.all(pending)).toEqual(
          creationFirst ? [201, 200] : [200, 404],
        );
        expect(
          await prisma.cocktail.count({ where: { workspaceId: w.id } }),
        ).toBe(creationFirst ? 1 : 0);
        await api().get(list(w.id)).set(browserHeaders(member)).expect(404);
        await api()
          .get(`${root(w.id)}/ingredients?query=Gin`)
          .set(browserHeaders(member))
          .expect(404);
        await api()
          .post(`${root(w.id)}/members`)
          .set(browserHeaders(owner))
          .send({ email: member.user.email, expectedAccessVersion: 1 })
          .expect(200);
        await write().then((status) => expect(status).toBe(409));
      } finally {
        await holder.query('ROLLBACK');
        holder.release();
        await Promise.allSettled(pending);
      }
    },
  );
});
