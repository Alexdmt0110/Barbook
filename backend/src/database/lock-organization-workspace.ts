import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

/** Always acquired before reading organization versions or changing folder links. */
export async function lockOrganizationWorkspace(
  transaction: Prisma.TransactionClient,
  workspaceId: string,
): Promise<void> {
  const rows = await transaction.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Workspace" WHERE "id" = ${workspaceId} FOR NO KEY UPDATE
  `;
  if (rows.length !== 1) {
    throw new InternalServerErrorException(
      'Personal workspace is unavailable.',
    );
  }
}
