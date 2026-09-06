import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CocktailOrganizationService } from './cocktail-organization.service';

type QueryMock<TResult> = jest.Mock<
  Promise<TResult>,
  [Record<string, unknown>]
>;

interface FolderRecord {
  id: string;
  name: string;
}

interface TagRecord {
  id: string;
  name: string;
  slug: string;
}

interface TransactionMock {
  cocktail: {
    findUnique: QueryMock<{
      id: string;
    } | null>;
    update: QueryMock<{
      id: string;
    }>;
  };
  folder: {
    findUnique: QueryMock<FolderRecord | null>;
  };
  tag: {
    createMany: QueryMock<{
      count: number;
    }>;
    findMany: QueryMock<TagRecord[]>;
  };
  cocktailTag: {
    deleteMany: QueryMock<{
      count: number;
    }>;
    createMany: QueryMock<{
      count: number;
    }>;
  };
}

type TransactionCallback = (transaction: TransactionMock) => Promise<unknown>;

type PrismaTransactionMock = jest.Mock<Promise<unknown>, [TransactionCallback]>;

function createKnownRequestError(
  code: string,
): Prisma.PrismaClientKnownRequestError {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError;

  Object.defineProperty(error, 'code', {
    configurable: false,
    enumerable: true,
    value: code,
    writable: false,
  });

  return error;
}

describe('CocktailOrganizationService', () => {
  let workspaceFindUnique: QueryMock<{
    id: string;
  } | null>;

  let folderFindMany: QueryMock<FolderRecord[]>;

  let folderFindUnique: QueryMock<{
    id: string;
  } | null>;

  let folderCreate: QueryMock<FolderRecord>;

  let tagFindMany: QueryMock<TagRecord[]>;

  let transactionCocktailFindUnique: QueryMock<{
    id: string;
  } | null>;

  let transactionCocktailUpdate: QueryMock<{
    id: string;
  }>;

  let transactionFolderFindUnique: QueryMock<FolderRecord | null>;

  let transactionTagCreateMany: QueryMock<{
    count: number;
  }>;

  let transactionTagFindMany: QueryMock<TagRecord[]>;

  let cocktailTagDeleteMany: QueryMock<{
    count: number;
  }>;

  let cocktailTagCreateMany: QueryMock<{
    count: number;
  }>;

  let prismaTransaction: PrismaTransactionMock;

  let transaction: TransactionMock;

  let service: CocktailOrganizationService;

  beforeEach(() => {
    workspaceFindUnique = jest.fn<
      Promise<{
        id: string;
      } | null>,
      [Record<string, unknown>]
    >();

    folderFindMany = jest.fn<
      Promise<FolderRecord[]>,
      [Record<string, unknown>]
    >();

    folderFindUnique = jest.fn<
      Promise<{
        id: string;
      } | null>,
      [Record<string, unknown>]
    >();

    folderCreate = jest.fn<Promise<FolderRecord>, [Record<string, unknown>]>();

    tagFindMany = jest.fn<Promise<TagRecord[]>, [Record<string, unknown>]>();

    transactionCocktailFindUnique = jest.fn<
      Promise<{
        id: string;
      } | null>,
      [Record<string, unknown>]
    >();

    transactionCocktailUpdate = jest.fn<
      Promise<{
        id: string;
      }>,
      [Record<string, unknown>]
    >();

    transactionFolderFindUnique = jest.fn<
      Promise<FolderRecord | null>,
      [Record<string, unknown>]
    >();

    transactionTagCreateMany = jest.fn<
      Promise<{
        count: number;
      }>,
      [Record<string, unknown>]
    >();

    transactionTagFindMany = jest.fn<
      Promise<TagRecord[]>,
      [Record<string, unknown>]
    >();

    cocktailTagDeleteMany = jest.fn<
      Promise<{
        count: number;
      }>,
      [Record<string, unknown>]
    >();

    cocktailTagCreateMany = jest.fn<
      Promise<{
        count: number;
      }>,
      [Record<string, unknown>]
    >();

    transaction = {
      cocktail: {
        findUnique: transactionCocktailFindUnique,
        update: transactionCocktailUpdate,
      },
      folder: {
        findUnique: transactionFolderFindUnique,
      },
      tag: {
        createMany: transactionTagCreateMany,
        findMany: transactionTagFindMany,
      },
      cocktailTag: {
        deleteMany: cocktailTagDeleteMany,
        createMany: cocktailTagCreateMany,
      },
    };

    prismaTransaction = jest.fn<Promise<unknown>, [TransactionCallback]>();

    prismaTransaction.mockImplementation((callback) => callback(transaction));

    const prismaService = {
      workspace: {
        findUnique: workspaceFindUnique,
      },
      folder: {
        findMany: folderFindMany,
        findUnique: folderFindUnique,
        create: folderCreate,
      },
      tag: {
        findMany: tagFindMany,
      },
      $transaction: prismaTransaction,
    } as unknown as PrismaService;

    service = new CocktailOrganizationService(prismaService);

    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    folderFindMany.mockResolvedValue([]);

    folderFindUnique.mockResolvedValue(null);

    folderCreate.mockResolvedValue({
      id: 'folder-new',
      name: 'Classiques',
    });

    tagFindMany.mockResolvedValue([]);

    transactionCocktailFindUnique.mockResolvedValue({
      id: 'cocktail-123',
    });

    transactionCocktailUpdate.mockResolvedValue({
      id: 'cocktail-123',
    });

    transactionFolderFindUnique.mockResolvedValue({
      id: 'folder-123',
      name: 'Classiques',
    });

    transactionTagCreateMany.mockResolvedValue({
      count: 0,
    });

    transactionTagFindMany.mockResolvedValue([]);

    cocktailTagDeleteMany.mockResolvedValue({
      count: 0,
    });

    cocktailTagCreateMany.mockResolvedValue({
      count: 0,
    });
  });

  it('lists folders only from the personal workspace', async () => {
    folderFindMany.mockResolvedValue([
      {
        id: 'folder-1',
        name: 'Classiques',
      },
      {
        id: 'folder-2',
        name: 'Créations',
      },
    ]);

    const result = await service.listPersonalFolders('user-123');

    expect(workspaceFindUnique).toHaveBeenCalledWith({
      where: {
        personalOwnerId: 'user-123',
      },
      select: {
        id: true,
      },
    });

    expect(folderFindMany).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-123',
      },
      orderBy: [
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
      },
    });

    expect(result).toEqual([
      {
        id: 'folder-1',
        name: 'Classiques',
      },
      {
        id: 'folder-2',
        name: 'Créations',
      },
    ]);
  });

  it('creates a trimmed folder inside the personal workspace', async () => {
    const result = await service.createPersonalFolder('user-123', {
      name: '  Classiques  ',
    });

    expect(folderFindUnique).toHaveBeenCalledWith({
      where: {
        workspaceId_name: {
          workspaceId: 'workspace-123',
          name: 'Classiques',
        },
      },
      select: {
        id: true,
      },
    });

    expect(folderCreate).toHaveBeenCalledWith({
      data: {
        workspaceId: 'workspace-123',
        name: 'Classiques',
      },
      select: {
        id: true,
        name: true,
      },
    });

    expect(result).toEqual({
      id: 'folder-new',
      name: 'Classiques',
    });
  });

  it('rejects an existing folder before creation', async () => {
    folderFindUnique.mockResolvedValue({
      id: 'folder-existing',
    });

    await expect(
      service.createPersonalFolder('user-123', {
        name: 'Classiques',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(folderCreate).not.toHaveBeenCalled();
  });

  it('maps a concurrent folder uniqueness violation to conflict', async () => {
    folderCreate.mockRejectedValue(createKnownRequestError('P2002'));

    await expect(
      service.createPersonalFolder('user-123', {
        name: 'Classiques',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists tags only from the personal workspace', async () => {
    tagFindMany.mockResolvedValue([
      {
        id: 'tag-1',
        name: 'Agrumes',
        slug: 'agrumes',
      },
      {
        id: 'tag-2',
        name: 'Classique',
        slug: 'classique',
      },
    ]);

    const result = await service.listPersonalTags('user-123');

    expect(tagFindMany).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-123',
      },
      orderBy: [
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    expect(result).toEqual([
      {
        id: 'tag-1',
        name: 'Agrumes',
        slug: 'agrumes',
      },
      {
        id: 'tag-2',
        name: 'Classique',
        slug: 'classique',
      },
    ]);
  });

  it('replaces the cocktail folder and tags atomically', async () => {
    transactionTagFindMany.mockResolvedValue([
      {
        id: 'tag-cafe',
        name: 'Café',
        slug: 'cafe',
      },
      {
        id: 'tag-agrumes',
        name: 'Agrumes',
        slug: 'agrumes',
      },
    ]);

    const result = await service.updatePersonalCocktailOrganization(
      'user-123',
      'espresso-martini',
      {
        folderId: '550e8400-e29b-41d4-a716-446655440000',
        tagNames: [' Café ', 'Cafe', 'Agrumes'],
      },
    );

    expect(transactionCocktailFindUnique).toHaveBeenCalledWith({
      where: {
        workspaceId_slug: {
          workspaceId: 'workspace-123',
          slug: 'espresso-martini',
        },
      },
      select: {
        id: true,
      },
    });

    expect(transactionFolderFindUnique).toHaveBeenCalledWith({
      where: {
        workspaceId_id: {
          workspaceId: 'workspace-123',
          id: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    expect(transactionTagCreateMany).toHaveBeenCalledWith({
      data: [
        {
          workspaceId: 'workspace-123',
          name: 'Café',
          slug: 'cafe',
        },
        {
          workspaceId: 'workspace-123',
          name: 'Agrumes',
          slug: 'agrumes',
        },
      ],
      skipDuplicates: true,
    });

    expect(transactionTagFindMany).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-123',
        slug: {
          in: ['cafe', 'agrumes'],
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    expect(transactionCocktailUpdate).toHaveBeenCalledWith({
      where: {
        workspaceId_id: {
          workspaceId: 'workspace-123',
          id: 'cocktail-123',
        },
      },
      data: {
        folderId: 'folder-123',
      },
    });

    expect(cocktailTagDeleteMany).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-123',
        cocktailId: 'cocktail-123',
      },
    });

    expect(cocktailTagCreateMany).toHaveBeenCalledWith({
      data: [
        {
          workspaceId: 'workspace-123',
          cocktailId: 'cocktail-123',
          tagId: 'tag-cafe',
        },
        {
          workspaceId: 'workspace-123',
          cocktailId: 'cocktail-123',
          tagId: 'tag-agrumes',
        },
      ],
    });

    expect(result).toEqual({
      folder: {
        id: 'folder-123',
        name: 'Classiques',
      },
      tags: [
        {
          id: 'tag-agrumes',
          name: 'Agrumes',
          slug: 'agrumes',
        },
        {
          id: 'tag-cafe',
          name: 'Café',
          slug: 'cafe',
        },
      ],
    });
  });

  it('removes the folder and every tag when the replacement is empty', async () => {
    const result = await service.updatePersonalCocktailOrganization(
      'user-123',
      'negroni',
      {
        folderId: null,
        tagNames: [],
      },
    );

    expect(transactionFolderFindUnique).not.toHaveBeenCalled();

    expect(transactionTagCreateMany).not.toHaveBeenCalled();

    expect(transactionTagFindMany).not.toHaveBeenCalled();

    expect(transactionCocktailUpdate).toHaveBeenCalledWith({
      where: {
        workspaceId_id: {
          workspaceId: 'workspace-123',
          id: 'cocktail-123',
        },
      },
      data: {
        folderId: null,
      },
    });

    expect(cocktailTagDeleteMany).toHaveBeenCalledTimes(1);

    expect(cocktailTagCreateMany).not.toHaveBeenCalled();

    expect(result).toEqual({
      folder: null,
      tags: [],
    });
  });

  it('rejects a folder that is unavailable in the personal workspace', async () => {
    transactionFolderFindUnique.mockResolvedValue(null);

    await expect(
      service.updatePersonalCocktailOrganization('user-123', 'negroni', {
        folderId: '550e8400-e29b-41d4-a716-446655440000',
        tagNames: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transactionCocktailUpdate).not.toHaveBeenCalled();

    expect(cocktailTagDeleteMany).not.toHaveBeenCalled();
  });

  it('returns not found when the cocktail does not belong to the personal workspace', async () => {
    transactionCocktailFindUnique.mockResolvedValue(null);

    await expect(
      service.updatePersonalCocktailOrganization(
        'user-123',
        'unknown-cocktail',
        {
          folderId: null,
          tagNames: [],
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(transactionFolderFindUnique).not.toHaveBeenCalled();

    expect(transactionCocktailUpdate).not.toHaveBeenCalled();
  });

  it('rejects a tag name that cannot produce a canonical slug', async () => {
    await expect(
      service.updatePersonalCocktailOrganization('user-123', 'negroni', {
        folderId: null,
        tagNames: ['--- !!! ---'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it('fails when persisted tags cannot all be resolved', async () => {
    transactionTagFindMany.mockResolvedValue([
      {
        id: 'tag-1',
        name: 'Classique',
        slug: 'classique',
      },
    ]);

    await expect(
      service.updatePersonalCocktailOrganization('user-123', 'negroni', {
        folderId: null,
        tagNames: ['Classique', 'Amer'],
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(transactionCocktailUpdate).not.toHaveBeenCalled();
  });

  it('fails before accessing organization data when the personal workspace is missing', async () => {
    workspaceFindUnique.mockResolvedValue(null);

    await expect(
      service.listPersonalFolders('user-123'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    await expect(service.listPersonalTags('user-123')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );

    await expect(
      service.updatePersonalCocktailOrganization('user-123', 'negroni', {
        folderId: null,
        tagNames: [],
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(folderFindMany).not.toHaveBeenCalled();
    expect(tagFindMany).not.toHaveBeenCalled();

    expect(prismaTransaction).not.toHaveBeenCalled();
  });
});
