import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, WorkspaceRole } from '../generated/prisma/client';
import { requireVersion } from '../cocktails/organization/organization-preconditions';

export interface SharedWorkspaceContext {
  id: string;
  name: string;
  accessVersion: number;
  role: WorkspaceRole;
}

/** Membership and business work share the same lock/transaction as revocation. */
@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async shared<T>(
    userId: string,
    workspaceId: string,
    operation: (
      tx: Prisma.TransactionClient,
      context: SharedWorkspaceContext,
    ) => Promise<T>,
    command?: { expectedAccessVersion?: number | null; ownerOnly?: boolean },
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Workspace" WHERE "id"=${workspaceId} AND "kind"='SHARED' FOR NO KEY UPDATE
      `;
      if (!rows.length) throw new NotFoundException('Workspace unavailable.');
      const member = await tx.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        include: { workspace: true },
      });
      if (
        !member ||
        member.revokedAt ||
        (command?.ownerOnly && member.role !== 'OWNER')
      )
        throw new NotFoundException('Workspace unavailable.');
      if (command)
        requireVersion(
          member.workspace.accessVersion,
          command.expectedAccessVersion,
        );
      return operation(tx, {
        id: workspaceId,
        name: member.workspace.name,
        accessVersion: member.workspace.accessVersion,
        role: member.role,
      });
    });
  }
}
