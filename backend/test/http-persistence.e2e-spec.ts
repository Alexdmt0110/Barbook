import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import * as request from 'supertest';
import { Server } from 'node:http';
import { AuthResponse } from '../src/auth/auth.types';
import {
  CocktailDetail,
  CocktailListResult,
  CreateCocktailResult,
} from '../src/cocktails/cocktail.types';
import { CreateCocktailDto } from '../src/cocktails/dto/create-cocktail.dto';
import { PrismaService } from '../src/database/prisma.service';
import { MeasurementUnit } from '../src/generated/prisma/client';
import {
  Actor,
  createActor,
  createApplicationFixture,
  FIXTURE_PASSWORD,
  recipePayload,
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

describe('PostgreSQL HTTP contracts and transactions', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  let pool: Pool;
  let alice: Actor;
  let bob: Actor;
  const api = () => request(app.getHttpServer());
  const bearer = (actor: Actor) => `Bearer ${actor.accessToken}`;

  async function createRecipe(
    actor: Actor,
    changes: Partial<CreateCocktailDto> = {},
  ): Promise<CreateCocktailResult> {
    const response = await api()
      .post('/api/cocktails')
      .set('Authorization', bearer(actor))
      .send(recipePayload(changes))
      .expect(201);
    expect(response.body).toHaveProperty('id', expect.any(String));
    expect(response.body).toHaveProperty('slug', expect.any(String));
    return response.body as CreateCocktailResult;
  }

  async function createFolder(
    actor: Actor,
    name = `Folder ${randomUUID()}`,
  ): Promise<{ id: string; name: string }> {
    const response = await api()
      .post('/api/folders')
      .set('Authorization', bearer(actor))
      .send({ name })
      .expect(201);
    return response.body as { id: string; name: string };
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: requireTestDatabase() });
    app = await createApplicationFixture();
    prisma = app.get(PrismaService);
    alice = await createActor(app);
    bob = await createActor(app);
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  it('uses the real prefix, validation pipe and CORS configuration', async () => {
    await api().get('/').expect(404);
    await api().get('/api').expect(200).expect('Hello World!');
    const cors = await api()
      .get('/api')
      .set('Origin', 'https://untrusted.example')
      .expect(200);
    expect(cors.headers['access-control-allow-origin']).toBe(
      process.env.FRONTEND_ORIGIN,
    );
    await api()
      .get('/api/cocktails?page=0')
      .set('Authorization', bearer(alice))
      .expect(400);
    await api()
      .post('/api/cocktails')
      .set('Authorization', bearer(alice))
      .send({ ...recipePayload(), workspaceId: bob.workspaceId })
      .expect(400);
    await api()
      .get(`/api/cocktails?workspaceId=${bob.workspaceId}`)
      .set('Authorization', bearer(alice))
      .expect(400);
  });

  it('registers the normalized account, sole personal workspace and OWNER atomically', async () => {
    const email = `Register-${randomUUID()}@Example.Test`;
    const response = await api()
      .post('/api/auth/register')
      .send({
        email: ` ${email} `,
        password: FIXTURE_PASSWORD,
        displayName: '  Fixture QA  ',
      })
      .expect(201);
    const auth = response.body as AuthResponse;
    expect(auth.user.email).toBe(email.toLowerCase());
    expect(auth.user.displayName).toBe('Fixture QA');
    expect(auth.user).not.toHaveProperty('passwordHash');
    const workspaces = await prisma.workspace.findMany({
      where: { personalOwnerId: auth.user.id },
      include: { members: true },
    });
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].kind).toBe('PERSONAL');
    expect(workspaces[0].members).toHaveLength(1);
    expect(workspaces[0].members[0].userId).toBe(auth.user.id);
    expect(workspaces[0].members[0].role).toBe('OWNER');
    await api()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200)
      .expect(auth.user);
  });

  it('allows only one concurrent registration for the same email', async () => {
    const email = `race-${randomUUID()}@example.test`;
    const payload = {
      email,
      password: FIXTURE_PASSWORD,
      displayName: 'Concurrent QA',
    };
    const responses = await Promise.all([
      api().post('/api/auth/register').send(payload),
      api().post('/api/auth/register').send(payload),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const users = await prisma.user.findMany({
      where: { email },
      include: { personalWorkspace: true, memberships: true },
    });
    expect(users).toHaveLength(1);
    expect(users[0].personalWorkspace).not.toBeNull();
    expect(users[0].memberships).toHaveLength(1);
  });

  it('rolls registration back when the database refuses OWNER membership', async () => {
    const suffix = randomUUID().replaceAll('-', '');
    const email = `rollback-${suffix}@example.test`;
    const name = `bb_member_${suffix}`;
    await pool.query(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM "User" WHERE "id"=NEW."userId" AND "email"='${email}') THEN RAISE EXCEPTION 'synthetic membership failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${name}" BEFORE INSERT ON "WorkspaceMember" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
    );
    const before = await prisma.workspace.count();
    try {
      await api()
        .post('/api/auth/register')
        .send({ email, password: FIXTURE_PASSWORD, displayName: 'Rollback QA' })
        .expect(500);
      expect(await prisma.user.count({ where: { email } })).toBe(0);
      expect(await prisma.workspace.count()).toBe(before);
    } finally {
      await pool.query(`DROP TRIGGER "${name}" ON "WorkspaceMember"`);
      await pool.query(`DROP FUNCTION "${name}"()`);
    }
  });

  it('uses the real password hash and rejects expired, forged or missing sessions', async () => {
    await api()
      .post('/api/auth/login')
      .send({ email: alice.user.email, password: FIXTURE_PASSWORD })
      .expect(200);
    await api()
      .post('/api/auth/login')
      .send({ email: alice.user.email, password: 'Incorrect fixture password' })
      .expect(401);
    await api().get('/api/cocktails').expect(401);
    const jwt = app.get(JwtService);
    const expired = await jwt.signAsync(
      { sub: alice.user.id },
      { expiresIn: -1 },
    );
    const forged = await jwt.signAsync(
      { sub: alice.user.id },
      { secret: 'synthetic_wrong_secret_at_least_32_characters' },
    );
    for (const token of [expired, forged, 'not-a-jwt']) {
      await api()
        .get('/api/cocktails')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
  });

  it('round trips the full recipe, Decimal precision, garnish and unknown TOP_UP ABV', async () => {
    const created = await createRecipe(alice, {
      ingredients: [
        {
          ingredientName: `Precise ${randomUUID()}`,
          ingredientDefaultAbv: 40,
          amount: 0.001,
          unit: MeasurementUnit.ML,
        },
      ],
      mainAlcoholName: undefined,
    });
    const response = await api()
      .get(`/api/cocktails/${created.slug}`)
      .set('Authorization', bearer(alice))
      .expect(200);
    const detail = response.body as CocktailDetail;
    expect(detail.ingredients).toHaveLength(1);
    expect(detail.ingredients[0].amount).toBe(0.001);
    expect(detail.ingredients[0].abv).toBe(40);
    expect(detail.estimatedAbv).toBe(40);
    expect(detail.garnishes).toHaveLength(1);
    expect(detail.steps.map((step) => step.content)).toEqual([
      'Shaker puis filtrer.',
    ]);
    expect(detail.mainAlcohol).toBeNull();
    const unknown = await createRecipe(alice, {
      ingredients: [
        {
          ingredientName: 'Gin',
          ingredientDefaultAbv: 40,
          amount: 50,
          unit: MeasurementUnit.ML,
        },
        { ingredientName: 'Tonic', unit: MeasurementUnit.TOP_UP },
      ],
    });
    const toppedUp = await api()
      .get(`/api/cocktails/${unknown.slug}`)
      .set('Authorization', bearer(alice))
      .expect(200);
    expect((toppedUp.body as CocktailDetail).estimatedAbv).toBeNull();
  });

  it('keeps New routable, accepts null main alcohol and preserves canonical conflicts', async () => {
    const created = await createRecipe(alice, {
      name: 'New',
      mainAlcoholName: null,
    });
    expect(created.slug).toBe('new-cocktail');
    const response = await api()
      .get('/api/cocktails/new-cocktail')
      .set('Authorization', bearer(alice))
      .expect(200);
    const detail = response.body as CocktailDetail;
    expect(detail.name).toBe('New');
    expect(detail.mainAlcohol).toBeNull();
    await api()
      .post('/api/cocktails')
      .set('Authorization', bearer(alice))
      .send(recipePayload({ name: 'New Cocktail', mainAlcoholName: null }))
      .expect(409);
    expect(
      await prisma.cocktail.count({
        where: { workspaceId: alice.workspaceId, slug: 'new-cocktail' },
      }),
    ).toBe(1);
  });

  it('rejects invalid DTOs without leaving a partial recipe', async () => {
    const before = await prisma.cocktail.count({
      where: { workspaceId: alice.workspaceId },
    });
    for (const extra of [
      { mainAlcoholName: 42 },
      { ingredients: [] },
      { steps: ['   '] },
      { unexpected: true },
    ]) {
      await api()
        .post('/api/cocktails')
        .set('Authorization', bearer(alice))
        .send({ ...recipePayload(), ...extra })
        .expect(400);
    }
    expect(
      await prisma.cocktail.count({
        where: { workspaceId: alice.workspaceId },
      }),
    ).toBe(before);
  });

  it('isolates details, organization, lists, folders and ingredient suggestions', async () => {
    const privateName = `Private ${randomUUID()}`;
    const created = await createRecipe(alice, { name: privateName });
    const folder = await createFolder(alice, privateName);
    await api()
      .get(`/api/cocktails/${created.slug}`)
      .set('Authorization', bearer(bob))
      .expect(404);
    await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set('Authorization', bearer(bob))
      .send({ folderId: null, tagNames: [] })
      .expect(404);
    const list = await api()
      .get('/api/cocktails')
      .query({ search: privateName })
      .set('Authorization', bearer(bob))
      .expect(200);
    expect((list.body as CocktailListResult).total).toBe(0);
    const folders = await api()
      .get('/api/folders')
      .set('Authorization', bearer(bob))
      .expect(200);
    expect(
      (folders.body as { id: string }[]).some(
        (entry) => entry.id === folder.id,
      ),
    ).toBe(false);
    const suggestions = await api()
      .get('/api/ingredients?query=Gin')
      .set('Authorization', bearer(bob))
      .expect(200);
    expect(suggestions.body).toEqual([]);
    const own = await createRecipe(bob);
    await api()
      .put(`/api/cocktails/${own.slug}/organization`)
      .set('Authorization', bearer(bob))
      .send({ folderId: folder.id, tagNames: [] })
      .expect(400);
  });

  it('persists folder/tags and intersecting filters, with independent workspace names', async () => {
    const created = await createRecipe(alice);
    const folderName = `Equal ${randomUUID()}`;
    const folder = await createFolder(alice, folderName);
    await createFolder(bob, folderName);
    await api()
      .post('/api/folders')
      .set('Authorization', bearer(alice))
      .send({ name: folderName })
      .expect(409);
    const organized = await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set('Authorization', bearer(alice))
      .send({ folderId: folder.id, tagNames: ['Agrumes', '  agrumes  '] })
      .expect(200);
    const organization = organized.body as {
      folder: { id: string };
      tags: { id: string; slug: string }[];
    };
    expect(organization.folder.id).toBe(folder.id);
    expect(organization.tags).toHaveLength(1);
    expect(organization.tags[0].slug).toBe('agrumes');
    const response = await api()
      .get('/api/cocktails')
      .query({
        folderId: folder.id,
        tagId: organization.tags[0].id,
        page: 1,
        pageSize: 1,
      })
      .set('Authorization', bearer(alice))
      .expect(200);
    const list = response.body as CocktailListResult;
    expect(list.total).toBe(1);
    expect(list.items[0].id).toBe(created.id);
    const foreign = await api()
      .get('/api/cocktails')
      .query({ folderId: folder.id, tagId: organization.tags[0].id })
      .set('Authorization', bearer(bob))
      .expect(200);
    expect((foreign.body as CocktailListResult).total).toBe(0);
    await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set('Authorization', bearer(alice))
      .send({ folderId: null, tagNames: [] })
      .expect(200);
    expect(
      await prisma.cocktailTag.count({ where: { cocktailId: created.id } }),
    ).toBe(0);
  });

  it('rolls back new ingredients and cocktail after a database preparation-step failure', async () => {
    const suffix = randomUUID().replaceAll('-', '');
    const marker = `failure-${suffix}`;
    const name = `bb_recipe_${suffix}`;
    const ingredientName = `Rolled ${suffix}`;
    const cocktailName = `Rolled cocktail ${suffix}`;
    await pool.query(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."content"='${marker}' THEN RAISE EXCEPTION 'synthetic recipe failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${name}" BEFORE INSERT ON "PreparationStep" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
    );
    try {
      await api()
        .post('/api/cocktails')
        .set('Authorization', bearer(alice))
        .send(
          recipePayload({
            name: cocktailName,
            mainAlcoholName: undefined,
            ingredients: [
              { ingredientName, amount: 50, unit: MeasurementUnit.ML },
            ],
            steps: [marker],
          }),
        )
        .expect(500);
      expect(
        await prisma.cocktail.count({
          where: { workspaceId: alice.workspaceId, name: cocktailName },
        }),
      ).toBe(0);
      expect(
        await prisma.ingredient.count({
          where: { workspaceId: alice.workspaceId, name: ingredientName },
        }),
      ).toBe(0);
    } finally {
      await pool.query(`DROP TRIGGER "${name}" ON "PreparationStep"`);
      await pool.query(`DROP FUNCTION "${name}"()`);
    }
  });

  it('rolls folder and tag changes back together when the database refuses an association', async () => {
    const created = await createRecipe(alice);
    const originalFolder = await createFolder(alice);
    const replacement = await createFolder(alice);
    await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set('Authorization', bearer(alice))
      .send({ folderId: originalFolder.id, tagNames: ['Original'] })
      .expect(200);
    const otherOriginalFolder = await createFolder(alice);
    await api()
      .put(`/api/cocktails/${created.slug}/organization`)
      .set('Authorization', bearer(alice))
      .send({
        folderIds: [originalFolder.id, otherOriginalFolder.id],
        expectedVersion: 1,
        tagNames: ['Original'],
      })
      .expect(200);

    const suffix = randomUUID().replaceAll('-', '');
    const marker = `rb-${suffix}`;
    const name = `bb_tags_${suffix}`;
    await pool.query(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM "Tag" WHERE "id"=NEW."tagId" AND "slug"='${marker}') THEN RAISE EXCEPTION 'synthetic organization failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${name}" BEFORE INSERT ON "CocktailTag" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
    );
    try {
      await api()
        .put(`/api/cocktails/${created.slug}/organization`)
        .set('Authorization', bearer(alice))
        .send({
          folderIds: [replacement.id],
          expectedVersion: 2,
          tagNames: [marker],
        })
        .expect(500);
      const response = await api()
        .get(`/api/cocktails/${created.slug}`)
        .set('Authorization', bearer(alice))
        .expect(200);
      const detail = response.body as CocktailDetail;
      expect(detail.folder?.id).toBe(originalFolder.id);
      expect(detail.folders.map((folder) => folder.id).sort()).toEqual(
        [originalFolder.id, otherOriginalFolder.id].sort(),
      );
      expect(detail.organizationVersion).toBe(2);
      expect(detail.tags.map((tag) => tag.name)).toEqual(['Original']);
      expect(
        await prisma.tag.count({
          where: { workspaceId: alice.workspaceId, slug: marker },
        }),
      ).toBe(0);
    } finally {
      await pool.query(`DROP TRIGGER "${name}" ON "CocktailTag"`);
      await pool.query(`DROP FUNCTION "${name}"()`);
    }
  });

  it('creates only one recipe for concurrent duplicate requests', async () => {
    const payload = recipePayload();
    const responses = await Promise.all([
      api()
        .post('/api/cocktails')
        .set('Authorization', bearer(alice))
        .send(payload),
      api()
        .post('/api/cocktails')
        .set('Authorization', bearer(alice))
        .send(payload),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(
      await prisma.cocktail.count({
        where: { workspaceId: alice.workspaceId, name: payload.name },
      }),
    ).toBe(1);
  });

  it('keeps distinct concurrent recipes sharing a new ingredient', async () => {
    const ingredientName = `Shared ${randomUUID()}`;
    const responses = await Promise.all(
      [40, 47].map((abv) =>
        api()
          .post('/api/cocktails')
          .set('Authorization', bearer(alice))
          .send(
            recipePayload({
              ingredients: [
                {
                  ingredientName,
                  ingredientDefaultAbv: abv,
                  amount: 50,
                  unit: MeasurementUnit.ML,
                },
              ],
              mainAlcoholName: ingredientName,
            }),
          ),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    for (const [index, created] of responses.entries()) {
      const result = created.body as CreateCocktailResult;
      const response = await api()
        .get(`/api/cocktails/${result.slug}`)
        .set('Authorization', bearer(alice))
        .expect(200);
      expect((response.body as CocktailDetail).ingredients[0].abv).toBe(
        [40, 47][index],
      );
    }
    expect(
      await prisma.ingredient.count({
        where: { workspaceId: alice.workspaceId, name: ingredientName },
      }),
    ).toBe(1);
  });

  it('serializes organization replacements without mixing folder/tag pairs', async () => {
    const created = await createRecipe(alice);
    const first = await createFolder(alice);
    const second = await createFolder(alice);
    const updates = [
      { folderId: first.id, tagNames: ['First'] },
      { folderId: second.id, tagNames: ['Second'] },
    ];
    const results = await Promise.all(
      updates.map((value) =>
        api()
          .put(`/api/cocktails/${created.slug}/organization`)
          .set('Authorization', bearer(alice))
          .send(value),
      ),
    );
    expect(results.map((response) => response.status)).toEqual([200, 200]);
    const response = await api()
      .get(`/api/cocktails/${created.slug}`)
      .set('Authorization', bearer(alice))
      .expect(200);
    const detail = response.body as CocktailDetail;
    expect(updates).toContainEqual({
      folderId: detail.folder?.id,
      tagNames: detail.tags.map((tag) => tag.name),
    });
  });
});
