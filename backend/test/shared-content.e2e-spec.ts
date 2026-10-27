import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { CocktailContentService } from '../src/cocktails/cocktail-content.service';
import {
  Actor,
  browserHeaders,
  createActor,
  createApplicationFixture,
  recipePayload,
} from './helpers/application-fixture';

type Content = Awaited<ReturnType<CocktailContentService['get']>>;
describe('Shared content endpoints preserve personal isolation', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let owner: Actor;
  let member: Actor;
  let stranger: Actor;
  let workspaceId: string;
  let recipeId: string;
  let personalId: string;
  let loaded: Content;
  const api = () => request(app.getHttpServer());
  const url = (id = recipeId) =>
    `/api/workspaces/${workspaceId}/cocktails/id/${id}/content`;
  beforeAll(async () => {
    app = await createApplicationFixture([], 3);
    prisma = app.get(PrismaService);
    owner = await createActor(app);
    member = await createActor(app);
    stranger = await createActor(app);
    const w = await prisma.workspace.create({
      data: {
        name: 'Synthetic Bar',
        kind: 'SHARED',
        members: {
          create: [
            { userId: owner.user.id, role: 'OWNER' },
            { userId: member.user.id, role: 'MEMBER' },
          ],
        },
      },
    });
    workspaceId = w.id;
    const personal = await api()
      .post('/api/cocktails')
      .set(browserHeaders(owner))
      .send(recipePayload())
      .expect(201);
    personalId = (personal.body as { id: string }).id;
    loaded = (
      await api()
        .get(`/api/cocktails/id/${personalId}/content`)
        .set(browserHeaders(owner))
        .expect(200)
    ).body as Content;
    const recipe = await prisma.cocktail.create({
      data: {
        workspaceId,
        name: 'Shared fixture',
        slug: randomUUID(),
        type: 'PERSONAL_CREATION',
        method: 'SHAKER',
        glass: 'Coupe',
      },
    });
    recipeId = recipe.id;
  });
  afterAll(async () => {
    try {
      await prisma.cocktail.deleteMany({
        where: {
          workspaceId: {
            in: [
              workspaceId,
              owner.workspaceId,
              member.workspaceId,
              stranger.workspaceId,
            ],
          },
        },
      });
      await prisma.workspace.delete({ where: { id: workspaceId } });
      await prisma.user.deleteMany({
        where: {
          id: { in: [owner.user.id, member.user.id, stranger.user.id] },
        },
      });
    } finally {
      await app?.close();
    }
  });
  it('allows MEMBER atomic editing and OWNER reading without changing the personal source', async () => {
    await api()
      .put(url())
      .set(browserHeaders(member))
      .send({
        ...loaded.content,
        name: 'Edited Bar',
        expectedContentVersion: 0,
        expectedAccessVersion: 0,
      })
      .expect(200);
    await api()
      .get(url())
      .set(browserHeaders(owner))
      .expect(200)
      .expect((r) =>
        expect((r.body as Content).content.name).toBe('Edited Bar'),
      );
    const personal = (
      await api()
        .get(`/api/cocktails/id/${personalId}/content`)
        .set(browserHeaders(owner))
        .expect(200)
    ).body as Content;
    expect(personal).toEqual(loaded);
    await api()
      .get(`/api/cocktails/id/${recipeId}/content`)
      .set(browserHeaders(owner))
      .expect(404);
    await api().get(url(personalId)).set(browserHeaders(owner)).expect(404);
    await api().get(url()).set(browserHeaders(stranger)).expect(404);
  });
  it('rejects stale content, missing access preconditions and revoked membership without effects', async () => {
    const before = await prisma.cocktail.findUniqueOrThrow({
      where: { id: recipeId },
    });
    for (const body of [
      {
        ...loaded.content,
        expectedContentVersion: 0,
        expectedAccessVersion: 0,
      },
      { ...loaded.content, expectedContentVersion: 1 },
    ])
      await api().put(url()).set(browserHeaders(member)).send(body).expect(409);
    await api()
      .post(`/api/workspaces/${workspaceId}/members/${member.user.id}/revoke`)
      .set(browserHeaders(owner))
      .send({ expectedAccessVersion: 0 })
      .expect(200);
    await api().get(url()).set(browserHeaders(member)).expect(404);
    await api()
      .put(url())
      .set(browserHeaders(member))
      .send({
        ...loaded.content,
        expectedContentVersion: 1,
        expectedAccessVersion: 0,
      })
      .expect(404);
    expect(
      await prisma.cocktail.findUniqueOrThrow({ where: { id: recipeId } }),
    ).toEqual(before);
  });
});
