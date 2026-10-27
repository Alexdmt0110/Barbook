import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { requireVersionCapacity } from '../cocktails/organization/organization-preconditions';
import { WorkspaceAccessService } from './workspace-access.service';
import {
  AddWorkspaceMemberDto,
  BrowseWorkspacesDto,
  BrowseWorkspaceCatalogDto,
  WorkspaceVersionDto,
} from './workspace.dto';

@Injectable()
export class WorkspaceMembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async list(userId: string, query: BrowseWorkspaceCatalogDto) {
    const where: Prisma.WorkspaceWhereInput = {
      ...(query.kind ? { kind: query.kind } : {}),
      OR: [
        { kind: 'PERSONAL', personalOwnerId: userId },
        { kind: 'SHARED', members: { some: { userId, revokedAt: null } } },
      ],
    };
    return this.prisma.$transaction(
      async (tx) => ({
        items: await tx.workspace.findMany({
          where,
          select: { id: true, name: true, kind: true, accessVersion: true },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        total: await tx.workspace.count({ where }),
        page: query.page,
        pageSize: query.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }

  context(userId: string, workspaceId: string) {
    return this.access.shared(userId, workspaceId, (_tx, context) =>
      Promise.resolve(context),
    );
  }

  members(userId: string, workspaceId: string, query: BrowseWorkspacesDto) {
    return this.access.shared(userId, workspaceId, async (tx, context) => {
      if (context.role !== 'OWNER')
        throw new NotFoundException('Workspace unavailable.');
      const where = { workspaceId, revokedAt: null };
      return {
        accessVersion: context.accessVersion,
        items: await tx.workspaceMember.findMany({
          where,
          select: {
            userId: true,
            role: true,
            joinedAt: true,
            user: { select: { email: true, displayName: true } },
          },
          orderBy: { userId: 'asc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        total: await tx.workspaceMember.count({ where }),
        page: query.page,
        pageSize: query.pageSize,
      };
    });
  }

  add(userId: string, workspaceId: string, dto: AddWorkspaceMemberDto) {
    return this.access.shared(
      userId,
      workspaceId,
      async (tx, context) => {
        const target = await tx.user.findUnique({
          where: { email: dto.email },
          select: { id: true },
        });
        if (!target)
          throw new NotFoundException('Registered account unavailable.');
        const key = { workspaceId, userId: target.id };
        const current = await tx.workspaceMember.findUnique({
          where: { workspaceId_userId: key },
        });
        if (current?.role === 'OWNER')
          throw new ConflictException('Owner changes are not supported.');
        if (current && !current.revokedAt)
          return { accessVersion: context.accessVersion, userId: target.id };
        requireVersionCapacity(context.accessVersion);
        await tx.workspaceMember.upsert({
          where: { workspaceId_userId: key },
          create: { ...key, role: 'MEMBER' },
          update: { revokedAt: null, joinedAt: new Date(), role: 'MEMBER' },
        });
        await tx.workspace.update({
          where: { id: workspaceId },
          data: { accessVersion: { increment: 1 } },
        });
        return { accessVersion: context.accessVersion + 1, userId: target.id };
      },
      { ...dto, ownerOnly: true },
    );
  }

  revoke(
    userId: string,
    workspaceId: string,
    targetId: string,
    dto: WorkspaceVersionDto,
  ) {
    return this.access.shared(
      userId,
      workspaceId,
      async (tx, context) => {
        const key = { workspaceId, userId: targetId };
        const current = await tx.workspaceMember.findUnique({
          where: { workspaceId_userId: key },
        });
        if (!current) throw new NotFoundException('Membership unavailable.');
        if (current.role === 'OWNER')
          throw new ConflictException('Owner changes are not supported.');
        if (current.revokedAt)
          return { accessVersion: context.accessVersion, userId: targetId };
        requireVersionCapacity(context.accessVersion);
        await tx.workspaceMember.update({
          where: { workspaceId_userId: key },
          data: { revokedAt: new Date() },
        });
        await tx.workspace.update({
          where: { id: workspaceId },
          data: { accessVersion: { increment: 1 } },
        });
        return { accessVersion: context.accessVersion + 1, userId: targetId };
      },
      { ...dto, ownerOnly: true },
    );
  }
}
