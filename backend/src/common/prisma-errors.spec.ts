import { Prisma } from '../generated/prisma/client';
import { isPrismaKnownRequestError } from './prisma-errors';

function createKnownRequestError(
  code: string,
): Prisma.PrismaClientKnownRequestError {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError;

  Object.defineProperty(error, 'code', {
    configurable: false,
    enumerable: true,
    value: code,
    writable: false,
  });

  return error;
}

describe('isPrismaKnownRequestError', () => {
  it('recognizes a Prisma known request error with the expected code', () => {
    const error = createKnownRequestError('P2002');

    expect(isPrismaKnownRequestError(error, 'P2002')).toBe(true);
  });

  it('rejects a Prisma known request error with another code', () => {
    const error = createKnownRequestError('P2003');

    expect(isPrismaKnownRequestError(error, 'P2002')).toBe(false);
  });

  it('rejects an unrelated error', () => {
    expect(
      isPrismaKnownRequestError(new Error('Database failure.'), 'P2002'),
    ).toBe(false);
  });

  it('rejects a plain object that only exposes a Prisma-like code', () => {
    const error = {
      code: 'P2002',
    };

    expect(isPrismaKnownRequestError(error, 'P2002')).toBe(false);
  });
});
