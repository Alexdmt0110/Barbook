import { recipeNameDatabaseConflict } from '../src/cocktails/recipe-name-policy';
import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import * as request from 'supertest';
import { toSlug } from '../src/common/slug';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaClient } from '../src/generated/prisma/client';
import { CocktailContentService } from '../src/cocktails/cocktail-content.service';
import {
  Actor,
  browserHeaders,
  createActor,
  createApplicationFixture,
  recipePayload,
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

type Content = Awaited<ReturnType<CocktailContentService['get']>>;
type Created = { id: string; slug: string };
describe('Recipe name authority and advisory HTTP checks, two real accounts', () => {
  let app: NestExpressApplication, prisma: PrismaService;
  let owner: Actor, member: Actor, stranger: Actor;
  const spaces: string[] = [];
  const api = () => request(app.getHttpServer());
  const root = (ws: string) => `/api/workspaces/${ws}`;
  const url = (ws: string, id: string) =>
    `${root(ws)}/cocktails/id/${id}/content`;
  const check = (ws: string, actor: Actor, name: string, cocktailId?: string) =>
    api()
      .get(`${root(ws)}/cocktail-name-availability`)
      .set(browserHeaders(actor))
      .query({ name, ...(cocktailId ? { cocktailId } : {}) });
  const create = (ws: string, actor: Actor, name: string) =>
    api()
      .post(`${root(ws)}/cocktails`)
      .set(browserHeaders(actor))
      .send({ ...recipePayload({ name }), expectedAccessVersion: 0 });
  async function space() {
    const w = await prisma.workspace.create({
      data: {
        name: 'Name qualification Bar',
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
    return w.id;
  }
  const content = async (ws: string, id: string): Promise<Content> =>
    (await api().get(url(ws, id)).set(browserHeaders(owner)).expect(200))
      .body as Content;
  const replace = (
    ws: string,
    actor: Actor,
    id: string,
    loaded: Content,
    name: string,
  ) =>
    api()
      .put(url(ws, id))
      .set(browserHeaders(actor))
      .send({
        ...loaded.content,
        name,
        expectedContentVersion: loaded.contentVersion,
        expectedAccessVersion: 0,
      });
  beforeAll(async () => {
    requireTestDatabase();
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
    }
  });
  it('checks only authorized names, validates queries, excludes an active current recipe and preserves historical detail slugs', async () => {
    const ws = await space();
    const name = `Mójito ${randomUUID()}`;
    await check(ws, owner, name)
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ status: 'AVAILABLE' }));
    const made = (await create(ws, member, name).expect(201)).body as Created;
    await check(ws, owner, name.toUpperCase())
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ status: 'NAME_TAKEN' }));
    const beforeCheck = await prisma.cocktail.findUniqueOrThrow({
      where: { id: made.id },
    });
    await check(ws, owner, name, made.id)
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ status: 'AVAILABLE' }));
    expect(
      await prisma.cocktail.findUniqueOrThrow({ where: { id: made.id } }),
    ).toEqual(beforeCheck);
    await check(ws, stranger, name).expect(404);
    await check(ws, owner, name, randomUUID()).expect(404);
    await check(ws, owner, '!').expect(400);
    await check(ws, owner, name, 'invalid').expect(400);
    await api()
      .get(`${root(ws)}/cocktail-name-availability`)
      .query({ name })
      .expect(401);
    await api()
      .get('/api/cocktail-name-availability')
      .set(browserHeaders(owner))
      .query({ name })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ status: 'AVAILABLE' }));
    const second = await space();
    await create(second, owner, name).expect(201);
    const special = (
      await create(ws, owner, 'Cocktail name availability').expect(201)
    ).body as Created;
    await api()
      .get(`${root(ws)}/cocktails/${special.slug}`)
      .set(browserHeaders(member))
      .expect(200);
  });
  it('keeps URLs stable, excludes self during rename, preserves no-op versions and distinguishes a reserved original URL', async () => {
    const ws = await space();
    const initial = `Original ${randomUUID()}`,
      renamed = `Menthe ${randomUUID()}`;
    const made = (await create(ws, owner, initial).expect(201)).body as Created;
    const before = await content(ws, made.id);
    await replace(ws, member, made.id, before, initial)
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject({
          contentVersion: before.contentVersion,
          organizationVersion: before.organizationVersion,
        }),
      );
    await replace(ws, member, made.id, before, renamed)
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject({
          slug: made.slug,
          contentVersion: before.contentVersion + 1,
          organizationVersion: before.organizationVersion,
        }),
      );
    await check(ws, owner, initial)
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ status: 'SLUG_RESERVED' }));
    await check(ws, owner, initial, made.id)
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ status: 'AVAILABLE' }));
    await check(ws, owner, renamed)
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ status: 'NAME_TAKEN' }));
    await create(ws, owner, initial)
      .expect(409)
      .expect((r) =>
        expect(r.body).toMatchObject({ code: 'COCKTAIL_SLUG_RESERVED' }),
      );
    await create(ws, owner, renamed)
      .expect(409)
      .expect((r) =>
        expect(r.body).toMatchObject({ code: 'COCKTAIL_NAME_TAKEN' }),
      );
    await replace(ws, owner, made.id, before, renamed).expect(409);
    await api()
      .get(`${root(ws)}/cocktails/${made.slug}`)
      .set(browserHeaders(member))
      .expect(200);
  });
  it.each(['create/create', 'create/rename', 'rename/rename'])(
    'allows one canonical-name winner with complete rollback for %s',
    async (scenario) => {
      const ws = await space(),
        target = `Concurrent ${randomUUID()}`;
      const a = (await create(ws, owner, `A ${randomUUID()}`).expect(201))
        .body as Created;
      const b = (await create(ws, member, `B ${randomUUID()}`).expect(201))
        .body as Created;
      const ca = await content(ws, a.id),
        cb = await content(ws, b.id);
      const before = await prisma.cocktail.findMany({
        where: { workspaceId: ws },
        include: { ingredients: true, garnishes: true, steps: true },
      });
      const requests =
        scenario === 'create/create'
          ? [
              create(ws, owner, target),
              create(ws, member, target.toUpperCase()),
            ]
          : scenario === 'create/rename'
            ? [create(ws, owner, target), replace(ws, member, b.id, cb, target)]
            : [
                replace(ws, owner, a.id, ca, target),
                replace(ws, member, b.id, cb, target.toUpperCase()),
              ];
      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);
      if (scenario === 'create/create')
        expect(statuses.sort()).toEqual([201, 409]);
      else if (scenario === 'rename/rename')
        expect(statuses.sort()).toEqual([200, 409]);
      else
        expect([
          [201, 409],
          [409, 200],
        ]).toContainEqual(statuses);
      expect(responses.find((r) => r.status === 409)!.body).toMatchObject({
        code: 'COCKTAIL_NAME_TAKEN',
      });
      expect(
        await prisma.cocktail.count({
          where: { workspaceId: ws, nameKey: toSlug(target) },
        }),
      ).toBe(1);
      const loser =
        scenario === 'rename/rename'
          ? before[
              responses[0].status === 409
                ? before.findIndex((r) => r.id === a.id)
                : before.findIndex((r) => r.id === b.id)
            ]
          : scenario === 'create/rename' && responses[1].status === 409
            ? before.find((r) => r.id === b.id)
            : null;
      if (loser)
        expect(
          await prisma.cocktail.findUnique({
            where: { id: loser.id },
            include: { ingredients: true, garnishes: true, steps: true },
          }),
        ).toEqual(loser);
      expect(await prisma.cocktail.count({ where: { workspaceId: ws } })).toBe(
        scenario === 'create/create' ||
          (scenario === 'create/rename' && responses[0].status === 201)
          ? 3
          : 2,
      );
    },
  );
  it('reserves a trashed name after expiry, refuses foreign exclusion IDs and keeps restoration intentions versioned', async () => {
    const name = `Retained ${randomUUID()}`;
    const made = (
      await api()
        .post('/api/cocktails')
        .set(browserHeaders(owner))
        .send(recipePayload({ name }))
        .expect(201)
    ).body as Created;
    await api()
      .delete(`/api/cocktails/id/${made.id}`)
      .set(browserHeaders(owner))
      .send({ expectedContentVersion: 0, expectedOrganizationVersion: 0 })
      .expect(200);
    await api()
      .post('/api/cocktails')
      .set(browserHeaders(owner))
      .send(recipePayload({ name }))
      .expect(409)
      .expect((r) =>
        expect(r.body).toMatchObject({ code: 'COCKTAIL_NAME_TAKEN' }),
      );
    await api()
      .get('/api/cocktail-name-availability')
      .set(browserHeaders(owner))
      .query({ name, cocktailId: made.id })
      .expect(404);
    await api()
      .get('/api/cocktail-name-availability')
      .set(browserHeaders(member))
      .query({ name, cocktailId: made.id })
      .expect(404);
    await api()
      .post(`/api/cocktails/id/${made.id}/restore`)
      .set(browserHeaders(owner))
      .send({ expectedContentVersion: 1, expectedOrganizationVersion: 1 })
      .expect(200);
    expect(
      await prisma.cocktail.findUniqueOrThrow({ where: { id: made.id } }),
    ).toMatchObject({
      slug: made.slug,
      contentVersion: 2,
      organizationVersion: 2,
    });
    await prisma.cocktail.update({
      where: { id: made.id },
      data: {
        deletedAt: new Date('2020-01-01'),
        restoreUntil: new Date('2020-01-31'),
        contentVersion: 3,
        organizationVersion: 3,
      },
    });
    await api()
      .get('/api/cocktail-name-availability')
      .set(browserHeaders(owner))
      .query({ name })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ status: 'NAME_TAKEN' }));
    await api()
      .post(`/api/cocktails/id/${made.id}/restore`)
      .set(browserHeaders(owner))
      .send({ expectedContentVersion: 3, expectedOrganizationVersion: 3 })
      .expect(409);
  });
  it('orders restoration against creation and rename without reviving an old edit intention', async () => {
    const name = `Restore race ${randomUUID()}`;
    const first = (
      await api()
        .post('/api/cocktails')
        .set(browserHeaders(owner))
        .send(recipePayload({ name }))
        .expect(201)
    ).body as Created;
    const second = (
      await api()
        .post('/api/cocktails')
        .set(browserHeaders(owner))
        .send(recipePayload())
        .expect(201)
    ).body as Created;
    const loaded = (
      await api()
        .get(`/api/cocktails/id/${second.id}/content`)
        .set(browserHeaders(owner))
        .expect(200)
    ).body as Content;
    await api()
      .delete(`/api/cocktails/id/${first.id}`)
      .set(browserHeaders(owner))
      .send({ expectedContentVersion: 0, expectedOrganizationVersion: 0 })
      .expect(200);
    const responses = await Promise.all([
      api()
        .post(`/api/cocktails/id/${first.id}/restore`)
        .set(browserHeaders(owner))
        .send({ expectedContentVersion: 1, expectedOrganizationVersion: 1 }),
      api()
        .post('/api/cocktails')
        .set(browserHeaders(owner))
        .send(recipePayload({ name })),
      api()
        .put(`/api/cocktails/id/${second.id}/content`)
        .set(browserHeaders(owner))
        .send({ ...loaded.content, name, expectedContentVersion: 0 }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 409, 409]);
    for (const response of responses.slice(1))
      expect(response.body).toMatchObject({ code: 'COCKTAIL_NAME_TAKEN' });
    expect(
      await prisma.cocktail.findUniqueOrThrow({ where: { id: first.id } }),
    ).toMatchObject({
      slug: first.slug,
      contentVersion: 2,
      organizationVersion: 2,
      deletedAt: null,
    });
    await api()
      .put(`/api/cocktails/id/${first.id}/content`)
      .set(browserHeaders(owner))
      .send({
        ...loaded.content,
        name: 'Old intention',
        expectedContentVersion: 0,
      })
      .expect(409);
    expect(
      (
        await api()
          .get(`/api/cocktails/id/${second.id}/content`)
          .set(browserHeaders(owner))
          .expect(200)
      ).body,
    ).toEqual(loaded);
  });
  it('runs the actual previous-schema Prisma client against the additive schema without bypassing uniqueness', async () => {
    const modulePath = join(
      __dirname,
      '../src/generated/prisma/legacy-name-client/client.ts',
    );
    // Generated from the checksum-verified main8bfaef93 schema by disposable DB preparation.
    const legacyModule = (await import(modulePath)) as {
      PrismaClient: typeof PrismaClient;
    };
    const legacy = new legacyModule.PrismaClient({
      adapter: new PrismaPg({ connectionString: requireTestDatabase() }),
    });
    const ws = await space();
    try {
      const made = await legacy.cocktail.create({
        data: {
          workspaceId: ws,
          name: 'Old client',
          slug: 'original-legacy-url',
          type: 'CLASSIC',
          method: 'BUILD',
          glass: 'Glass',
        },
      });
      expect(made).not.toHaveProperty('nameKey');
      await legacy.cocktail.update({
        where: { id: made.id },
        data: { name: 'Renamed old client', contentVersion: { increment: 1 } },
      });
      expect(
        await prisma.cocktail.findUniqueOrThrow({ where: { id: made.id } }),
      ).toMatchObject({
        slug: 'original-legacy-url',
        nameKey: 'renamed-old-client',
        contentVersion: 1,
      });
      await expect(
        legacy.cocktail.create({
          data: {
            workspaceId: ws,
            name: 'RENAMED OLD CLIENT',
            slug: 'distinct-url',
            type: 'CLASSIC',
            method: 'BUILD',
            glass: 'Glass',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
      // Current API mapping uses the current model; legacy clients do not know nameKey.
      const collision = Promise.resolve(
        prisma.cocktail.create({
          data: {
            workspaceId: ws,
            name: 'RENAMED OLD CLIENT',
            slug: 'current-distinct-url',
            type: 'CLASSIC',
            method: 'BUILD',
            glass: 'Glass',
          },
        }),
      );
      const failure: unknown = await collision.catch((error: unknown) => error);
      const metadata = failure as {
        code?: unknown;
        meta?: { modelName?: unknown; target?: unknown };
      };
      expect({
        code: metadata.code,
        modelName: metadata.meta?.modelName,
        target: metadata.meta?.target,
        response: recipeNameDatabaseConflict(failure)?.getResponse(),
      }).toMatchObject({
        code: 'P2002',
        response: { code: 'COCKTAIL_NAME_TAKEN' },
      });
      const second = await legacy.cocktail.create({
        data: {
          workspaceId: ws,
          name: 'Another legacy',
          slug: 'another-url',
          type: 'CLASSIC',
          method: 'BUILD',
          glass: 'Glass',
        },
      });
      await expect(
        legacy.$transaction(async (tx) => {
          await tx.cocktail.update({
            where: { id: second.id },
            data: { notes: 'must roll back' },
          });
          await tx.cocktail.update({
            where: { id: second.id },
            data: { name: 'Renamed old client' },
          });
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
      expect(
        await prisma.cocktail.findUniqueOrThrow({ where: { id: second.id } }),
      ).toMatchObject({
        name: 'Another legacy',
        notes: null,
        contentVersion: 0,
      });
    } finally {
      await legacy.$disconnect();
    }
  });
});
