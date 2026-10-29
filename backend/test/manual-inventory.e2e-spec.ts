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
  originHeaders,
  recipePayload,
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';
interface Product {
  id: string;
  quantity: number;
  threshold: number;
  target: number;
  version: number;
}
interface Result {
  product: Product;
  receipt: {
    id: string;
    productId: string;
    beforeQuantity: number;
    afterQuantity: number;
    productVersion: number;
  };
}

describe('Manual inventory — real PostgreSQL/HTTP, independent physical units', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let owner: Actor, member: Actor, foreign: Actor;
  let bar: string, otherBar: string;
  const spaces: string[] = [];
  const api = () => request(app.getHttpServer());
  const root = (workspace = bar) => `/api/workspaces/${workspace}/inventory`;
  const createBody = (quantity = 6) => ({
    name: 'Paddy',
    packaging: 'Bouteille 700 mL',
    initialQuantity: quantity,
    threshold: 2,
    target: 8,
    expectedAccessVersion: 0,
    requestId: randomUUID(),
  });
  const create = async (quantity = 6, actor = owner, workspace = bar) => {
    const r = await api()
      .post(`${root(workspace)}/products`)
      .set(browserHeaders(actor))
      .send(createBody(quantity))
      .expect(201);
    return (r.body as Result).product;
  };
  const movement = (
    p: Product,
    kind: 'ADD' | 'REMOVE' | 'SET' = 'REMOVE',
    amount = 1,
  ) => ({
    kind,
    amount,
    reason: 'Comptage manuel',
    expectedProductVersion: p.version,
    expectedAccessVersion: 0,
    requestId: randomUUID(),
  });
  const move = (
    p: Product,
    body: object = movement(p),
    actor = member,
    workspace = bar,
  ) =>
    api()
      .post(`${root(workspace)}/products/${p.id}/movements`)
      .set(browserHeaders(actor))
      .send(body);
  const get = async (p: Product) =>
    (
      await api()
        .get(`${root()}/products/${p.id}`)
        .set(browserHeaders(owner))
        .expect(200)
    ).body as Product;
  beforeAll(async () => {
    pool = new Pool({ connectionString: requireTestDatabase() });
    app = await createApplicationFixture([], 3);
    prisma = app.get(PrismaService);
    owner = await createActor(app);
    member = await createActor(app);
    foreign = await createActor(app);
    bar = (
      await prisma.workspace.create({
        data: {
          name: 'Inventory Bar',
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
    otherBar = (
      await prisma.workspace.create({
        data: {
          name: 'Other inventory Bar',
          kind: 'SHARED',
          members: { create: { userId: owner.user.id, role: 'OWNER' } },
        },
      })
    ).id;
  });
  beforeAll(() => {
    spaces.push(bar, otherBar);
  });
  afterAll(async () => {
    try {
      await prisma.stockMovement.deleteMany({
        where: { workspaceId: { in: spaces } },
      });
      await prisma.stockProduct.deleteMany({
        where: { workspaceId: { in: spaces } },
      });
      await prisma.workspace.deleteMany({
        where: { id: { in: spaces } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [owner.user.id, member.user.id, foreign.user.id] } },
      });
    } finally {
      await app?.close();
      await pool?.end();
    }
  });

  it('records INITIAL6, +1→7, −1→6, correction→2 with exact author/history and leaves recipes untouched', async () => {
    const recipe = () => {
      const payload = recipePayload();
      payload.mainAlcoholName = 'Paddy';
      payload.ingredients[0].ingredientName = 'Paddy';
      return payload;
    };
    await api()
      .post('/api/cocktails')
      .set(browserHeaders(owner))
      .send(recipe())
      .expect(201);
    await api()
      .post(`/api/workspaces/${bar}/cocktails`)
      .set(browserHeaders(member))
      .send({ ...recipe(), expectedAccessVersion: 0 })
      .expect(201);
    const before = await prisma.cocktail.findMany({ orderBy: { id: 'asc' } });
    expect(
      before.filter((recipe) =>
        [bar, owner.workspaceId].includes(recipe.workspaceId),
      ),
    ).toHaveLength(2);
    let p = await create();
    expect(p).toMatchObject({ quantity: 6, version: 0 });
    p = ((await move(p, movement(p, 'ADD', 1)).expect(201)).body as Result)
      .product;
    expect(p.quantity).toBe(7);
    p = ((await move(p).expect(201)).body as Result).product;
    expect(p.quantity).toBe(6);
    p = ((await move(p, movement(p, 'SET', 2)).expect(201)).body as Result)
      .product;
    expect(p).toMatchObject({ quantity: 2, version: 3 });
    const history = await api()
      .get(`${root()}/products/${p.id}/movements`)
      .set(browserHeaders(member))
      .expect(200);
    expect((history.body as { items: unknown[] }).items).toMatchObject([
      {
        kind: 'SET',
        beforeQuantity: 6,
        afterQuantity: 2,
        delta: -4,
        productVersion: 3,
        actor: { id: member.user.id },
      },
      {
        kind: 'REMOVE',
        beforeQuantity: 7,
        afterQuantity: 6,
        delta: -1,
        productVersion: 2,
        actor: { id: member.user.id },
      },
      {
        kind: 'ADD',
        beforeQuantity: 6,
        afterQuantity: 7,
        delta: 1,
        productVersion: 1,
        actor: { id: member.user.id },
      },
      {
        kind: 'INITIAL',
        beforeQuantity: 0,
        afterQuantity: 6,
        delta: 6,
        productVersion: 0,
        actor: { id: owner.user.id },
      },
    ]);
    expect(await prisma.cocktail.findMany({ orderBy: { id: 'asc' } })).toEqual(
      before,
    );
    const stockBefore = await prisma.stockProduct.findMany({
      orderBy: { id: 'asc' },
    });
    const historyBefore = await prisma.stockMovement.findMany({
      orderBy: { id: 'asc' },
    });
    await api()
      .post(`/api/workspaces/${bar}/cocktails`)
      .set(browserHeaders(member))
      .send({ ...recipe(), expectedAccessVersion: 0 })
      .expect(201);
    expect(
      await prisma.stockProduct.findMany({ orderBy: { id: 'asc' } }),
    ).toEqual(stockBefore);
    expect(
      await prisma.stockMovement.findMany({ orderBy: { id: 'asc' } }),
    ).toEqual(historyBefore);
  });
  it('deduplicates simultaneous creations and movements, and refuses a reused key with a different payload', async () => {
    const body = createBody();
    const responses = await Promise.all(
      [1, 2].map(() =>
        api().post(`${root()}/products`).set(browserHeaders(owner)).send(body),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    const p = (responses[0].body as Result).product;
    expect((responses[1].body as Result).product.id).toBe(p.id);
    const command = movement(p);
    const moves = await Promise.all([move(p, command), move(p, command)]);
    expect(moves.map((r) => r.status)).toEqual([201, 201]);
    expect((moves[0].body as Result).receipt.id).toBe(
      (moves[1].body as Result).receipt.id,
    );
    await move(p, { ...command, amount: 2 }).expect(409);
    expect(await get(p)).toMatchObject({ quantity: 5, version: 1 });
    expect(
      await prisma.stockMovement.count({ where: { productId: p.id } }),
    ).toBe(2);
    await api()
      .get(`${root()}/receipts/${command.requestId}`)
      .set(browserHeaders(member))
      .expect(200)
      .expect((r) => expect((r.body as Result).receipt.afterQuantity).toBe(5));
    await api()
      .get(`${root()}/receipts/${command.requestId}`)
      .set(browserHeaders(owner))
      .expect(404);
  });
  it('rolls back a duplicate actor/key raced across two independently locked Bars', async () => {
    const body = createBody();
    const before = await prisma.stockProduct.count();
    const responses = await Promise.all(
      [bar, otherBar].map((w) =>
        api()
          .post(`${root(w)}/products`)
          .set(browserHeaders(owner))
          .send(body),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.stockProduct.count()).toBe(before + 1);
    expect(
      await prisma.stockMovement.count({
        where: { actorId: owner.user.id, requestId: body.requestId },
      }),
    ).toBe(1);
  });
  it('allows one of two different concurrent writes and refuses the stale one without silent loss', async () => {
    const p = await create();
    const rs = await Promise.all([move(p), move(p)]);
    expect(rs.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await get(p)).toMatchObject({ quantity: 5, version: 1 });
    expect(
      await prisma.stockMovement.count({ where: { productId: p.id } }),
    ).toBe(2);
  });
  it('requires both preconditions and refuses underflow, zero changes and overflow without history', async () => {
    const p = await create(0);
    await move(p).expect(400);
    await move(p, movement(p, 'ADD', 0)).expect(400);
    await move(p, movement(p, 'SET', 0)).expect(400);
    await move(p, { ...movement(p), expectedProductVersion: undefined }).expect(
      409,
    );
    await move(p, { ...movement(p), expectedAccessVersion: undefined }).expect(
      409,
    );
    expect(await get(p)).toMatchObject({ quantity: 0, version: 0 });
    expect(
      await prisma.stockMovement.count({ where: { productId: p.id } }),
    ).toBe(1);
    const max = await create(2147483647);
    await move(max, movement(max, 'ADD', 1)).expect(400);
    expect((await get(max)).quantity).toBe(2147483647);
    await prisma.stockProduct.update({
      where: { id: max.id },
      data: { version: 2147483647 },
    });
    await move(
      { ...max, version: 2147483647 },
      movement({ ...max, version: 2147483647 }, 'REMOVE', 1),
    ).expect(409);
  });
  it('restricts product creation/settings to OWNER while MEMBER counts, and preserves versions on no-op settings', async () => {
    await api()
      .post(`${root()}/products`)
      .set(browserHeaders(member))
      .send(createBody())
      .expect(404);
    const p = await create();
    const settings = {
      threshold: 3,
      target: 9,
      expectedProductVersion: 0,
      expectedAccessVersion: 0,
    };
    await api()
      .put(`${root()}/products/${p.id}`)
      .set(browserHeaders(member))
      .send(settings)
      .expect(404);
    const changed = await api()
      .put(`${root()}/products/${p.id}`)
      .set(browserHeaders(owner))
      .send(settings)
      .expect(200);
    expect((changed.body as Product).version).toBe(1);
    await move(p).expect(409);
    await api()
      .put(`${root()}/products/${p.id}`)
      .set(browserHeaders(owner))
      .send({ ...settings, expectedProductVersion: 1 })
      .expect(200)
      .expect((r) => expect((r.body as Product).version).toBe(1));
    expect(
      await prisma.stockMovement.count({ where: { productId: p.id } }),
    ).toBe(1);
  });
  it('serializes settings and movements against the same loaded product version', async () => {
    const p = await create();
    const rs = await Promise.all([
      move(p),
      api().put(`${root()}/products/${p.id}`).set(browserHeaders(owner)).send({
        threshold: 3,
        target: 9,
        expectedProductVersion: 0,
        expectedAccessVersion: 0,
      }),
    ]);
    expect(rs.filter((r) => r.status === 409)).toHaveLength(1);
    expect(rs.filter((r) => [200, 201].includes(r.status))).toHaveLength(1);
    expect((await get(p)).version).toBe(1);
  });
  it('computes inclusive reorder suggestions across the entire Bar with explicit stock/threshold/target', async () => {
    const p = await create(2);
    const r = await api()
      .get(`${root()}/reorder?pageSize=100`)
      .set(browserHeaders(member))
      .expect(200);
    expect((r.body as { items: unknown[] }).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: p.id,
          quantity: 2,
          threshold: 2,
          target: 8,
          suggestedQuantity: 6,
        }),
      ]),
    );
    await move(p, movement(p, 'ADD', 1)).expect(201);
    const next = await api()
      .get(`${root()}/reorder?pageSize=100`)
      .set(browserHeaders(member))
      .expect(200);
    expect(
      (next.body as { items: Product[] }).items.find((x) => x.id === p.id),
    ).toBeUndefined();
    const settings = await create(2);
    await api()
      .put(`${root()}/products/${settings.id}`)
      .set(browserHeaders(owner))
      .send({
        threshold: 2,
        target: 1,
        expectedProductVersion: 0,
        expectedAccessVersion: 0,
      })
      .expect(200);
    const zero = await api()
      .get(`${root()}/reorder?pageSize=100`)
      .set(browserHeaders(owner))
      .expect(200);
    expect((zero.body as { items: unknown[] }).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: settings.id, suggestedQuantity: 0 }),
      ]),
    );
  });
  it('hides foreign/unknown/Personal workspace and product IDs, including receipts', async () => {
    const p = await create();
    for (const actor of [foreign])
      await api()
        .get(`${root()}/products`)
        .set(browserHeaders(actor))
        .expect(404);
    await api()
      .get(`${root(owner.workspaceId)}/products`)
      .set(browserHeaders(owner))
      .expect(404);
    await api()
      .get(`${root(otherBar)}/products/${p.id}`)
      .set(browserHeaders(owner))
      .expect(404);
    await move(p, movement(p), owner, otherBar).expect(404);
    await move({ ...p, id: randomUUID() }).expect(404);
    await api()
      .get(`${root(otherBar)}/receipts/${randomUUID()}`)
      .set(browserHeaders(owner))
      .expect(404);
  });
  it.each([
    { initialQuantity: -1 },
    { initialQuantity: 1.5 },
    { initialQuantity: '2' },
    { threshold: -1 },
    { target: 2147483648 },
    { name: ' ' },
    { packaging: '' },
    { requestId: 'bad' },
    { workspaceId: 'forged' },
    { role: 'OWNER' },
  ])('rejects hostile product payload %j without a row', async (change) => {
    const before = await prisma.stockProduct.count();
    await api()
      .post(`${root()}/products`)
      .set(browserHeaders(owner))
      .send({ ...createBody(), ...change })
      .expect(400);
    expect(await prisma.stockProduct.count()).toBe(before);
  });
  it('enforces trusted browser headers, cookie session and CSRF without effects', async () => {
    const before = await prisma.stockProduct.count();
    await api().post(`${root()}/products`).send(createBody()).expect(403);
    await api()
      .post(`${root()}/products`)
      .set(originHeaders())
      .send(createBody())
      .expect(401);
    await api()
      .post(`${root()}/products`)
      .set({ ...browserHeaders(owner), 'X-Barbook-CSRF': 'invalid' })
      .send(createBody())
      .expect(403);
    expect(await prisma.stockProduct.count()).toBe(before);
  });
  it('rolls back both counter and creation when history insertion fails, then accepts the same explicit intention once', async () => {
    const p = await create();
    const command = movement(p);
    const trigger = `stock_fault_${randomUUID().replaceAll('-', '')}`;
    await pool.query(
      `CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."requestId"::text='${command.requestId}' THEN RAISE EXCEPTION 'synthetic stock fault'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${trigger}" BEFORE INSERT ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`,
    );
    try {
      await move(p, command).expect(500);
    } finally {
      await pool.query(`DROP TRIGGER "${trigger}" ON "StockMovement"`);
      await pool.query(`DROP FUNCTION "${trigger}"()`);
    }
    expect(await get(p)).toMatchObject({ quantity: 6, version: 0 });
    expect(
      await prisma.stockMovement.count({ where: { productId: p.id } }),
    ).toBe(1);
    await move(p, command).expect(201);
    expect(await get(p)).toMatchObject({ quantity: 5, version: 1 });
    const createCommand = createBody();
    const trigger2 = `stock_create_fault_${randomUUID().replaceAll('-', '')}`;
    await pool.query(
      `CREATE FUNCTION "${trigger2}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."requestId"::text='${createCommand.requestId}' THEN RAISE EXCEPTION 'synthetic initial stock fault'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${trigger2}" BEFORE INSERT ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION "${trigger2}"()`,
    );
    const before = await prisma.stockProduct.count();
    try {
      await api()
        .post(`${root()}/products`)
        .set(browserHeaders(owner))
        .send(createCommand)
        .expect(500);
    } finally {
      await pool.query(`DROP TRIGGER "${trigger2}" ON "StockMovement"`);
      await pool.query(`DROP FUNCTION "${trigger2}"()`);
    }
    expect(await prisma.stockProduct.count()).toBe(before);
    await api()
      .post(`${root()}/products`)
      .set(browserHeaders(owner))
      .send(createCommand)
      .expect(201);
  });
  it.each([true, false])(
    'serializes a real movement and revocation in both orders (movement first=%s)',
    async (movementFirst) => {
      const w = await prisma.workspace.create({
        data: {
          name: 'Stock race',
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
      const p = await create(6, owner, w.id);
      const holder = await pool.connect();
      const pending: Promise<number>[] = [];
      await holder.query('BEGIN');
      const pid = (
        await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
      ).rows[0].pid;
      await holder.query(
        'SELECT "id" FROM "Workspace" WHERE "id"=$1 FOR NO KEY UPDATE',
        [w.id],
      );
      const command = movement(p);
      const write = () => move(p, command, member, w.id).then((r) => r.status);
      const revoke = () =>
        api()
          .post(`/api/workspaces/${w.id}/members/${member.user.id}/revoke`)
          .set(browserHeaders(owner))
          .send({ expectedAccessVersion: 0 })
          .then((r) => r.status);
      async function blocked(count: number) {
        const end = Date.now() + 5000;
        while (Date.now() < end) {
          const result = await pool.query(
            'WITH RECURSIVE blocked(pid) AS (SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid)) UNION SELECT a.pid FROM pg_stat_activity a JOIN blocked b ON b.pid=ANY(pg_blocking_pids(a.pid))) SELECT DISTINCT pid FROM blocked',
            [pid],
          );
          if (result.rowCount! >= count) return;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error('Expected actual PostgreSQL stock/revocation waits');
      }
      try {
        pending.push(movementFirst ? write() : revoke());
        await blocked(1);
        pending.push(movementFirst ? revoke() : write());
        await blocked(2);
        await holder.query('COMMIT');
        expect(await Promise.all(pending)).toEqual(
          movementFirst ? [201, 200] : [200, 404],
        );
        expect(
          await prisma.stockProduct.findUniqueOrThrow({ where: { id: p.id } }),
        ).toMatchObject({
          quantity: movementFirst ? 5 : 6,
          version: movementFirst ? 1 : 0,
        });
        expect(
          await prisma.stockMovement.count({ where: { productId: p.id } }),
        ).toBe(movementFirst ? 2 : 1);
        await move(p, command, member, w.id).expect(404);
        await api()
          .get(`${root(w.id)}/receipts/${command.requestId}`)
          .set(browserHeaders(member))
          .expect(404);
        await api()
          .post(`/api/workspaces/${w.id}/members`)
          .set(browserHeaders(owner))
          .send({ email: member.user.email, expectedAccessVersion: 1 })
          .expect(200);
        await move(p, command, member, w.id).expect(409);
        const version = movementFirst ? 1 : 0;
        await move(
          { ...p, version },
          { ...movement({ ...p, version }), expectedAccessVersion: 2 },
          member,
          w.id,
        ).expect(201);
        expect(
          await prisma.stockMovement.count({ where: { productId: p.id } }),
        ).toBe(movementFirst ? 3 : 2);
      } finally {
        await holder.query('ROLLBACK');
        holder.release();
        await Promise.allSettled(pending);
      }
    },
  );
});
