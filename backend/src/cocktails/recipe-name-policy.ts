import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { toSlug } from '../common/slug';
import { isPrismaKnownRequestError } from '../common/prisma-errors';
import {
  createCocktailSlug,
  requireCocktailCreationSlug,
} from './cocktail-creation.rules';

type Database = Pick<Prisma.TransactionClient, 'cocktail'>;
export type RecipeNameStatus = 'AVAILABLE' | 'NAME_TAKEN' | 'SLUG_RESERVED';

/** Caller authorizes the workspace first. Trash is deliberately included. */
export async function recipeNameStatus(
  db: Database,
  workspaceId: string,
  name: string,
  options: { cocktailId?: string; creation: boolean },
): Promise<RecipeNameStatus> {
  const nameKey = requireCocktailCreationSlug(name, 'Cocktail name');
  const named = await db.cocktail.findUnique({
    where: { workspaceId_nameKey: { workspaceId, nameKey } },
    select: { id: true },
  });
  if (named && named.id !== options.cocktailId) return 'NAME_TAKEN';
  if (options.creation) {
    const addressed = await db.cocktail.findUnique({
      where: {
        workspaceId_slug: { workspaceId, slug: createCocktailSlug(name) },
      },
      select: { id: true },
    });
    if (addressed) return 'SLUG_RESERVED';
  }
  return 'AVAILABLE';
}

export function recipeNameConflict(
  status: Exclude<RecipeNameStatus, 'AVAILABLE'>,
): ConflictException {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code:
      status === 'NAME_TAKEN'
        ? 'COCKTAIL_NAME_TAKEN'
        : 'COCKTAIL_SLUG_RESERVED',
    message:
      status === 'NAME_TAKEN'
        ? 'A cocktail with this canonical name already exists, including retained trash.'
        : 'The URL for this name is reserved by an existing recipe.',
  });
}

export async function requireRecipeNameAvailable(
  db: Database,
  workspaceId: string,
  name: string,
  options: { cocktailId?: string; creation: boolean },
): Promise<void> {
  const status = await recipeNameStatus(db, workspaceId, name, options);
  if (status !== 'AVAILABLE') throw recipeNameConflict(status);
}

/** Identify only this recipe constraint; never label an ingredient/version/access race as a name collision. */
export function recipeNameDatabaseConflict(
  error: unknown,
): ConflictException | null {
  if (!isPrismaKnownRequestError(error, 'P2002')) return null;
  if (error.meta?.modelName && error.meta.modelName !== 'Cocktail') return null;
  const target: unknown = error.meta?.target;
  if (
    (error.meta?.modelName === 'Cocktail' &&
      Array.isArray(target) &&
      target.includes('nameKey')) ||
    target === 'Cocktail_workspaceId_nameKey_key'
  )
    return recipeNameConflict('NAME_TAKEN');
  if (
    (error.meta?.modelName === 'Cocktail' &&
      Array.isArray(target) &&
      target.includes('slug')) ||
    target === 'Cocktail_workspaceId_slug_key'
  )
    return recipeNameConflict('SLUG_RESERVED');
  return null;
}

export const canonicalRecipeName = toSlug;
