BEGIN;
ALTER TABLE "Workspace" ADD COLUMN "accessVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_accessVersion_nonnegative" CHECK ("accessVersion" >= 0);
ALTER TABLE "WorkspaceMember" ADD COLUMN "revokedAt" TIMESTAMPTZ(3);
COMMIT;
