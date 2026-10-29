import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CocktailContentService } from '../cocktails/cocktail-content.service';
import {
  requireVersion,
  requireVersionCapacity,
} from '../common/version-preconditions';
import { isPrismaKnownRequestError } from '../common/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { BatchPlan, Prisma } from '../generated/prisma/client';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { BrowseWorkspacesDto } from '../workspaces/workspace.dto';
import {
  BatchCalculationError,
  BatchParameters,
  calculateBatch,
} from './batch-calculation';
import {
  CreateBatchPlanDto,
  PreviewRecipeBatchDto,
  PreviewSavedBatchDto,
  UpdateBatchPlanDto,
} from './batch-plan.dto';
type RecipeSnapshot = Awaited<
  ReturnType<CocktailContentService['getInWorkspace']>
>;
const json = (value: object): Prisma.InputJsonObject =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
function parameters(dto: BatchParameters): BatchParameters {
  return {
    mode: dto.mode,
    target: dto.target,
    includedPositions: [...dto.includedPositions].sort((a, b) => a - b),
    rounding: [...dto.rounding]
      .map((r) => ({ unit: r.unit, step: r.step }))
      .sort((a, b) => a.unit.localeCompare(b.unit)),
  };
}
@Injectable()
export class BatchPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly content: CocktailContentService,
  ) {}
  list(user: string, workspace: string, query: BrowseWorkspacesDto) {
    return this.access.shared(user, workspace, async (tx, context) => ({
      items: await tx.batchPlan.findMany({
        where: { workspaceId: workspace },
        select: {
          id: true,
          name: true,
          sourceCocktailId: true,
          sourceContentVersion: true,
          version: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      total: await tx.batchPlan.count({ where: { workspaceId: workspace } }),
      page: query.page,
      pageSize: query.pageSize,
      accessVersion: context.accessVersion,
    }));
  }
  detail(user: string, workspace: string, id: string) {
    return this.access.shared(user, workspace, async (tx, context) => ({
      ...(await this.project(
        tx,
        workspace,
        await this.plan(tx, workspace, id),
      )),
      accessVersion: context.accessVersion,
    }));
  }
  previewRecipe(user: string, workspace: string, dto: PreviewRecipeBatchDto) {
    return this.access.shared(
      user,
      workspace,
      async (tx, context) => {
        const recipe = await this.source(tx, workspace, dto);
        return {
          snapshot: { schemaVersion: 1, recipe },
          parameters: parameters(dto),
          calculation: this.calculate(recipe, parameters(dto)),
          accessVersion: context.accessVersion,
        };
      },
      { expectedAccessVersion: dto.expectedAccessVersion },
    );
  }
  previewSaved(
    user: string,
    workspace: string,
    id: string,
    dto: PreviewSavedBatchDto,
  ) {
    return this.access.shared(
      user,
      workspace,
      async (tx, context) => {
        const plan = await this.plan(tx, workspace, id);
        requireVersion(plan.version, dto.expectedPlanVersion);
        const recipe = this.snapshot(plan);
        return {
          snapshot: { schemaVersion: 1, recipe },
          parameters: parameters(dto),
          calculation: this.calculate(recipe, parameters(dto)),
          accessVersion: context.accessVersion,
        };
      },
      { expectedAccessVersion: dto.expectedAccessVersion },
    );
  }
  create(user: string, workspace: string, dto: CreateBatchPlanDto) {
    const input = parameters(dto),
      key = dto.requestId.toLowerCase();
    const hash = createHash('sha256')
      .update(
        JSON.stringify([
          'batch-plan',
          workspace,
          dto.name,
          dto.sourceCocktailId,
          dto.expectedContentVersion,
          dto.expectedAccessVersion,
          input,
        ]),
      )
      .digest('hex');
    return this.access
      .shared(
        user,
        workspace,
        async (tx, context) => {
          const prior = await tx.batchPlan.findUnique({
            where: {
              creatorId_creationRequestId: {
                creatorId: user,
                creationRequestId: key,
              },
            },
          });
          if (prior) {
            if (
              prior.workspaceId !== workspace ||
              prior.creationFingerprint !== hash
            )
              throw new ConflictException(
                'This batch intention has a different payload.',
              );
            return {
              ...(await this.project(tx, workspace, prior)),
              accessVersion: context.accessVersion,
            };
          }
          const recipe = await this.source(tx, workspace, dto);
          this.calculate(recipe, input);
          const plan = await tx.batchPlan.create({
            data: {
              workspaceId: workspace,
              sourceCocktailId: recipe.id,
              sourceContentVersion: recipe.contentVersion,
              creatorId: user,
              creationRequestId: key,
              creationFingerprint: hash,
              name: dto.name,
              snapshot: json({ schemaVersion: 1, recipe }),
              parameters: json(input),
            },
          });
          return {
            ...(await this.project(tx, workspace, plan)),
            accessVersion: context.accessVersion,
          };
        },
        { expectedAccessVersion: dto.expectedAccessVersion },
      )
      .catch((error: unknown) => {
        if (isPrismaKnownRequestError(error, 'P2002'))
          throw new ConflictException(
            'Batch intention raced. Inspect its receipt before another action.',
          );
        throw error;
      });
  }
  receipt(user: string, workspace: string, key: string) {
    return this.access.shared(user, workspace, async (tx, context) => {
      const plan = await tx.batchPlan.findUnique({
        where: {
          creatorId_creationRequestId: {
            creatorId: user,
            creationRequestId: key.toLowerCase(),
          },
        },
      });
      if (!plan || plan.workspaceId !== workspace)
        throw new NotFoundException('Batch receipt unavailable.');
      return {
        ...(await this.project(tx, workspace, plan)),
        accessVersion: context.accessVersion,
      };
    });
  }
  update(user: string, workspace: string, id: string, dto: UpdateBatchPlanDto) {
    return this.access.shared(
      user,
      workspace,
      async (tx, context) => {
        const plan = await this.plan(tx, workspace, id);
        requireVersion(plan.version, dto.expectedPlanVersion);
        const input = parameters(dto),
          recipe = this.snapshot(plan);
        this.calculate(recipe, input);
        const old = parameters(plan.parameters as unknown as BatchParameters);
        if (
          plan.name === dto.name &&
          JSON.stringify(old) === JSON.stringify(input)
        )
          return {
            ...(await this.project(tx, workspace, plan)),
            accessVersion: context.accessVersion,
          };
        requireVersionCapacity(plan.version);
        const updated = await tx.batchPlan.update({
          where: { id: plan.id },
          data: {
            name: dto.name,
            parameters: json(input),
            version: { increment: 1 },
          },
        });
        return {
          ...(await this.project(tx, workspace, updated)),
          accessVersion: context.accessVersion,
        };
      },
      { expectedAccessVersion: dto.expectedAccessVersion },
    );
  }
  private async source(
    tx: Prisma.TransactionClient,
    workspace: string,
    dto: PreviewRecipeBatchDto,
  ) {
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "Cocktail" WHERE "workspaceId"=${workspace} AND "id"=${dto.sourceCocktailId} AND "deletedAt" IS NULL FOR UPDATE`;
    if (!locked.length) throw new NotFoundException('Cocktail unavailable.');
    const recipe = await this.content.getInWorkspace(
      tx,
      workspace,
      dto.sourceCocktailId,
    );
    requireVersion(recipe.contentVersion, dto.expectedContentVersion);
    return recipe;
  }
  private async plan(
    tx: Prisma.TransactionClient,
    workspace: string,
    id: string,
  ) {
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "BatchPlan" WHERE "workspaceId"=${workspace} AND "id"=${id} FOR UPDATE`;
    if (!locked.length) throw new NotFoundException('Batch plan unavailable.');
    return tx.batchPlan.findUniqueOrThrow({ where: { id } });
  }
  private snapshot(plan: BatchPlan): RecipeSnapshot {
    // The versioned document is constructed only by source(), never accepted from an API client.
    const stored = plan.snapshot as unknown as {
      schemaVersion: number;
      recipe: RecipeSnapshot;
    };
    if (
      stored?.schemaVersion !== 1 ||
      stored.recipe?.id !== plan.sourceCocktailId ||
      stored.recipe.contentVersion !== plan.sourceContentVersion
    )
      throw new InternalServerErrorException('Unsupported batch snapshot.');
    return stored.recipe;
  }
  private calculate(recipe: RecipeSnapshot, input: BatchParameters) {
    try {
      return calculateBatch(
        recipe.content.ingredients,
        recipe.content.garnishes,
        input,
      );
    } catch (error) {
      if (error instanceof BatchCalculationError)
        throw new BadRequestException(error.message);
      throw error;
    }
  }
  private async project(
    tx: Prisma.TransactionClient,
    workspace: string,
    plan: BatchPlan,
  ) {
    const recipe = this.snapshot(plan),
      input = parameters(plan.parameters as unknown as BatchParameters);
    const source = await tx.cocktail.findUnique({
      where: {
        workspaceId_id: { workspaceId: workspace, id: plan.sourceCocktailId },
      },
      select: { contentVersion: true, deletedAt: true },
    });
    return {
      id: plan.id,
      name: plan.name,
      version: plan.version,
      sourceCocktailId: plan.sourceCocktailId,
      sourceContentVersion: plan.sourceContentVersion,
      sourceChanged:
        !source ||
        !!source.deletedAt ||
        source.contentVersion !== plan.sourceContentVersion,
      snapshot: { schemaVersion: 1, recipe },
      parameters: input,
      calculation: this.calculate(recipe, input),
      creatorId: plan.creatorId,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
