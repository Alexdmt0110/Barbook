BEGIN;

-- Additive preparation only: no JWT, user or workspace is converted here.
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "csrfToken" VARCHAR(43) NOT NULL,
    "persistent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL,
    "idleExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_token_hash_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "Session_csrf_token_check" CHECK ("csrfToken" ~ '^[A-Za-z0-9_-]{43}$'),
    CONSTRAINT "Session_timeline_check" CHECK (
        "expiresAt" > "createdAt"
        AND "lastSeenAt" >= "createdAt"
        AND "idleExpiresAt" > "createdAt"
        AND "lastSeenAt" <= "idleExpiresAt"
        AND "idleExpiresAt" <= "expiresAt"
        AND ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")
    )
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "Session_idleExpiresAt_idx" ON "Session"("idleExpiresAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
