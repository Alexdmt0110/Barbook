import { Prisma } from '../generated/prisma/client';

/**
 * Vérifie qu'une erreur provient de Prisma
 * et correspond au code demandé.
 */
export function isPrismaKnownRequestError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
