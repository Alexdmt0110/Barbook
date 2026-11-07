import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CocktailCreationValidationError } from './cocktail-creation.rules';
import { canonicalRecipeName, recipeNameStatus } from './recipe-name-policy';
import { RecipeNameQuery } from './dto/recipe-name-query.dto';

@Injectable()
export class RecipeNameAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}
  async personal(userId: string, query: RecipeNameQuery) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { personalOwnerId: userId },
      select: { id: true },
    });
    if (!workspace) throw new NotFoundException('Workspace unavailable.');
    return this.prisma.$transaction(
      (tx) => this.inWorkspace(tx, workspace.id, query),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );
  }
  async inWorkspace(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    query: RecipeNameQuery,
  ) {
    if (query.cocktailId) {
      const current = await tx.cocktail.findUnique({
        where: {
          workspaceId_id: { workspaceId, id: query.cocktailId.toLowerCase() },
        },
        select: { id: true, deletedAt: true },
      });
      if (!current || current.deletedAt)
        throw new NotFoundException('Cocktail not found.');
    }
    try {
      const status = await recipeNameStatus(tx, workspaceId, query.name, {
        cocktailId: query.cocktailId?.toLowerCase(),
        creation: !query.cocktailId,
      });
      return { canonicalName: canonicalRecipeName(query.name), status };
    } catch (error: unknown) {
      if (error instanceof CocktailCreationValidationError)
        throw new BadRequestException(error.message);
      throw error;
    }
  }
}
