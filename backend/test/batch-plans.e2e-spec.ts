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
interface Plan {
  id: string;
  name: string;
  version: number;
  sourceContentVersion: number;
  parameters: object;
  snapshot: { recipe: { content: object } };
  calculation: {
    completePortions: string;
    remainingMl: object;
    ingredients: { exact: object }[];
  };
  sourceChanged: boolean;
}
describe('Autonomous batch plans — real PostgreSQL/HTTP', () => {
  let app: NestExpressApplication,
    prisma: PrismaService,
    pool: Pool,
    owner: Actor,
    member: Actor,
    foreign: Actor,
    bar: string,
    other: string,
    recipe: string;
  const spaces: string[] = [];
  const api = () => request(app.getHttpServer());
  const root = (w = bar) => `/api/workspaces/${w}/batch-plans`;
  const options = () => ({
    mode: 'VOLUME_ML',
    target: 1000,
    includedPositions: [0, 1],
    rounding: [],
    expectedAccessVersion: 0,
  });
  const body = () => ({
    ...options(),
    sourceCocktailId: recipe,
    expectedContentVersion: 0,
    name: 'Base du service',
    requestId: randomUUID(),
  });
  const create = async (command = body(), actor = member, w = bar) =>
    (
      await api()
        .post(root(w))
        .set(browserHeaders(actor))
        .send(command)
        .expect(201)
    ).body as Plan;
  const detail = async (id: string) =>
    (await api().get(`${root()}/${id}`).set(browserHeaders(owner)).expect(200))
      .body as Plan;
  const revision = (p: Plan) => ({
    ...options(),
    name: p.name,
    target: 2000,
    expectedPlanVersion: p.version,
  });
  beforeAll(async () => {
    requireTestDatabase();
    pool = new Pool({ connectionString: requireTestDatabase() });
    app = await createApplicationFixture([], 3);
    prisma = app.get(PrismaService);
    owner = await createActor(app);
    member = await createActor(app);
    foreign = await createActor(app);
    for (const name of ['Batch Bar', 'Other Batch Bar'])
      spaces.push(
        (
          await prisma.workspace.create({
            data: {
              name,
              kind: 'SHARED',
              members: {
                create: [
                  { userId: owner.user.id, role: 'OWNER' },
                  { userId: member.user.id, role: 'MEMBER' },
                ],
              },
            },
          })
        ).id,
      );
    [bar, other] = spaces;
    const r = await api()
      .post(`/api/workspaces/${bar}/cocktails`)
      .set(browserHeaders(owner))
      .send({
        ...recipePayload({
          ingredients: [
            {
              ingredientName: 'Gin',
              amount: 45,
              unit: 'ML',
              ingredientDefaultAbv: 40,
            },
            {
              ingredientName: 'Vermouth',
              amount: 15,
              unit: 'ML',
              ingredientDefaultAbv: 0,
            },
            { ingredientName: 'Citron', amount: 30, unit: 'ML' },
          ],
        }),
        expectedAccessVersion: 0,
      })
      .expect(201);
    recipe = (r.body as { id: string }).id;
  });
  afterAll(async () => {
    try {
      await prisma.batchPlan.deleteMany({
        where: { workspaceId: { in: spaces } },
      });
      await prisma.stockMovement.deleteMany({
        where: { workspaceId: { in: spaces } },
      });
      await prisma.stockProduct.deleteMany({
        where: { workspaceId: { in: spaces } },
      });
      await prisma.workspace.deleteMany({ where: { id: { in: spaces } } });
      await prisma.user.deleteMany({
        where: { id: { in: [owner.user.id, member.user.id, foreign.user.id] } },
      });
    } finally {
      await app?.close();
      await pool?.end();
    }
  });
  it('previews without writing, persists a server snapshot and never changes physical stock or recipe data', async () => {
    await api()
      .post(`/api/workspaces/${bar}/inventory/products`)
      .set(browserHeaders(owner))
      .send({
        name: 'Bottle',
        packaging: '700mL',
        initialQuantity: 6,
        threshold: 2,
        target: 8,
        expectedAccessVersion: 0,
        requestId: randomUUID(),
      })
      .expect(201);
    const products = await prisma.stockProduct.findMany(),
      moves = await prisma.stockMovement.findMany(),
      recipes = await prisma.cocktail.findMany(),
      catalogue = await prisma.ingredient.findMany();
    const count = await prisma.batchPlan.count();
    await api()
      .post(`${root()}/preview`)
      .set(browserHeaders(member))
      .send({
        ...options(),
        sourceCocktailId: recipe,
        expectedContentVersion: 0,
      })
      .expect(201);
    expect(await prisma.batchPlan.count()).toBe(count);
    const p = await create();
    expect(p.calculation.completePortions).toBe('16');
    expect(p.calculation.remainingMl).toEqual({
      numerator: '40',
      denominator: '1',
    });
    expect(p.calculation.ingredients.map((l) => l.exact)).toEqual(
      [750, 250, 480].map((n) => ({ numerator: String(n), denominator: '1' })),
    );
    expect((await detail(p.id)).snapshot).toEqual(p.snapshot);
    const r = await api()
      .put(`${root()}/${p.id}`)
      .set(browserHeaders(owner))
      .send(revision(p))
      .expect(200);
    expect((r.body as Plan).version).toBe(1);
    expect(await prisma.stockProduct.findMany()).toEqual(products);
    expect(await prisma.stockMovement.findMany()).toEqual(moves);
    expect(await prisma.cocktail.findMany()).toEqual(recipes);
    expect(await prisma.ingredient.findMany()).toEqual(catalogue);
  });
  it('deduplicates an exact concurrent intention and keeps receipts private', async () => {
    const command = body(),
      before = await prisma.batchPlan.count();
    const rs = await Promise.all(
      [1, 2].map(() =>
        api().post(root()).set(browserHeaders(member)).send(command),
      ),
    );
    expect(rs.map((r) => r.status)).toEqual([201, 201]);
    expect((rs[0].body as Plan).id).toBe((rs[1].body as Plan).id);
    expect(await prisma.batchPlan.count()).toBe(before + 1);
    await api()
      .post(root())
      .set(browserHeaders(member))
      .send({ ...command, name: 'Different' })
      .expect(409);
    await api()
      .get(`/api/workspaces/${bar}/batch-plan-receipts/${command.requestId}`)
      .set(browserHeaders(member))
      .expect(200);
    await api()
      .get(`/api/workspaces/${bar}/batch-plan-receipts/${command.requestId}`)
      .set(browserHeaders(owner))
      .expect(404);
  });
  it('serializes two conflicting revisions and preserves versions for a true no-op', async () => {
    const p = await create();
    const command = revision(p);
    const rs = await Promise.all(
      [member, owner].map((a) =>
        api()
          .put(`${root()}/${p.id}`)
          .set(browserHeaders(a))
          .send({ ...command, name: a.user.id }),
      ),
    );
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    const current = await detail(p.id);
    expect(current.version).toBe(1);
    await api()
      .put(`${root()}/${p.id}`)
      .set(browserHeaders(member))
      .send({ ...command, name: current.name, expectedPlanVersion: 1 })
      .expect(200);
    expect((await detail(p.id)).version).toBe(1);
    await api()
      .put(`${root()}/${p.id}`)
      .set(browserHeaders(member))
      .send({ ...command, name: current.name })
      .expect(409);
    await api()
      .put(`${root()}/${p.id}`)
      .set(browserHeaders(member))
      .send({ ...command, expectedPlanVersion: undefined })
      .expect(409);
  });
  it('keeps frozen ABV/content when the recipe is edited and rejects an old source intention', async () => {
    const p = await create();
    const loaded = await api()
      .get(`/api/workspaces/${bar}/cocktails/id/${recipe}/content`)
      .set(browserHeaders(owner))
      .expect(200);
    const s = loaded.body as { content: Record<string, unknown> };
    await api()
      .put(`/api/workspaces/${bar}/cocktails/id/${recipe}/content`)
      .set(browserHeaders(owner))
      .send({
        ...s.content,
        name: 'New source name',
        expectedContentVersion: 0,
        expectedAccessVersion: 0,
      })
      .expect(200);
    const current = await detail(p.id);
    expect(current.sourceChanged).toBe(true);
    expect(current.snapshot).toEqual(p.snapshot);
    await api()
      .post(root())
      .set(browserHeaders(member))
      .send(body())
      .expect(409);
    await api()
      .put(`${root()}/${p.id}`)
      .set(browserHeaders(member))
      .send(revision(p))
      .expect(200);
    expect((await detail(p.id)).snapshot).toEqual(p.snapshot);
    // Following tests use the current source version explicitly rather than inferring it in the server.
  });
  it('protects foreign/personal scopes and refuses malformed/versionless previews without effects', async () => {
    const before = await prisma.batchPlan.count();
    for (const w of [owner.workspaceId, other, randomUUID()])
      await api()
        .post(root(w))
        .set(browserHeaders(member))
        .send({ ...body(), expectedContentVersion: 1 })
        .expect(404);
    await api().get(root()).set(browserHeaders(foreign)).expect(404);
    await api()
      .post(root())
      .set(browserHeaders(member))
      .send({
        ...body(),
        expectedContentVersion: 1,
        expectedAccessVersion: undefined,
      })
      .expect(409);
    await api()
      .post(root())
      .set(browserHeaders(member))
      .send({ ...body(), expectedContentVersion: undefined })
      .expect(409);
    for (const patch of [
      { target: 0 },
      { target: 1.0001 },
      { mode: 'UNKNOWN' },
      { includedPositions: [] },
      { includedPositions: [0, 0] },
      { rounding: [{ unit: 'TOP_UP', step: 1 }] },
      { snapshot: {} },
      { target: 1000001 },
    ])
      await api()
        .post(root())
        .set(browserHeaders(member))
        .send({ ...body(), expectedContentVersion: 1, ...patch })
        .expect(400);
    await api()
      .post(root())
      .set(browserHeaders(member))
      .send({
        ...body(),
        expectedContentVersion: 1,
        mode: 'PORTIONS',
        target: 10001,
      })
      .expect(400);
    await api().post(root()).send(body()).expect(403);
    expect(await prisma.batchPlan.count()).toBe(before);
  });
  it('rolls back a duplicated actor/key raced across independent Bars', async () => {
    const source = await api()
      .post(`/api/workspaces/${other}/cocktails`)
      .set(browserHeaders(owner))
      .send({ ...recipePayload(), expectedAccessVersion: 0 })
      .expect(201);
    const key = randomUUID(),
      before = await prisma.batchPlan.count();
    const commands = [
      {
        w: bar,
        command: { ...body(), requestId: key, expectedContentVersion: 1 },
      },
      {
        w: other,
        command: {
          ...body(),
          requestId: key,
          sourceCocktailId: (source.body as { id: string }).id,
          includedPositions: [0],
        },
      },
    ];
    const rs = await Promise.all(
      commands.map(({ w, command }) =>
        api().post(root(w)).set(browserHeaders(member)).send(command),
      ),
    );
    expect(rs.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.batchPlan.count()).toBe(before + 1);
  });
  it('takes a coherent source snapshot or refuses when source editing races creation', async () => {
    const r = await api()
      .post(`/api/workspaces/${bar}/cocktails`)
      .set(browserHeaders(owner))
      .send({ ...recipePayload(), expectedAccessVersion: 0 })
      .expect(201);
    const id = (r.body as { id: string }).id;
    const source = (
      await api()
        .get(`/api/workspaces/${bar}/cocktails/id/${id}/content`)
        .set(browserHeaders(owner))
        .expect(200)
    ).body as { content: Record<string, unknown> };
    const rs = await Promise.all([
      api()
        .put(`/api/workspaces/${bar}/cocktails/id/${id}/content`)
        .set(browserHeaders(owner))
        .send({
          ...source.content,
          name: 'Concurrent source edit',
          expectedContentVersion: 0,
          expectedAccessVersion: 0,
        }),
      api()
        .post(root())
        .set(browserHeaders(member))
        .send({ ...body(), sourceCocktailId: id, includedPositions: [0] }),
    ]);
    expect(rs[0].status).toBe(200);
    expect([201, 409]).toContain(rs[1].status);
    if (rs[1].status === 201) {
      const p = rs[1].body as Plan;
      expect(p.sourceContentVersion).toBe(0);
      expect(p.snapshot.recipe.content).toEqual(source.content);
      expect((await detail(p.id)).sourceChanged).toBe(true);
    }
  });
  it('rolls back a failed revision including name, parameters and version', async () => {
    const p = await create({ ...body(), expectedContentVersion: 1 });
    const saved = await detail(p.id),
      trigger = `batch_fault_${randomUUID().replaceAll('-', '')}`;
    await pool.query(
      `CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${p.id}' THEN RAISE EXCEPTION 'synthetic batch fault'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${trigger}" AFTER UPDATE ON "BatchPlan" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`,
    );
    try {
      await api()
        .put(`${root()}/${p.id}`)
        .set(browserHeaders(owner))
        .send({ ...revision(p), name: 'Must roll back' })
        .expect(500);
    } finally {
      await pool.query(`DROP TRIGGER "${trigger}" ON "BatchPlan"`);
      await pool.query(`DROP FUNCTION "${trigger}"()`);
    }
    expect(await detail(p.id)).toEqual(saved);
    await api()
      .put(`${root()}/${p.id}`)
      .set(browserHeaders(owner))
      .send(revision(p))
      .expect(200);
  });
  it.each([true, false])(
    'orders plan revision and revocation with real PostgreSQL waits (write first=%s)',
    async (writeFirst) => {
      const w = (
        await prisma.workspace.create({
          data: {
            name: 'Batch race',
            kind: 'SHARED',
            members: {
              create: [
                { userId: owner.user.id, role: 'OWNER' },
                { userId: member.user.id, role: 'MEMBER' },
              ],
            },
          },
        })
      ).id;
      spaces.push(w);
      const source = await api()
        .post(`/api/workspaces/${w}/cocktails`)
        .set(browserHeaders(owner))
        .send({ ...recipePayload(), expectedAccessVersion: 0 })
        .expect(201);
      const p = await create(
        {
          ...body(),
          sourceCocktailId: (source.body as { id: string }).id,
          includedPositions: [0],
        },
        member,
        w,
      );
      const holder = await pool.connect(),
        pending: Promise<number>[] = [];
      await holder.query('BEGIN');
      const pid = (
        await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
      ).rows[0].pid;
      await holder.query(
        'SELECT id FROM "Workspace" WHERE id=$1 FOR NO KEY UPDATE',
        [w],
      );
      const command = { ...revision(p), includedPositions: [0] };
      const write = () =>
        api()
          .put(`${root(w)}/${p.id}`)
          .set(browserHeaders(member))
          .send(command)
          .then((r) => r.status);
      const revoke = () =>
        api()
          .post(`/api/workspaces/${w}/members/${member.user.id}/revoke`)
          .set(browserHeaders(owner))
          .send({ expectedAccessVersion: 0 })
          .then((r) => r.status);
      async function blocked(count: number) {
        const end = Date.now() + 5000;
        while (Date.now() < end) {
          const r = await pool.query(
            'WITH RECURSIVE blocked(pid) AS (SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid)) UNION SELECT a.pid FROM pg_stat_activity a JOIN blocked b ON b.pid=ANY(pg_blocking_pids(a.pid))) SELECT DISTINCT pid FROM blocked',
            [pid],
          );
          if (r.rowCount! >= count) return;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error('No observed PostgreSQL batch/revocation wait');
      }
      try {
        pending.push(writeFirst ? write() : revoke());
        await blocked(1);
        pending.push(writeFirst ? revoke() : write());
        await blocked(2);
        await holder.query('COMMIT');
        expect(await Promise.all(pending)).toEqual(
          writeFirst ? [200, 200] : [200, 404],
        );
        expect(
          (await prisma.batchPlan.findUniqueOrThrow({ where: { id: p.id } }))
            .version,
        ).toBe(writeFirst ? 1 : 0);
        await api()
          .get(`${root(w)}/${p.id}`)
          .set(browserHeaders(member))
          .expect(404);
        await api()
          .post(`/api/workspaces/${w}/members`)
          .set(browserHeaders(owner))
          .send({ email: member.user.email, expectedAccessVersion: 1 })
          .expect(200);
        await api()
          .put(`${root(w)}/${p.id}`)
          .set(browserHeaders(member))
          .send(command)
          .expect(409);
        await api()
          .put(`${root(w)}/${p.id}`)
          .set(browserHeaders(member))
          .send({
            ...command,
            expectedAccessVersion: 2,
            expectedPlanVersion: writeFirst ? 1 : 0,
          })
          .expect(200);
      } finally {
        await holder.query('ROLLBACK');
        holder.release();
        await Promise.allSettled(pending);
      }
    },
  );
});
