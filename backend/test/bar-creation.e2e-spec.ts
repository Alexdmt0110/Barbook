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
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

describe('Explicit Bar creation and private creation receipts over PostgreSQL/HTTP', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let pool: Pool;
  let owner: Actor;
  let member: Actor;
  let foreign: Actor;
  const actors: string[] = [];
  const api = () => request(app.getHttpServer());
  const payload = () => ({
    name: 'Synthetic Bar',
    accentKey: 'RED',
    creationRequestId: randomUUID(),
  });
  const create = (body: object, actor = owner) =>
    api().post('/api/workspaces').set(browserHeaders(actor)).send(body);
  beforeAll(async () => {
    pool = new Pool({ connectionString: requireTestDatabase() });
    app = await createApplicationFixture([], 3);
    prisma = app.get(PrismaService);
    owner = await createActor(app);
    member = await createActor(app);
    foreign = await createActor(app);
    actors.push(owner.user.id, member.user.id, foreign.user.id);
  });
  afterAll(async () => {
    try {
      await prisma.workspace.deleteMany({
        where: { creationActorId: { in: actors } },
      });
      await prisma.user.deleteMany({ where: { id: { in: actors } } });
    } finally {
      await app?.close();
      await pool?.end();
    }
  });
  it('creates one SHARED workspace with a local OWNER and accent without altering Personnel or other rights', async () => {
    const personalBefore = await prisma.workspace.findUniqueOrThrow({
      where: { id: owner.workspaceId },
    });
    const body = payload();
    const r = await create({ ...body, name: '  Bar explicite  ' }).expect(201);
    const bar = r.body as { id: string };
    expect(r.body).toMatchObject({
      id: bar.id,
      name: 'Bar explicite',
      kind: 'SHARED',
      role: 'OWNER',
      accentKey: 'RED',
      accessVersion: 0,
    });
    expect(
      await prisma.workspaceMember.findMany({ where: { workspaceId: bar.id } }),
    ).toMatchObject([
      { userId: owner.user.id, role: 'OWNER', revokedAt: null },
    ]);
    expect(
      await prisma.workspace.findUniqueOrThrow({
        where: { id: owner.workspaceId },
      }),
    ).toEqual(personalBefore);
    await api()
      .get(`/api/workspaces/${bar.id}`)
      .set(browserHeaders(owner))
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject({ accentKey: 'RED', role: 'OWNER' }),
      );
    await api()
      .get(`/api/workspaces/creation-intents/${body.creationRequestId}`)
      .set(browserHeaders(owner))
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject({ id: bar.id, accentKey: 'RED' }),
      );
    await api()
      .get(`/api/workspaces/creation-intents/${body.creationRequestId}`)
      .set(browserHeaders(foreign))
      .expect(404);
    await api()
      .get(`/api/workspaces/${bar.id}`)
      .set(browserHeaders(foreign))
      .expect(404);
    const catalogue = await api()
      .get('/api/workspaces?kind=SHARED')
      .set(browserHeaders(owner))
      .expect(200);
    expect((catalogue.body as { items: unknown[] }).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: bar.id, accentKey: 'RED' }),
      ]),
    );
  });
  it('deduplicates concurrent identical intentions and refuses changes to their payload', async () => {
    const body = payload();
    const results = await Promise.all([create(body), create(body)]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect((results[0].body as { id: string }).id).toBe(
      (results[1].body as { id: string }).id,
    );
    const id = (results[0].body as { id: string }).id;
    expect(
      await prisma.workspace.count({
        where: {
          creationActorId: owner.user.id,
          creationRequestId: body.creationRequestId,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.workspaceMember.count({ where: { workspaceId: id } }),
    ).toBe(1);
    const before = await prisma.workspace.findUniqueOrThrow({ where: { id } });
    await create({ ...body, name: 'Changed intention' }).expect(409);
    await create({ ...body, accentKey: 'BLUE' }).expect(409);
    expect(await prisma.workspace.findUniqueOrThrow({ where: { id } })).toEqual(
      before,
    );
  });
  it('keeps identical keys independent between actors and grants no rights in the other actor’s Bar', async () => {
    const body = payload();
    const a = await create(body, owner).expect(201);
    const b = await create(body, member).expect(201);
    const idA = (a.body as { id: string }).id;
    const idB = (b.body as { id: string }).id;
    expect(idA).not.toBe(idB);
    await api()
      .get(`/api/workspaces/${idA}`)
      .set(browserHeaders(member))
      .expect(404);
    await api()
      .get(`/api/workspaces/${idB}`)
      .set(browserHeaders(owner))
      .expect(404);
    expect(
      (
        await prisma.workspaceMember.findMany({ where: { workspaceId: idB } })
      ).map((m) => m.userId),
    ).toEqual([member.user.id]);
  });
  it('never reactivates a revoked creator membership when reading or replaying a creation', async () => {
    const body = payload();
    const r = await create(body).expect(201);
    const id = (r.body as { id: string }).id;
    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: id, userId: owner.user.id } },
      data: { revokedAt: new Date() },
    });
    const before = await prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: id, userId: owner.user.id } },
    });
    await create(body).expect(404);
    await create({ ...body, name: 'Do not reactivate' }).expect(404);
    await api()
      .get(`/api/workspaces/creation-intents/${body.creationRequestId}`)
      .set(browserHeaders(owner))
      .expect(404);
    expect(
      await prisma.workspaceMember.findUniqueOrThrow({
        where: {
          workspaceId_userId: { workspaceId: id, userId: owner.user.id },
        },
      }),
    ).toEqual(before);
    expect(
      await prisma.workspace.count({
        where: {
          creationActorId: owner.user.id,
          creationRequestId: body.creationRequestId,
        },
      }),
    ).toBe(1);
  });
  it.each([
    { name: '' },
    { name: '   ' },
    { name: 'x'.repeat(81) },
    { accentKey: 'url(javascript:bad)' },
    { accentKey: null },
    { creationRequestId: 'bad' },
    { role: 'OWNER' },
    { kind: 'PERSONAL' },
    { personalOwnerId: 'forged' },
    { creationActorId: 'forged' },
  ])(
    'rejects invalid/privilege-supplying payload %j without creating anything',
    async (change) => {
      const body = { ...payload(), ...change };
      const before = await prisma.workspace.count();
      await create(body).expect(400);
      expect(await prisma.workspace.count()).toBe(before);
    },
  );
  it('requires a cookie session and CSRF, even for an otherwise valid intention', async () => {
    const body = payload();
    await api().post('/api/workspaces').send(body).expect(401);
    await api()
      .post('/api/workspaces')
      .set({ ...browserHeaders(owner), 'X-Barbook-CSRF': 'invalid' })
      .send(body)
      .expect(403);
    expect(
      await prisma.workspace.count({
        where: {
          creationActorId: owner.user.id,
          creationRequestId: body.creationRequestId,
        },
      }),
    ).toBe(0);
  });
  it('rolls back Workspace and its receipt when OWNER insertion fails, permitting an explicit same-key retry', async () => {
    const name = `bar_${randomUUID().replaceAll('-', '')}`;
    const body = payload();
    await pool.query(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."userId"='${owner.user.id}' AND EXISTS(SELECT 1 FROM "Workspace" WHERE "id"=NEW."workspaceId" AND "creationRequestId"='${body.creationRequestId}') THEN RAISE EXCEPTION 'synthetic owner failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${name}" BEFORE INSERT ON "WorkspaceMember" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
    );
    try {
      await create(body).expect(500);
      expect(
        await prisma.workspace.count({
          where: {
            creationActorId: owner.user.id,
            creationRequestId: body.creationRequestId,
          },
        }),
      ).toBe(0);
      await api()
        .get(`/api/workspaces/creation-intents/${body.creationRequestId}`)
        .set(browserHeaders(owner))
        .expect(404);
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS "${name}" ON "WorkspaceMember"`);
      await pool.query(`DROP FUNCTION IF EXISTS "${name}"()`);
    }
    await create(body).expect(201);
    expect(
      await prisma.workspace.count({
        where: {
          creationActorId: owner.user.id,
          creationRequestId: body.creationRequestId,
        },
      }),
    ).toBe(1);
  });
});
