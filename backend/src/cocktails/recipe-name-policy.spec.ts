import { Prisma } from '../generated/prisma/client';
import {
  recipeNameDatabaseConflict,
  recipeNameStatus,
} from './recipe-name-policy';

function unique(meta: Record<string, unknown>) {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError;
  Object.defineProperties(error, {
    code: { value: 'P2002' },
    meta: { value: meta },
  });
  return error;
}
describe('Recipe name conflict identification', () => {
  it.each([
    [
      {
        modelName: 'Cocktail',
        driverAdapterError: {
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: { index: 'Cocktail_workspaceId_nameKey_key' },
          },
        },
      },
      'COCKTAIL_NAME_TAKEN',
    ],
    [
      {
        driverAdapterError: {
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: { index: 'Cocktail_workspaceId_slug_key' },
          },
        },
      },
      'COCKTAIL_SLUG_RESERVED',
    ],
    [
      { modelName: 'Cocktail', target: ['workspaceId', 'nameKey'] },
      'COCKTAIL_NAME_TAKEN',
    ],
    [{ target: 'Cocktail_workspaceId_nameKey_key' }, 'COCKTAIL_NAME_TAKEN'],
    [
      { modelName: 'Cocktail', target: ['workspaceId', 'slug'] },
      'COCKTAIL_SLUG_RESERVED',
    ],
  ])('maps only an identified recipe constraint %j', (meta, code) => {
    expect(
      recipeNameDatabaseConflict(unique(meta))?.getResponse(),
    ).toMatchObject({ code });
  });
  it.each([
    { modelName: 'Ingredient', target: ['workspaceId', 'slug'] },
    { modelName: 'Cocktail', target: ['id'] },
    { target: ['workspaceId', 'slug'] },
    { target: ['workspaceId', 'nameKey'] },
    {
      driverAdapterError: {
        cause: {
          kind: 'UniqueConstraintViolation',
          constraint: { index: 'Ingredient_workspaceId_slug_key' },
        },
      },
    },
    {
      driverAdapterError: {
        cause: {
          kind: 'ForeignKeyConstraintViolation',
          constraint: { index: 'Cocktail_workspaceId_nameKey_key' },
        },
      },
    },
    { modelName: 'Cocktail' },
    {},
  ])('does not mislabel %j', (meta) => {
    expect(recipeNameDatabaseConflict(unique(meta))).toBeNull();
  });
  it('does not inspect a random exception as a database conflict', () =>
    expect(recipeNameDatabaseConflict(new Error('unavailable'))).toBeNull());
  it('excludes the current recipe in edit mode and does not recompute its immutable URL', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'current' });
    const db = {
      cocktail: { findUnique },
    } as unknown as Prisma.TransactionClient;
    await expect(
      recipeNameStatus(db, 'ws', 'Mójito', {
        cocktailId: 'current',
        creation: false,
      }),
    ).resolves.toBe('AVAILABLE');
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { workspaceId_nameKey: { workspaceId: 'ws', nameKey: 'mojito' } },
      select: { id: true },
    });
  });
});
