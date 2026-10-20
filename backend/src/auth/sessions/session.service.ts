import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, Session } from '../../generated/prisma/client';
import {
  generateOpaqueToken,
  hashSessionCredential,
  isOpaqueToken,
} from './session-credentials';
import {
  PERSISTENT_SESSION,
  sessionPolicy,
  STANDARD_SESSION,
} from './session-policy';

export type SessionState = Pick<
  Session,
  | 'id'
  | 'userId'
  | 'csrfToken'
  | 'persistent'
  | 'createdAt'
  | 'lastSeenAt'
  | 'idleExpiresAt'
  | 'expiresAt'
>;

export interface IssuedSession {
  /** Internal only: the web boundary must put this in an HttpOnly cookie. */
  credential: string;
  session: SessionState;
}

const sessionFields = Prisma.sql`
  "id", "userId", "csrfToken", "persistent", "createdAt",
  "lastSeenAt", "idleExpiresAt", "expiresAt"
`;

const PRUNE_BATCH_SIZE = 500;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller owns the transaction, including registration's account rows. */
  async create(
    transaction: Prisma.TransactionClient,
    userId: string,
    persistent = false,
  ): Promise<IssuedSession> {
    if (!(await this.lockUser(transaction, userId))) {
      throw new UnauthorizedException('Account is unavailable.');
    }

    const credential = generateOpaqueToken();
    const policy = sessionPolicy(persistent);
    const [session] = await transaction.$queryRaw<SessionState[]>`
      INSERT INTO "Session" (
        "id", "userId", "tokenHash", "csrfToken", "persistent", "createdAt",
        "lastSeenAt", "idleExpiresAt", "expiresAt"
      ) VALUES (
        ${randomUUID()}, ${userId}, ${hashSessionCredential(credential)},
        ${generateOpaqueToken()}, ${persistent}, statement_timestamp(),
        statement_timestamp(),
        statement_timestamp() + ${policy.idleSeconds}::integer * interval '1 second',
        statement_timestamp() + ${policy.absoluteSeconds}::integer * interval '1 second'
      ) RETURNING ${sessionFields}
    `;

    return { credential, session };
  }

  /** Lock before checking deadlines: waiting must never renew an expired row. */
  async authenticate(credential: unknown): Promise<SessionState | null> {
    if (!isOpaqueToken(credential)) return null;

    const [session] = await this.prisma.$queryRaw<SessionState[]>`
      WITH candidate AS MATERIALIZED (
        SELECT "id" AS "candidateId", "revokedAt" AS "candidateRevokedAt",
          "idleExpiresAt" AS "candidateIdleExpiresAt", "expiresAt" AS "candidateExpiresAt"
        FROM "Session" WHERE "tokenHash" = ${hashSessionCredential(credential)}
        FOR UPDATE
      )
      UPDATE "Session" SET
        "lastSeenAt" = LEAST("expiresAt", GREATEST("lastSeenAt", clock_timestamp())),
        "idleExpiresAt" = LEAST("expiresAt", GREATEST(
          "idleExpiresAt", clock_timestamp() + (
            CASE WHEN "persistent" THEN ${PERSISTENT_SESSION.idleSeconds}::integer
            ELSE ${STANDARD_SESSION.idleSeconds}::integer END
          ) * interval '1 second'
        ))
      FROM candidate
      WHERE "Session"."id" = candidate."candidateId"
        AND candidate."candidateRevokedAt" IS NULL
        AND candidate."candidateIdleExpiresAt" > clock_timestamp()
        AND candidate."candidateExpiresAt" > clock_timestamp()
      RETURNING ${sessionFields}
    `;

    return session ?? null;
  }

  /** Idempotent, including expired, unknown or already revoked credentials. */
  async revoke(credential: unknown): Promise<void> {
    if (!isOpaqueToken(credential)) return;

    await this.prisma.$executeRaw`
      UPDATE "Session"
      SET "revokedAt" = GREATEST("createdAt", clock_timestamp())
      WHERE "tokenHash" = ${hashSessionCredential(credential)} AND "revokedAt" IS NULL
    `;
  }

  /** Creation and global revocation serialize on the same user row. */
  async revokeAll(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<number> {
    if (!(await this.lockUser(transaction, userId))) return 0;

    return transaction.$executeRaw`
      UPDATE "Session"
      SET "revokedAt" = GREATEST("createdAt", clock_timestamp())
      WHERE "userId" = ${userId} AND "revokedAt" IS NULL
    `;
  }

  /** Not scheduled automatically; validity never depends on cleanup. */
  async prune(): Promise<number> {
    return this.prisma.$executeRaw`
      DELETE FROM "Session" WHERE "id" IN (
        SELECT "id" FROM "Session"
        WHERE "revokedAt" IS NOT NULL OR "idleExpiresAt" <= clock_timestamp()
          OR "expiresAt" <= clock_timestamp()
        ORDER BY "expiresAt", "id" LIMIT ${PRUNE_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
    `;
  }

  private async lockUser(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<boolean> {
    const rows = await transaction.$queryRaw<
      { id: string; isolation: string }[]
    >`
      SELECT "id", current_setting('transaction_isolation') AS "isolation"
      FROM "User" WHERE "id" = ${userId} FOR NO KEY UPDATE
    `;
    // A repeatable snapshot taken before waiting could miss a committed login.
    if (rows[0] && rows[0].isolation !== 'read committed') {
      throw new InternalServerErrorException(
        'Session transaction configuration is invalid.',
      );
    }
    return rows.length === 1;
  }
}
