import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CocktailOrganizationService } from './cocktail-organization.service';

const query = <T>(value: T) =>
  jest.fn<Promise<T>, [unknown]>().mockResolvedValue(value);
interface Folder {
  id: string;
  name: string;
}
interface Tag extends Folder {
  slug: string;
}
interface Organization {
  id: string;
  folderId: string | null;
  organizationVersion: number;
  _count: { folderMemberships: number };
  folderMemberships: { folderId: string }[];
  tags: { tag: Tag }[];
}
function fixture() {
  return {
    $queryRaw: query([{ id: 'workspace' }]),
    cocktail: {
      findUnique: query<Organization | null>({
        id: 'cocktail',
        folderId: null,
        organizationVersion: 0,
        _count: { folderMemberships: 0 },
        folderMemberships: [],
        tags: [],
      }),
      update: query({ organizationVersion: 1 }),
    },
    folder: { findMany: query<Folder[]>([{ id: 'a', name: 'A' }]) },
    tag: { createMany: query({ count: 0 }), findMany: query<Tag[]>([]) },
    cocktailFolder: {
      deleteMany: query({ count: 0 }),
      createMany: query({ count: 0 }),
    },
    cocktailTag: {
      deleteMany: query({ count: 0 }),
      createMany: query({ count: 0 }),
    },
  };
}

describe('CocktailOrganizationService', () => {
  let tx: ReturnType<typeof fixture>;
  let workspace: ReturnType<typeof query<{ id: string } | null>>;
  let service: CocktailOrganizationService;
  beforeEach(() => {
    tx = fixture();
    workspace = query<{ id: string } | null>({ id: 'workspace' });
    const prisma = {
      workspace: { findUnique: workspace },
      $transaction: (
        callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
      ) => callback(tx as unknown as Prisma.TransactionClient),
    } as unknown as PrismaService;
    service = new CocktailOrganizationService(prisma);
  });

  it('replaces deduplicated folders and canonical tags, preserving the representative', async () => {
    tx.cocktail.findUnique.mockResolvedValue({
      id: 'cocktail',
      folderId: 'b',
      organizationVersion: 0,
      _count: { folderMemberships: 1 },
      folderMemberships: [{ folderId: 'b' }],
      tags: [],
    });
    tx.folder.findMany.mockResolvedValue([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
    tx.tag.findMany.mockResolvedValue([
      { id: 'tag-cafe', name: 'Café', slug: 'cafe' },
      { id: 'tag-agrumes', name: 'Agrumes', slug: 'agrumes' },
    ]);
    const result = await service.updatePersonalCocktailOrganization(
      'user',
      'negroni',
      {
        folderIds: ['B', 'a', 'b'],
        expectedVersion: 0,
        tagNames: [' Café ', 'Cafe', 'Agrumes'],
      },
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.folder.findMany.mock.calls[0][0]).toMatchObject({
      where: { workspaceId: 'workspace', id: { in: ['b', 'a'] } },
    });
    expect(tx.tag.createMany).toHaveBeenCalledWith({
      data: [
        { workspaceId: 'workspace', name: 'Café', slug: 'cafe' },
        { workspaceId: 'workspace', name: 'Agrumes', slug: 'agrumes' },
      ],
      skipDuplicates: true,
    });
    expect(tx.cocktail.update.mock.calls[0][0]).toMatchObject({
      where: { workspaceId_id: { workspaceId: 'workspace', id: 'cocktail' } },
      data: { folderId: 'b', organizationVersion: { increment: 1 } },
    });
    expect(tx.cocktailFolder.createMany).toHaveBeenCalledWith({
      data: [
        { workspaceId: 'workspace', cocktailId: 'cocktail', folderId: 'a' },
        { workspaceId: 'workspace', cocktailId: 'cocktail', folderId: 'b' },
      ],
    });
    expect(result).toEqual({
      folder: { id: 'b', name: 'B' },
      folders: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      organizationVersion: 1,
      tags: [
        { id: 'tag-agrumes', name: 'Agrumes', slug: 'agrumes' },
        { id: 'tag-cafe', name: 'Café', slug: 'cafe' },
      ],
    });
  });

  it('accepts a legacy single folder and an empty replacement', async () => {
    const single = await service.updatePersonalCocktailOrganization(
      'user',
      'negroni',
      { folderId: 'a', expectedVersion: 0, tagNames: [] },
    );
    expect(single.folders).toEqual([{ id: 'a', name: 'A' }]);
    const empty = await service.updatePersonalCocktailOrganization(
      'user',
      'negroni',
      { folderId: null, expectedVersion: 0, tagNames: [] },
    );
    expect(empty).toEqual({
      folders: [],
      folder: null,
      tags: [],
      organizationVersion: 0,
    });
    expect(tx.cocktailFolder.deleteMany).toHaveBeenCalledWith({
      where: { workspaceId: 'workspace', cocktailId: 'cocktail' },
    });
    expect(tx.cocktailTag.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('rejects stale versions and legacy writes over a multiple set before creating tags or links', async () => {
    tx.cocktail.findUnique.mockResolvedValue({
      id: 'cocktail',
      folderId: 'a',
      organizationVersion: 2,
      _count: { folderMemberships: 2 },
      folderMemberships: [{ folderId: 'a' }, { folderId: 'b' }],
      tags: [],
    });
    for (const dto of [
      { folderIds: [], expectedVersion: 1, tagNames: ['Unwritten'] },
      { folderId: null, tagNames: ['Unwritten'] },
    ]) {
      await expect(
        service.updatePersonalCocktailOrganization('user', 'negroni', dto),
      ).rejects.toBeInstanceOf(ConflictException);
    }
    expect(tx.tag.createMany).not.toHaveBeenCalled();
    expect(tx.cocktail.update).not.toHaveBeenCalled();
    expect(tx.cocktailFolder.deleteMany).not.toHaveBeenCalled();
  });

  it.each([
    { folderIds: [], folderId: null, expectedVersion: 0, tagNames: [] },
    { tagNames: [] },
  ])('rejects an incomplete or mixed contract %j', async (dto) => {
    await expect(
      service.updatePersonalCocktailOrganization('user', 'negroni', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it('rejects unavailable folders before writing tags', async () => {
    tx.folder.findMany.mockResolvedValue([]);
    await expect(
      service.updatePersonalCocktailOrganization('user', 'negroni', {
        folderIds: ['foreign'],
        expectedVersion: 0,
        tagNames: ['Unwritten'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.tag.createMany).not.toHaveBeenCalled();
    expect(tx.cocktail.update).not.toHaveBeenCalled();
  });

  it('returns the same not found result for an unavailable cocktail', async () => {
    tx.cocktail.findUnique.mockResolvedValue(null);
    await expect(
      service.updatePersonalCocktailOrganization('user', 'missing', {
        folderId: null,
        tagNames: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.folder.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['--- !!! ---'],
    ['a'.repeat(41)],
    ['   '],
    Array.from({ length: 21 }, (_, i) => `Tag${i}`),
  ])(
    'rejects noncanonical or excessive tags %j',
    async (...tagNames: string[]) => {
      await expect(
        service.updatePersonalCocktailOrganization('user', 'negroni', {
          folderId: null,
          tagNames,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.$queryRaw).not.toHaveBeenCalled();
    },
  );

  it('fails atomically if stored tags cannot all be resolved', async () => {
    await expect(
      service.updatePersonalCocktailOrganization('user', 'negroni', {
        folderId: null,
        expectedVersion: 0,
        tagNames: ['Missing'],
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(tx.cocktail.update).not.toHaveBeenCalled();
  });

  it('fails when the workspace is missing or disappears before locking', async () => {
    workspace.mockResolvedValueOnce(null);
    await expect(
      service.updatePersonalCocktailOrganization('user', 'negroni', {
        folderId: null,
        tagNames: [],
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    tx.$queryRaw.mockResolvedValue([]);
    await expect(
      service.updatePersonalCocktailOrganization('user', 'negroni', {
        folderId: null,
        tagNames: [],
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(tx.cocktail.findUnique).not.toHaveBeenCalled();
  });
});
