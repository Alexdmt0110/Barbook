import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { Pool } from 'pg';
import * as request from 'supertest';
import {
  CocktailDetail,
  CocktailListResult,
} from '../src/cocktails/cocktail.types';
import { PrismaService } from '../src/database/prisma.service';
import { FolderDetail, FolderPage } from '../src/folders/folder.types';
import {
  Actor,
  createActor,
  createApplicationFixture,
  recipePayload,
} from './helpers/application-fixture';
import { requireTestDatabase } from './helpers/test-database';

describe('Folder management with real HTTP and PostgreSQL', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  let pool: Pool;
  let alice: Actor;
  let bob: Actor;
  const api = () => request(app.getHttpServer());
  const auth = (actor = alice) => `Bearer ${actor.accessToken}`;
  const folder = (actor = alice, name: string = randomUUID()) =>
    prisma.folder.create({ data: { workspaceId: actor.workspaceId, name } });
  async function recipe(actor = alice) {
    const response = await api()
      .post('/api/cocktails')
      .set('Authorization', auth(actor))
      .send(recipePayload())
      .expect(201);
    return response.body as { id: string; slug: string };
  }
  const getDetail = async (slug: string) => {
    const response = await api()
      .get(`/api/cocktails/${slug}`)
      .set('Authorization', auth())
      .expect(200);
    return response.body as CocktailDetail;
  };
  const organize = (slug: string, folderIds: string[], expectedVersion = 0) =>
    api()
      .put(`/api/cocktails/${slug}/organization`)
      .set('Authorization', auth())
      .send({ folderIds, expectedVersion, tagNames: ['Kept'] })
      .expect(200);

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

  it('creates an empty folder without a recipe and preserves exact, trimmed per-workspace name uniqueness', async () => {
    const name = `Name ${randomUUID()}`;
    const response = await api()
      .post('/api/folders')
      .set('Authorization', auth())
      .send({ name: `  ${name}  ` })
      .expect(201);
    const created = response.body as { id: string; name: string };
    expect(created.name).toBe(name);
    const detail = await api()
      .get(`/api/folders/${created.id}`)
      .set('Authorization', auth())
      .expect(200);
    expect(detail.body).toEqual({ ...created, version: 0, cocktailCount: 0 });
    await api()
      .post('/api/folders')
      .set('Authorization', auth())
      .send({ name })
      .expect(409);
    await api()
      .post('/api/folders')
      .set('Authorization', auth())
      .send({ name: name.toUpperCase() })
      .expect(201);
    await api()
      .post('/api/folders')
      .set('Authorization', auth(bob))
      .send({ name })
      .expect(201);
    const raceName = `Concurrent ${randomUUID()}`;
    const race = await Promise.all(
      [0, 1].map(() =>
        api()
          .post('/api/folders')
          .set('Authorization', auth())
          .send({ name: raceName }),
      ),
    );
    expect(race.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('browses stable pages with search/counts, empty states and workspace isolation', async () => {
    const marker = `Browse-${randomUUID()}`;
    const names = Array.from(
      { length: 27 },
      (_, i) => `${marker}-${String(i).padStart(2, '0')}`,
    );
    await prisma.folder.createMany({
      data: names.map((name) => ({ workspaceId: alice.workspaceId, name })),
    });
    await folder(bob, names[0]);
    const first = await api()
      .get('/api/folders/browse')
      .query({ search: marker.toLowerCase() })
      .set('Authorization', auth())
      .expect(200);
    const page1 = first.body as FolderPage;
    expect(page1.total).toBe(27);
    expect(page1.items.map((f) => f.name)).toEqual(names.slice(0, 25));
    expect(page1.totalPages).toBe(2);
    expect(page1.items[0]).toMatchObject({ version: 0, cocktailCount: 0 });
    const second = await api()
      .get('/api/folders/browse')
      .query({ search: marker, page: 2 })
      .set('Authorization', auth())
      .expect(200);
    expect((second.body as FolderPage).items.map((f) => f.name)).toEqual(
      names.slice(25),
    );
    const empty = await api()
      .get('/api/folders/browse')
      .query({ search: randomUUID() })
      .set('Authorization', auth())
      .expect(200);
    expect(empty.body).toMatchObject({ items: [], total: 0, totalPages: 0 });
    const beyond = await api()
      .get('/api/folders/browse')
      .query({ search: marker, page: 3 })
      .set('Authorization', auth())
      .expect(200);
    expect(beyond.body).toMatchObject({ items: [], total: 27, totalPages: 2 });
  });

  it('uses uniform 404 for absent or foreign resources and 400 for malformed identifiers', async () => {
    const foreign = await folder(bob);
    const created = await recipe();
    const missing = randomUUID();
    for (const id of [foreign.id, missing]) {
      const response = await api()
        .get(`/api/folders/${id}`)
        .set('Authorization', auth())
        .expect(404);
      expect(response.body).toMatchObject({ message: 'Folder not found.' });
      await api()
        .patch(`/api/folders/${id}`)
        .set('Authorization', auth())
        .send({ name: 'Unavailable', expectedVersion: 0 })
        .expect(404);
      await api()
        .delete(`/api/folders/${id}`)
        .query({ expectedVersion: 0 })
        .set('Authorization', auth())
        .expect(404);
      await api()
        .put(`/api/folders/${id}/cocktails/${created.id}`)
        .set('Authorization', auth())
        .expect(404);
      await api()
        .delete(`/api/folders/${id}/cocktails/${created.id}`)
        .set('Authorization', auth())
        .expect(404);
    }
    await api()
      .get('/api/folders/invalid')
      .set('Authorization', auth())
      .expect(400);
    await api().get('/api/folders/browse').expect(401);
  });

  it('renames with optimistic versioning and keeps name/version on a duplicate or stale request', async () => {
    const a = await folder();
    const b = await folder();
    const renamed = await api()
      .patch(`/api/folders/${a.id}`)
      .set('Authorization', auth())
      .send({ name: `  ${a.name} renamed  `, expectedVersion: 0 })
      .expect(200);
    expect(renamed.body).toMatchObject({
      id: a.id,
      name: `${a.name} renamed`,
      version: 1,
    });
    await api()
      .patch(`/api/folders/${a.id}`)
      .set('Authorization', auth())
      .send({ name: b.name, expectedVersion: 1 })
      .expect(409);
    await api()
      .patch(`/api/folders/${a.id}`)
      .set('Authorization', auth())
      .send({ name: 'Stale', expectedVersion: 0 })
      .expect(409);
    await api()
      .delete(`/api/folders/${a.id}`)
      .query({ expectedVersion: 0 })
      .set('Authorization', auth())
      .expect(409);
    const stored = await prisma.folder.findUniqueOrThrow({
      where: { id: a.id },
    });
    expect(stored.name).toBe(`${a.name} renamed`);
    expect(stored.version).toBe(1);
  });

  it('adds a deduplicated batch and removes only the requested link, with stable no-op versions', async () => {
    const [a, b] = await Promise.all([folder(), folder()]);
    const [one, two] = await Promise.all([recipe(), recipe()]);
    await organize(one.slug, [a.id]);
    await api()
      .post(`/api/folders/${b.id}/cocktails`)
      .set('Authorization', auth())
      .send({ cocktailIds: [one.id, one.id.toUpperCase(), two.id] })
      .expect(200)
      .expect({ added: 2 });
    await api()
      .put(`/api/folders/${b.id}/cocktails/${one.id}`)
      .set('Authorization', auth())
      .expect(200)
      .expect({ added: 0 });
    const linked = await getDetail(one.slug);
    expect(linked.organizationVersion).toBe(2);
    expect(linked.folder?.id).toBe(a.id);
    expect(linked.folders).toHaveLength(2);
    await api()
      .delete(`/api/folders/${a.id}/cocktails/${one.id}`)
      .set('Authorization', auth())
      .expect(200)
      .expect({ removed: 1 });
    await api()
      .delete(`/api/folders/${a.id}/cocktails/${one.id}`)
      .set('Authorization', auth())
      .expect(200)
      .expect({ removed: 0 });
    const remaining = await getDetail(one.slug);
    expect(remaining.organizationVersion).toBe(3);
    expect(remaining.folder?.id).toBe(b.id);
    expect(remaining.folders.map((f) => f.id)).toEqual([b.id]);
    expect(remaining.tags.map((t) => t.name)).toEqual(['Kept']);
    expect(remaining.ingredients).toEqual(linked.ingredients);
    const counted = await api()
      .get(`/api/folders/${b.id}`)
      .set('Authorization', auth())
      .expect(200);
    expect((counted.body as FolderDetail).cocktailCount).toBe(2);
    await api()
      .delete(`/api/folders/${b.id}/cocktails/${one.id}`)
      .set('Authorization', auth())
      .expect(200)
      .expect({ removed: 1 });
    const empty = await getDetail(one.slug);
    expect(empty.organizationVersion).toBe(4);
    expect(empty.folder).toBeNull();
    expect(empty.folders).toEqual([]);
  });

  it('rejects an entire foreign/unknown batch before any link or version change', async () => {
    const target = await folder();
    const [own, foreign] = await Promise.all([recipe(), recipe(bob)]);
    for (const bad of [foreign.id, randomUUID()]) {
      await api()
        .post(`/api/folders/${target.id}/cocktails`)
        .set('Authorization', auth())
        .send({ cocktailIds: [own.id, bad] })
        .expect(404);
      await api()
        .delete(`/api/folders/${target.id}/cocktails/${bad}`)
        .set('Authorization', auth())
        .expect(404);
    }
    expect(
      await prisma.cocktailFolder.count({ where: { folderId: target.id } }),
    ).toBe(0);
    expect((await getDetail(own.slug)).organizationVersion).toBe(0);
  });

  it('deletes only the folder, correcting legacy representatives while retaining all recipes, tags and other links', async () => {
    const [a, b] = await Promise.all([folder(), folder()]);
    const [one, two, unrelated] = await Promise.all([
      recipe(),
      recipe(),
      recipe(),
    ]);
    await organize(one.slug, [a.id]);
    await organize(one.slug, [a.id, b.id], 1);
    await organize(two.slug, [a.id]);
    const before = await getDetail(one.slug);
    expect(before.folder?.id).toBe(a.id);
    await api()
      .delete(`/api/folders/${a.id}`)
      .query({ expectedVersion: 0 })
      .set('Authorization', auth())
      .expect(200)
      .expect({ deleted: true });
    const remaining = await getDetail(one.slug);
    expect(remaining.folder?.id).toBe(b.id);
    expect(remaining.folders.map((f) => f.id)).toEqual([b.id]);
    expect(remaining.organizationVersion).toBe(3);
    expect(remaining.tags).toEqual(before.tags);
    expect(remaining.ingredients).toEqual(before.ingredients);
    expect(remaining.garnishes).toEqual(before.garnishes);
    expect(remaining.steps).toEqual(before.steps);
    const empty = await getDetail(two.slug);
    expect(empty.folder).toBeNull();
    expect(empty.folders).toEqual([]);
    expect(empty.organizationVersion).toBe(2);
    expect((await getDetail(unrelated.slug)).organizationVersion).toBe(0);
    const filter = await api()
      .get('/api/cocktails')
      .query({ folderId: b.id })
      .set('Authorization', auth())
      .expect(200);
    expect((filter.body as CocktailListResult).items.map((c) => c.id)).toEqual([
      one.id,
    ]);
    expect(
      await prisma.cocktailFolder.count({ where: { folderId: a.id } }),
    ).toBe(0);
  });

  it('rolls back folder deletion, link changes and version increments on a database failure', async () => {
    const target = await folder();
    const created = await recipe();
    await organize(created.slug, [target.id]);
    const before = await getDetail(created.slug);
    const name = `bb_folder_${randomUUID().replaceAll('-', '')}`;
    await pool.query(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD."id"='${target.id}' THEN RAISE EXCEPTION 'synthetic folder failure'; END IF; RETURN OLD; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER "${name}" BEFORE DELETE ON "Folder" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
    );
    try {
      await api()
        .delete(`/api/folders/${target.id}`)
        .query({ expectedVersion: 0 })
        .set('Authorization', auth())
        .expect(500);
      expect(await getDetail(created.slug)).toEqual(before);
      expect(await prisma.folder.count({ where: { id: target.id } })).toBe(1);
    } finally {
      await pool.query(`DROP TRIGGER "${name}" ON "Folder"`);
      await pool.query(`DROP FUNCTION "${name}"()`);
    }
  });

  it('serializes concurrent renames and idempotent adds', async () => {
    const target = await folder();
    const created = await recipe();
    const rename = await Promise.all(
      ['one', 'two'].map((suffix) =>
        api()
          .patch(`/api/folders/${target.id}`)
          .set('Authorization', auth())
          .send({ name: `${target.name} ${suffix}`, expectedVersion: 0 }),
      ),
    );
    expect(rename.map((r) => r.status).sort()).toEqual([200, 409]);
    const adds = await Promise.all(
      [0, 1].map(() =>
        api()
          .put(`/api/folders/${target.id}/cocktails/${created.id}`)
          .set('Authorization', auth()),
      ),
    );
    expect(adds.map((r) => r.status)).toEqual([200, 200]);
    expect(adds.map((r) => (r.body as { added: number }).added).sort()).toEqual(
      [0, 1],
    );
    expect((await getDetail(created.slug)).organizationVersion).toBe(1);
  });

  it('handles deletion racing an add without an orphan or lost recipe', async () => {
    const target = await folder();
    const created = await recipe();
    const [removed, added] = await Promise.all([
      api()
        .delete(`/api/folders/${target.id}`)
        .query({ expectedVersion: 0 })
        .set('Authorization', auth()),
      api()
        .put(`/api/folders/${target.id}/cocktails/${created.id}`)
        .set('Authorization', auth()),
    ]);
    expect(removed.status).toBe(200);
    expect([200, 404]).toContain(added.status);
    const remaining = await getDetail(created.slug);
    expect(remaining.folders).toEqual([]);
    expect(remaining.folder).toBeNull();
    expect(remaining.organizationVersion).toBe(added.status === 200 ? 2 : 0);
  });

  it('rejects invalid command bodies, versions, queries and spoofed workspace IDs', async () => {
    const target = await folder();
    const path = `/api/folders/${target.id}`;
    for (const cocktailIds of [
      null,
      [],
      ['invalid'],
      Array<string>(101).fill(randomUUID()),
    ]) {
      await api()
        .post(`${path}/cocktails`)
        .set('Authorization', auth())
        .send({ cocktailIds })
        .expect(400);
    }
    for (const query of [
      { page: 0 },
      { page: 1000001 },
      { pageSize: 101 },
      { page: 'NaN' },
      { workspaceId: bob.workspaceId },
    ]) {
      await api()
        .get('/api/folders/browse')
        .query(query)
        .set('Authorization', auth())
        .expect(400);
    }
    for (const change of [
      { name: '' },
      { name: ' '.repeat(5) },
      { name: 'a'.repeat(81) },
      { expectedVersion: '0' },
      { expectedVersion: null },
      { expectedVersion: -1 },
      { workspaceId: bob.workspaceId },
    ]) {
      await api()
        .patch(path)
        .set('Authorization', auth())
        .send({ name: 'Valid', expectedVersion: 0, ...change })
        .expect(400);
    }
    for (const expectedVersion of ['', 'NaN', '-1', '0.5']) {
      await api()
        .delete(path)
        .query({ expectedVersion })
        .set('Authorization', auth())
        .expect(400);
    }
    await api().delete(path).set('Authorization', auth()).expect(400);
  });
});
