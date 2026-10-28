import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import { CreateCocktailResult } from '../src/cocktails/cocktail.types';
import { PrismaService } from '../src/database/prisma.service';
import {
  Actor,
  browserHeaders,
  createActor,
  createApplicationFixture,
  recipePayload,
} from './helpers/application-fixture';

describe('Lifecycle preparation remains inactive over real HTTP and PostgreSQL', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let actor: Actor;
  beforeAll(async () => {
    app = await createApplicationFixture([], 1);
    prisma = app.get(PrismaService);
    actor = await createActor(app);
  });
  afterAll(async () => {
    if (actor) await prisma.user.delete({ where: { id: actor.user.id } });
    await app?.close();
  });

  it('creates an active recipe with safe defaults and keeps the existing detail contract usable', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/cocktails')
      .set(browserHeaders(actor))
      .send(recipePayload())
      .expect(201);
    expect(response.body).toHaveProperty('id', expect.any(String));
    expect(response.body).toHaveProperty('slug', expect.any(String));
    const created = response.body as CreateCocktailResult;
    const recipe = await prisma.cocktail.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(recipe).toMatchObject({
      contentVersion: 0,
      organizationVersion: 0,
      deletedAt: null,
      restoreUntil: null,
    });
    const detail = await request(app.getHttpServer())
      .get(`/api/cocktails/${created.slug}`)
      .set(browserHeaders(actor))
      .expect(200);
    expect(detail.body).toMatchObject({
      id: recipe.id,
      slug: recipe.slug,
      organizationVersion: 0,
    });
    expect(detail.body).toHaveProperty('ingredients.0.abv', 40);
  });

  it.each(['deletedAt', 'restoreUntil', 'contentVersion'])(
    'refuses premature state injection through the create body: %s',
    async (field) => {
      const before = await prisma.cocktail.count({
        where: { workspaceId: actor.workspaceId },
      });
      await request(app.getHttpServer())
        .post('/api/cocktails')
        .set(browserHeaders(actor))
        .send({
          ...recipePayload(),
          [field]: field === 'contentVersion' ? 10 : '2026-01-01T00:00:00Z',
        })
        .expect(400);
      expect(
        await prisma.cocktail.count({
          where: { workspaceId: actor.workspaceId },
        }),
      ).toBe(before);
    },
  );

  it('refuses an explicit-unknown writer before coordinated readers are activated', async () => {
    const payload = recipePayload();
    const before = await prisma.cocktail.count({
      where: { workspaceId: actor.workspaceId },
    });
    await request(app.getHttpServer())
      .post('/api/cocktails')
      .set(browserHeaders(actor))
      .send({
        ...payload,
        ingredients: payload.ingredients.map((line) => ({
          ...line,
          abvUnknown: true,
        })),
      })
      .expect(400);
    expect(
      await prisma.cocktail.count({
        where: { workspaceId: actor.workspaceId },
      }),
    ).toBe(before);
  });
});
