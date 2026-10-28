BEGIN;
CREATE TYPE "BarAccent" AS ENUM ('AMBER','RED','TEAL','BLUE');
ALTER TABLE "Workspace"
  ADD COLUMN "accentKey" "BarAccent",
  ADD COLUMN "creationActorId" TEXT,
  ADD COLUMN "creationRequestId" UUID,
  ADD COLUMN "creationFingerprint" CHAR(64),
  ADD CONSTRAINT "Workspace_creationActorId_fkey" FOREIGN KEY ("creationActorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Workspace_accent_scope_check" CHECK ("accentKey" IS NULL OR "kind"='SHARED'),
  ADD CONSTRAINT "Workspace_creation_intent_check" CHECK (
    ("creationActorId" IS NULL AND "creationRequestId" IS NULL AND "creationFingerprint" IS NULL)
    OR ("kind"='SHARED' AND "personalOwnerId" IS NULL AND "creationActorId" IS NOT NULL AND "creationRequestId" IS NOT NULL AND "creationFingerprint" IS NOT NULL AND "creationFingerprint" ~ '^[0-9a-f]{64}$')
  );
CREATE UNIQUE INDEX "Workspace_creationActorId_creationRequestId_key" ON "Workspace"("creationActorId","creationRequestId");
COMMIT;
