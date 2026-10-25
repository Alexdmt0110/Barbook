import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { lockOrganizationWorkspace } from '../database/lock-organization-workspace';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import {
  CocktailLifecycleDto,
  ListTrashDto,
} from './dto/cocktail-lifecycle.dto';
import {
  requireVersion,
  requireVersionCapacity,
} from './organization/organization-preconditions';

const lifecycleSelect = {
  id: true,
  slug: true,
  name: true,
  contentVersion: true,
  organizationVersion: true,
  deletedAt: true,
  restoreUntil: true,
} satisfies Prisma.CocktailSelect;
type Lifecycle = Prisma.CocktailGetPayload<{ select: typeof lifecycleSelect }>;

@Injectable()
export class CocktailLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  private async workspaceId(userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { personalOwnerId: userId },
      select: { id: true },
    });
    if (!workspace)
      throw new NotFoundException('Personal workspace unavailable.');
    return workspace.id;
  }

  private async record(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    id: string,
  ) {
    const row = await tx.cocktail.findUnique({
      where: { workspaceId_id: { workspaceId, id } },
      select: lifecycleSelect,
    });
    if (!row) throw new NotFoundException('Recipe not found.');
    return row;
  }

  private async now(tx: Prisma.TransactionClient) {
    const [clock] = await tx.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AS now`;
    return clock.now;
  }

  private project(row: Lifecycle, now: Date) {
    return {
      ...row,
      canRestore: row.restoreUntil !== null && row.restoreUntil > now,
    };
  }

  async get(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.$transaction(async (tx) => {
      const row = await this.record(tx, workspaceId, id);
      return this.project(row, await this.now(tx));
    });
  }

  async list(userId: string, query: ListTrashDto) {
    const workspaceId = await this.workspaceId(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.prisma.$transaction(
      async (tx) => {
        const where = { workspaceId, deletedAt: { not: null } };
        const total = await tx.cocktail.count({ where });
        const rows = await tx.cocktail.findMany({
          where,
          select: lifecycleSelect,
          orderBy: [{ deletedAt: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        });
        const now = await this.now(tx);
        return {
          items: rows.map((row) => this.project(row, now)),
          total,
          page,
          pageSize,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async transition(
    userId: string,
    id: string,
    dto: CocktailLifecycleDto,
    restore: boolean,
  ) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.$transaction(async (tx) => {
      await lockOrganizationWorkspace(tx, workspaceId);
      // Take the recipe row lock before evaluating the wall clock, including waits
      // caused by database maintenance or any writer outside the workspace protocol.
      await tx.$queryRaw`SELECT "id" FROM "Cocktail" WHERE "id"=${id} AND "workspaceId"=${workspaceId} FOR UPDATE`;
      const current = await this.record(tx, workspaceId, id);
      requireVersion(current.contentVersion, dto?.expectedContentVersion);
      requireVersion(
        current.organizationVersion,
        dto?.expectedOrganizationVersion,
      );
      if ((current.deletedAt === null) === restore)
        return this.project(current, await this.now(tx));
      requireVersionCapacity(current.contentVersion);
      requireVersionCapacity(current.organizationVersion);
      if (restore) {
        const count = await tx.$executeRaw`UPDATE "Cocktail" SET
          "deletedAt"=NULL, "restoreUntil"=NULL, "updatedAt"=clock_timestamp() AT TIME ZONE 'UTC',
          "contentVersion"="contentVersion"+1, "organizationVersion"="organizationVersion"+1
          WHERE "id"=${id} AND "workspaceId"=${workspaceId}
          AND "restoreUntil">clock_timestamp()`;
        if (count !== 1)
          throw new ConflictException(
            'The recovery period has expired. No data was erased.',
          );
      } else {
        await tx.$executeRaw`WITH instant AS MATERIALIZED (
          SELECT clock_timestamp()::timestamptz(3) AS value
        ) UPDATE "Cocktail" SET "deletedAt"=instant.value,
          "restoreUntil"=((instant.value AT TIME ZONE 'UTC') + INTERVAL '30 days') AT TIME ZONE 'UTC',
          "contentVersion"="contentVersion"+1, "organizationVersion"="organizationVersion"+1
          , "updatedAt"=instant.value AT TIME ZONE 'UTC'
          FROM instant WHERE "id"=${id} AND "workspaceId"=${workspaceId}`;
      }
      return this.project(
        await this.record(tx, workspaceId, id),
        await this.now(tx),
      );
    });
  }
}
