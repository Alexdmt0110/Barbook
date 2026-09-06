import { PrismaService } from '../database/prisma.service';
import { CocktailsService } from './cocktails.service';

type FindUniqueMock = jest.Mock<
  Promise<{
    id: string;
  } | null>,
  [Record<string, unknown>]
>;

type FindManyMock = jest.Mock<Promise<unknown[]>, [Record<string, unknown>]>;

type CountMock = jest.Mock<Promise<number>, [Record<string, unknown>]>;

type TransactionMock = jest.Mock<Promise<unknown[]>, [Promise<unknown>[]]>;

const FOLDER_ID = '550e8400-e29b-41d4-a716-446655440000';

const TAG_ID = '550e8400-e29b-41d4-a716-446655440001';

describe('CocktailsService organization filtering', () => {
  let workspaceFindUnique: FindUniqueMock;
  let cocktailFindMany: FindManyMock;
  let cocktailCount: CountMock;
  let transaction: TransactionMock;

  let service: CocktailsService;

  beforeEach(() => {
    workspaceFindUnique = jest.fn<
      Promise<{
        id: string;
      } | null>,
      [Record<string, unknown>]
    >();

    cocktailFindMany = jest.fn<Promise<unknown[]>, [Record<string, unknown>]>();

    cocktailCount = jest.fn<Promise<number>, [Record<string, unknown>]>();

    transaction = jest.fn(
      async (operations: Promise<unknown>[]): Promise<unknown[]> =>
        Promise.all(operations),
    );

    const prismaService = {
      workspace: {
        findUnique: workspaceFindUnique,
      },
      cocktail: {
        count: cocktailCount,
        findMany: cocktailFindMany,
      },
      $transaction: transaction,
    } as unknown as PrismaService;

    service = new CocktailsService(prismaService);

    workspaceFindUnique.mockResolvedValue({
      id: 'workspace-123',
    });

    cocktailCount.mockResolvedValue(0);
    cocktailFindMany.mockResolvedValue([]);
  });

  it('filters cocktails by folder inside the personal workspace', async () => {
    await service.findPersonalCocktails('user-123', {
      folderId: FOLDER_ID,
    });

    const expectedWhere = {
      workspaceId: 'workspace-123',
      folderId: FOLDER_ID,
    };

    expect(cocktailCount).toHaveBeenCalledWith({
      where: expectedWhere,
    });

    expect(cocktailFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: expectedWhere,
    });
  });

  it('filters cocktails by tag relation inside the personal workspace', async () => {
    await service.findPersonalCocktails('user-123', {
      tagId: TAG_ID,
    });

    const expectedWhere = {
      workspaceId: 'workspace-123',
      tags: {
        some: {
          workspaceId: 'workspace-123',
          tagId: TAG_ID,
        },
      },
    };

    expect(cocktailCount).toHaveBeenCalledWith({
      where: expectedWhere,
    });

    expect(cocktailFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: expectedWhere,
    });
  });

  it('combines folder and tag filters with pagination', async () => {
    cocktailCount.mockResolvedValue(13);

    const result = await service.findPersonalCocktails('user-123', {
      folderId: FOLDER_ID,
      tagId: TAG_ID,
      page: 2,
      pageSize: 10,
    });

    const expectedWhere = {
      workspaceId: 'workspace-123',
      folderId: FOLDER_ID,
      tags: {
        some: {
          workspaceId: 'workspace-123',
          tagId: TAG_ID,
        },
      },
    };

    expect(cocktailCount).toHaveBeenCalledWith({
      where: expectedWhere,
    });

    expect(cocktailFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: expectedWhere,
      skip: 10,
      take: 10,
    });

    expect(result).toEqual({
      items: [],
      page: 2,
      pageSize: 10,
      total: 13,
      totalPages: 2,
    });
  });
});
