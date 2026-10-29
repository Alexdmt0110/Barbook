import { isPrismaKnownRequestError } from '../common/prisma-errors';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import {
  requireVersion,
  requireVersionCapacity,
} from '../common/version-preconditions';
import {
  BrowseInventoryDto,
  CreateStockMovementDto,
  CreateStockProductDto,
  UpdateStockSettingsDto,
} from './inventory.dto';
const fingerprint = (values: readonly unknown[]) =>
  createHash('sha256').update(JSON.stringify(values)).digest('hex');

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  list(
    userId: string,
    workspaceId: string,
    query: BrowseInventoryDto,
    reorder = false,
  ) {
    return this.access.shared(userId, workspaceId, async (tx, context) => {
      const where: Prisma.StockProductWhereInput = {
        workspaceId,
        ...(reorder
          ? { quantity: { lte: this.prisma.stockProduct.fields.threshold } }
          : {}),
      };
      const rows = await tx.stockProduct.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      return {
        items: rows.map((row) => ({
          ...row,
          suggestedQuantity:
            row.quantity <= row.threshold
              ? Math.max(0, row.target - row.quantity)
              : null,
        })),
        total: await tx.stockProduct.count({ where }),
        page: query.page,
        pageSize: query.pageSize,
        accessVersion: context.accessVersion,
      };
    });
  }

  detail(userId: string, workspaceId: string, productId: string) {
    return this.access.shared(userId, workspaceId, async (tx, context) => ({
      ...(await this.product(tx, workspaceId, productId)),
      accessVersion: context.accessVersion,
    }));
  }

  history(
    userId: string,
    workspaceId: string,
    productId: string,
    query: BrowseInventoryDto,
  ) {
    return this.access.shared(userId, workspaceId, async (tx) => {
      const product = await this.product(tx, workspaceId, productId);
      const where = { workspaceId, productId };
      return {
        snapshotVersion: product.version,
        items: await tx.stockMovement.findMany({
          where,
          select: {
            id: true,
            kind: true,
            beforeQuantity: true,
            afterQuantity: true,
            delta: true,
            reason: true,
            productVersion: true,
            createdAt: true,
            actor: { select: { id: true, displayName: true } },
          },
          orderBy: { productVersion: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        total: await tx.stockMovement.count({ where }),
        page: query.page,
        pageSize: query.pageSize,
      };
    });
  }

  receipt(userId: string, workspaceId: string, requestId: string) {
    return this.access.shared(userId, workspaceId, async (tx) => {
      const receipt = await tx.stockMovement.findUnique({
        where: {
          actorId_requestId: {
            actorId: userId,
            requestId: requestId.toLowerCase(),
          },
        },
      });
      if (!receipt || receipt.workspaceId !== workspaceId)
        throw new NotFoundException('Inventory receipt unavailable.');
      return {
        receipt: this.publicReceipt(receipt),
        product: await this.product(tx, workspaceId, receipt.productId),
      };
    });
  }

  create(userId: string, workspaceId: string, dto: CreateStockProductDto) {
    const key = dto.requestId.toLowerCase();
    const hash = fingerprint([
      'INITIAL',
      workspaceId,
      dto.name,
      dto.packaging,
      dto.initialQuantity,
      dto.threshold,
      dto.target,
      dto.expectedAccessVersion,
    ]);
    return this.access
      .shared(
        userId,
        workspaceId,
        async (tx) => {
          const prior = await this.prior(tx, userId, workspaceId, key, hash);
          if (prior) return prior;
          const product = await tx.stockProduct.create({
            data: {
              workspaceId,
              name: dto.name,
              packaging: dto.packaging,
              quantity: dto.initialQuantity,
              threshold: dto.threshold,
              target: dto.target,
            },
          });
          const receipt = await tx.stockMovement.create({
            data: {
              workspaceId,
              productId: product.id,
              actorId: userId,
              requestId: key,
              fingerprint: hash,
              kind: 'INITIAL',
              beforeQuantity: 0,
              afterQuantity: dto.initialQuantity,
              delta: dto.initialQuantity,
              reason: 'Comptage initial',
              productVersion: 0,
              createdAt: new Date(),
            },
          });
          return { product, receipt: this.publicReceipt(receipt) };
        },
        { expectedAccessVersion: dto.expectedAccessVersion, ownerOnly: true },
      )
      .catch(intentConflict);
  }

  settings(
    userId: string,
    workspaceId: string,
    productId: string,
    dto: UpdateStockSettingsDto,
  ) {
    return this.access.shared(
      userId,
      workspaceId,
      async (tx) => {
        const product = await this.product(tx, workspaceId, productId);
        requireVersion(product.version, dto.expectedProductVersion);
        if (
          product.threshold === dto.threshold &&
          product.target === dto.target
        )
          return product;
        requireVersionCapacity(product.version);
        return tx.stockProduct.update({
          where: { id: product.id },
          data: {
            threshold: dto.threshold,
            target: dto.target,
            version: { increment: 1 },
          },
        });
      },
      { expectedAccessVersion: dto.expectedAccessVersion, ownerOnly: true },
    );
  }

  move(
    userId: string,
    workspaceId: string,
    productId: string,
    dto: CreateStockMovementDto,
  ) {
    const key = dto.requestId.toLowerCase();
    const hash = fingerprint([
      'MOVEMENT',
      workspaceId,
      productId,
      dto.kind,
      dto.amount,
      dto.reason,
      dto.expectedProductVersion,
      dto.expectedAccessVersion,
    ]);
    return this.access
      .shared(
        userId,
        workspaceId,
        async (tx) => {
          const product = await this.product(tx, workspaceId, productId);
          const prior = await this.prior(tx, userId, workspaceId, key, hash);
          if (prior) return prior;
          requireVersion(product.version, dto.expectedProductVersion);
          const after =
            dto.kind === 'SET'
              ? dto.amount
              : product.quantity +
                (dto.kind === 'ADD' ? dto.amount : -dto.amount);
          if (
            (dto.kind !== 'SET' && dto.amount === 0) ||
            after === product.quantity
          )
            throw new BadRequestException(
              'An explicit stock change is required.',
            );
          if (after < 0 || after > 2147483647)
            throw new BadRequestException(
              'Stock must stay within non-negative whole-unit capacity.',
            );
          requireVersionCapacity(product.version);
          const updated = await tx.stockProduct.update({
            where: { id: product.id },
            data: { quantity: after, version: { increment: 1 } },
          });
          const receipt = await tx.stockMovement.create({
            data: {
              workspaceId,
              productId,
              actorId: userId,
              requestId: key,
              fingerprint: hash,
              kind: dto.kind,
              beforeQuantity: product.quantity,
              afterQuantity: after,
              delta: after - product.quantity,
              reason: dto.reason,
              productVersion: updated.version,
              createdAt: new Date(),
            },
          });
          return { product: updated, receipt: this.publicReceipt(receipt) };
        },
        { expectedAccessVersion: dto.expectedAccessVersion },
      )
      .catch(intentConflict);
  }

  private async product(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    productId: string,
  ) {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "StockProduct" WHERE "workspaceId"=${workspaceId} AND "id"=${productId} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Stock product unavailable.');
    return tx.stockProduct.findUniqueOrThrow({ where: { id: productId } });
  }
  private async prior(
    tx: Prisma.TransactionClient,
    userId: string,
    workspaceId: string,
    key: string,
    hash: string,
  ) {
    const prior = await tx.stockMovement.findUnique({
      where: { actorId_requestId: { actorId: userId, requestId: key } },
    });
    if (!prior) return null;
    if (prior.workspaceId !== workspaceId || prior.fingerprint !== hash)
      throw new ConflictException(
        'This stock intention has already been used with a different payload.',
      );
    return {
      product: await this.product(tx, workspaceId, prior.productId),
      receipt: this.publicReceipt(prior),
    };
  }
  private publicReceipt(receipt: {
    id: string;
    requestId: string;
    productId: string;
    kind: string;
    beforeQuantity: number;
    afterQuantity: number;
    delta: number;
    reason: string;
    productVersion: number;
    createdAt: Date;
  }) {
    const {
      id,
      requestId,
      productId,
      kind,
      beforeQuantity,
      afterQuantity,
      delta,
      reason,
      productVersion,
      createdAt,
    } = receipt;
    return {
      id,
      requestId,
      productId,
      kind,
      beforeQuantity,
      afterQuantity,
      delta,
      reason,
      productVersion,
      createdAt,
    };
  }
}

function intentConflict(error: unknown): never {
  if (isPrismaKnownRequestError(error, 'P2002'))
    throw new ConflictException(
      'This stock intention changed concurrently. Inspect its receipt before another action.',
    );
  throw error;
}
