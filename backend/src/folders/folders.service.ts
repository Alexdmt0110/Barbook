import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaKnownRequestError } from '../common/prisma-errors';
import { lockOrganizationWorkspace } from '../database/lock-organization-workspace';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateFolderDto } from './dto/create-folder.dto';
import { BrowseFoldersDto, RenameFolderDto } from './dto/folder-commands.dto';
import { FolderDetail, FolderPage, FolderReference } from './folder.types';

const detailSelect = {
  id: true,
  name: true,
  version: true,
  _count: { select: { memberships: true } },
} satisfies Prisma.FolderSelect;
function toDetail(folder: {
  id: string;
  name: string;
  version: number;
  _count: { memberships: number };
}): FolderDetail {
  const { _count, ...metadata } = folder;
  return { ...metadata, cocktailCount: _count.memberships };
}

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async listPersonalFolders(userId: string): Promise<FolderReference[]> {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.folder.findMany({
      where: { workspaceId },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    });
  }

  async createPersonalFolder(
    userId: string,
    dto: CreateFolderDto,
  ): Promise<FolderReference> {
    const workspaceId = await this.workspaceId(userId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockOrganizationWorkspace(tx, workspaceId);
        return tx.folder.create({
          data: { workspaceId, name: dto.name.trim() },
          select: { id: true, name: true },
        });
      });
    } catch (error: unknown) {
      return this.rethrowNameConflict(error);
    }
  }

  async browse(userId: string, query: BrowseFoldersDto): Promise<FolderPage> {
    const workspaceId = await this.workspaceId(userId);
    const where: Prisma.FolderWhereInput = {
      workspaceId,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction(
      [
        this.prisma.folder.count({ where }),
        this.prisma.folder.findMany({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: detailSelect,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      items: rows.map(toDetail),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
  }

  async detail(userId: string, folderId: string): Promise<FolderDetail> {
    const workspaceId = await this.workspaceId(userId);
    return toDetail(
      await this.requireFolder(this.prisma, workspaceId, folderId),
    );
  }

  async rename(
    userId: string,
    folderId: string,
    dto: RenameFolderDto,
  ): Promise<FolderDetail> {
    const workspaceId = await this.workspaceId(userId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockOrganizationWorkspace(tx, workspaceId);
        const folder = await this.requireFolder(tx, workspaceId, folderId);
        this.checkVersion(folder.version, dto.expectedVersion);
        return toDetail(
          await tx.folder.update({
            where: { workspaceId_id: { workspaceId, id: folderId } },
            data: { name: dto.name.trim(), version: { increment: 1 } },
            select: detailSelect,
          }),
        );
      });
    } catch (error: unknown) {
      return this.rethrowNameConflict(error);
    }
  }

  async remove(
    userId: string,
    folderId: string,
    expectedVersion: number,
  ): Promise<{ deleted: true }> {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.$transaction(async (tx) => {
      await lockOrganizationWorkspace(tx, workspaceId);
      const folder = await this.requireFolder(tx, workspaceId, folderId);
      this.checkVersion(folder.version, expectedVersion);
      // Repair the legacy representative before its Restrict FK is evaluated.
      // One grouped update; only affected recipes get a new organization version.
      await tx.$executeRaw`
        UPDATE "Cocktail" c SET
          "folderId" = CASE WHEN c."folderId" = ${folderId} THEN (
            SELECT cf."folderId" FROM "CocktailFolder" cf
            WHERE cf."workspaceId" = ${workspaceId} AND cf."cocktailId" = c."id"
              AND cf."folderId" <> ${folderId}
            ORDER BY cf."folderId" LIMIT 1
          ) ELSE c."folderId" END,
          "organizationVersion" = c."organizationVersion" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE c."workspaceId" = ${workspaceId} AND EXISTS (
          SELECT 1 FROM "CocktailFolder" cf WHERE cf."workspaceId" = ${workspaceId}
            AND cf."cocktailId" = c."id" AND cf."folderId" = ${folderId}
        )
      `;
      await tx.folder.delete({
        where: { workspaceId_id: { workspaceId, id: folderId } },
      });
      return { deleted: true };
    });
  }

  async addCocktails(
    userId: string,
    folderId: string,
    cocktailIds: readonly string[],
  ): Promise<{ added: number }> {
    const workspaceId = await this.workspaceId(userId);
    const ids = [...new Set(cocktailIds.map((id) => id.toLowerCase()))];
    return this.prisma.$transaction(async (tx) => {
      await lockOrganizationWorkspace(tx, workspaceId);
      await this.requireFolder(tx, workspaceId, folderId);
      const cocktails = await tx.cocktail.findMany({
        where: { workspaceId, id: { in: ids } },
        select: { id: true },
      });
      if (cocktails.length !== ids.length)
        throw new NotFoundException('Cocktail not found.');
      const existing = await tx.cocktailFolder.findMany({
        where: { workspaceId, folderId, cocktailId: { in: ids } },
        select: { cocktailId: true },
      });
      const linked = new Set(existing.map((row) => row.cocktailId));
      const added = ids.filter((id) => !linked.has(id));
      if (added.length > 0) {
        await tx.cocktailFolder.createMany({
          data: added.map((cocktailId) => ({
            workspaceId,
            folderId,
            cocktailId,
          })),
        });
        await tx.cocktail.updateMany({
          where: { workspaceId, id: { in: added } },
          data: { organizationVersion: { increment: 1 } },
        });
        await tx.cocktail.updateMany({
          where: { workspaceId, id: { in: added }, folderId: null },
          data: { folderId },
        });
      }
      return { added: added.length };
    });
  }

  async removeCocktail(
    userId: string,
    folderId: string,
    cocktailId: string,
  ): Promise<{ removed: number }> {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.$transaction(async (tx) => {
      await lockOrganizationWorkspace(tx, workspaceId);
      await this.requireFolder(tx, workspaceId, folderId);
      const cocktail = await tx.cocktail.findUnique({
        where: { workspaceId_id: { workspaceId, id: cocktailId } },
        select: { id: true, folderId: true },
      });
      if (!cocktail) throw new NotFoundException('Cocktail not found.');
      const result = await tx.cocktailFolder.deleteMany({
        where: { workspaceId, folderId, cocktailId },
      });
      if (result.count > 0) {
        const remaining =
          cocktail.folderId === folderId
            ? await tx.cocktailFolder.findFirst({
                where: { workspaceId, cocktailId },
                orderBy: { folderId: 'asc' },
                select: { folderId: true },
              })
            : null;
        await tx.cocktail.update({
          where: { workspaceId_id: { workspaceId, id: cocktailId } },
          data: {
            organizationVersion: { increment: 1 },
            ...(cocktail.folderId === folderId
              ? { folderId: remaining?.folderId ?? null }
              : {}),
          },
        });
      }
      return { removed: result.count };
    });
  }

  private async workspaceId(userId: string): Promise<string> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { personalOwnerId: userId },
      select: { id: true },
    });
    if (!workspace)
      throw new InternalServerErrorException(
        'Personal workspace is unavailable.',
      );
    return workspace.id;
  }

  private async requireFolder(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    folderId: string,
  ) {
    const folder = await tx.folder.findUnique({
      where: { workspaceId_id: { workspaceId, id: folderId } },
      select: detailSelect,
    });
    if (!folder) throw new NotFoundException('Folder not found.');
    return folder;
  }

  private checkVersion(actual: number, expected: number): void {
    if (actual !== expected)
      throw new ConflictException(
        'Folder has changed. Reload it before continuing.',
      );
  }

  private rethrowNameConflict(error: unknown): never {
    if (isPrismaKnownRequestError(error, 'P2002'))
      throw new ConflictException('A folder with this name already exists.');
    throw error;
  }
}
