import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { isPrismaKnownRequestError } from '../common/prisma-errors';
import { CreateBarDto } from './workspace.dto';
import { WorkspaceAccessService } from './workspace-access.service';

@Injectable()
export class WorkspaceCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async create(userId: string, dto: CreateBarDto) {
    const creationRequestId = dto.creationRequestId.toLowerCase();
    const fingerprint = createHash('sha256')
      .update(JSON.stringify([dto.name, dto.accentKey]))
      .digest('hex');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const actor = await tx.$queryRaw<
          { id: string }[]
        >`SELECT "id" FROM "User" WHERE "id"=${userId} FOR NO KEY UPDATE`;
        if (!actor.length) throw new NotFoundException('Account unavailable.');
        const existing = await tx.workspace.findUnique({
          where: {
            creationActorId_creationRequestId: {
              creationActorId: userId,
              creationRequestId,
            },
          },
        });
        if (existing)
          return this.access.inTransaction(
            tx,
            userId,
            existing.id,
            (_tx, context) => {
              if (existing.creationFingerprint !== fingerprint)
                throw new ConflictException(
                  'This creation intent already has a different payload.',
                );
              return Promise.resolve({ ...context, kind: 'SHARED' as const });
            },
          );
        const workspace = await tx.workspace.create({
          data: {
            name: dto.name,
            kind: 'SHARED',
            accentKey: dto.accentKey,
            creationActorId: userId,
            creationRequestId,
            creationFingerprint: fingerprint,
            members: { create: { userId, role: 'OWNER' } },
          },
          select: {
            id: true,
            name: true,
            accentKey: true,
            accessVersion: true,
          },
        });
        return {
          ...workspace,
          kind: 'SHARED' as const,
          role: 'OWNER' as const,
        };
      });
    } catch (error: unknown) {
      if (isPrismaKnownRequestError(error, 'P2002'))
        throw new ConflictException(
          'Creation changed concurrently. Inspect the creation result before another action.',
        );
      throw error;
    }
  }

  receipt(userId: string, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.findUnique({
        where: {
          creationActorId_creationRequestId: {
            creationActorId: userId,
            creationRequestId: requestId.toLowerCase(),
          },
        },
        select: { id: true },
      });
      if (!workspace) throw new NotFoundException('Creation unavailable.');
      return this.access.inTransaction(
        tx,
        userId,
        workspace.id,
        (_tx, context) =>
          Promise.resolve({ ...context, kind: 'SHARED' as const }),
      );
    });
  }
}
