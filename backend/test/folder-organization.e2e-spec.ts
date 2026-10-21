import { NestExpressApplication } from '@nestjs/platform-express';
import { Server } from 'node:http';
import * as request from 'supertest';
import {
  CocktailDetail,
  CocktailListResult,
} from '../src/cocktails/cocktail.types';
import { CocktailOrganizationResult } from '../src/cocktails/organization/cocktail-organization.types';
import { PrismaService } from '../src/database/prisma.service';
import {
  Actor,
  browserHeaders,
  createActor,
  createApplicationFixture,
  recipePayload,
} from './helpers/application-fixture';

describe('Versioned multiple folder HTTP contracts', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  let alice: Actor;
  let bob: Actor;
  const api = () => request(app.getHttpServer());
  const auth = (actor: Actor) => browserHeaders(actor);
  const save = (slug: string, payload: object) =>
    api()
      .put(`/api/cocktails/${slug}/organization`)
      .set(auth(alice))
      .send(payload);
  async function recipe() {
    const response = await api()
      .post('/api/cocktails')
      .set(auth(alice))
      .send(recipePayload())
      .expect(201);
    return response.body as { id: string; slug: string };
  }
  const folder = (actor = alice) =>
    prisma.folder.create({
      data: { workspaceId: actor.workspaceId, name: recipePayload().name },
    });
  const detail = async (slug: string) => {
    const response = await api()
      .get(`/api/cocktails/${slug}`)
      .set(auth(alice))
      .expect(200);
    return response.body as CocktailDetail;
  };
  beforeAll(async () => {
    app = await createApplicationFixture();
    prisma = app.get(PrismaService);
    alice = await createActor(app);
    bob = await createActor(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it('round trips zero, one and multiple links, deduplicates, filters each folder without duplicating recipes', async () => {
    const created = await recipe();
    const [a, b] = await Promise.all([folder(), folder()]);
    expect((await detail(created.slug)).organizationVersion).toBe(0);
    const response = await save(created.slug, {
      folderIds: [a.id, a.id, b.id.toUpperCase()],
      expectedVersion: 0,
      tagNames: ['Multiple'],
    }).expect(200);
    const result = response.body as CocktailOrganizationResult;
    expect(result.organizationVersion).toBe(1);
    expect(result.folders.map((f) => f.id).sort()).toEqual([a.id, b.id].sort());
    const stored = await detail(created.slug);
    expect(stored.folders).toEqual(result.folders);
    expect(stored.organizationVersion).toBe(1);
    for (const id of [a.id, b.id]) {
      const filtered = await api()
        .get('/api/cocktails')
        .query({ folderId: id, tagId: result.tags[0].id })
        .set(auth(alice))
        .expect(200);
      const list = filtered.body as CocktailListResult;
      expect(list.total).toBe(1);
      expect(list.items[0].folders).toHaveLength(2);
    }
    await save(created.slug, {
      folderIds: [b.id],
      expectedVersion: 1,
      tagNames: [],
    }).expect(200);
    expect((await detail(created.slug)).folder?.id).toBe(b.id);
    await save(created.slug, {
      folderIds: [],
      expectedVersion: 2,
      tagNames: [],
    }).expect(200);
    const empty = await detail(created.slug);
    expect(empty.folders).toEqual([]);
    expect(empty.folder).toBeNull();
    expect(empty.organizationVersion).toBe(3);
  });

  it('refuses a legacy write over several folders, preserving the complete set and tags', async () => {
    const created = await recipe();
    const [a, b] = await Promise.all([folder(), folder()]);
    await save(created.slug, {
      folderIds: [a.id, b.id],
      expectedVersion: 0,
      tagNames: ['Kept'],
    }).expect(200);
    await save(created.slug, {
      folderId: null,
      tagNames: ['Must never persist'],
    }).expect(409);
    const stored = await detail(created.slug);
    expect(stored.folders).toHaveLength(2);
    expect(stored.tags.map((t) => t.name)).toEqual(['Kept']);
    expect(stored.organizationVersion).toBe(1);
    expect(
      await prisma.tag.count({
        where: { workspaceId: alice.workspaceId, slug: 'must-never-persist' },
      }),
    ).toBe(0);
  });

  it('allows exactly one concurrent replacement with the same expected version and no orphan tags', async () => {
    const created = await recipe();
    const [a, b] = await Promise.all([folder(), folder()]);
    const marker = created.id.replaceAll('-', '');
    const payloads = [a, b].map((f, i) => ({
      folderIds: [f.id],
      expectedVersion: 0,
      tagNames: [`${marker}${i}`],
    }));
    const responses = await Promise.all(
      payloads.map((p) => save(created.slug, p)),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const winner = responses.findIndex((r) => r.status === 200);
    const stored = await detail(created.slug);
    expect(stored.folders.map((f) => f.id)).toEqual(payloads[winner].folderIds);
    expect(stored.tags.map((t) => t.name)).toEqual(payloads[winner].tagNames);
    expect(stored.organizationVersion).toBe(1);
    expect(
      await prisma.tag.count({
        where: {
          workspaceId: alice.workspaceId,
          slug: payloads[1 - winner].tagNames[0],
        },
      }),
    ).toBe(0);
  });

  it('validates the entire workspace set before any mutation', async () => {
    const created = await recipe();
    const [own, foreign] = await Promise.all([folder(), folder(bob)]);
    await save(created.slug, {
      folderIds: [own.id, foreign.id],
      expectedVersion: 0,
      tagNames: ['Foreign must not persist'],
    }).expect(400);
    expect((await detail(created.slug)).organizationVersion).toBe(0);
    expect(
      await prisma.cocktailFolder.count({ where: { cocktailId: created.id } }),
    ).toBe(0);
    expect(
      await prisma.tag.count({
        where: {
          workspaceId: alice.workspaceId,
          slug: 'foreign-must-not-persist',
        },
      }),
    ).toBe(0);
    const foreignList = await api()
      .get('/api/cocktails')
      .query({ folderId: own.id })
      .set(auth(bob))
      .expect(200);
    expect((foreignList.body as CocktailListResult).total).toBe(0);
  });

  it('rejects missing/mixed contracts, nulls, invalid IDs, oversized sets and noninteger versions through the real pipe', async () => {
    const created = await recipe();
    const own = await folder();
    for (const change of [
      { folderIds: null },
      { folderIds: ['invalid'] },
      { folderIds: Array<string>(1001).fill(own.id) },
      { folderId: null },
      { expectedVersion: null },
      { expectedVersion: -1 },
      { expectedVersion: 0.5 },
      { expectedVersion: '0' },
    ]) {
      await save(created.slug, {
        folderIds: [],
        expectedVersion: 0,
        tagNames: [],
        ...change,
      }).expect(400);
    }
    await save(created.slug, { folderIds: [], tagNames: [] }).expect(400);
    await save(created.slug, { tagNames: [] }).expect(400);
    expect((await detail(created.slug)).organizationVersion).toBe(0);
  });
});
