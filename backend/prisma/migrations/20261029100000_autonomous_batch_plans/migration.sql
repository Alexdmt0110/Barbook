BEGIN;
CREATE TABLE "BatchPlan" (
 "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "sourceCocktailId" TEXT NOT NULL,
 "sourceContentVersion" INTEGER NOT NULL, "creatorId" TEXT NOT NULL,
 "creationRequestId" UUID NOT NULL, "creationFingerprint" CHAR(64) NOT NULL,
 "name" VARCHAR(120) NOT NULL, "snapshot" JSONB NOT NULL, "parameters" JSONB NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "BatchPlan_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "BatchPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "BatchPlan_workspaceId_sourceCocktailId_fkey" FOREIGN KEY ("workspaceId","sourceCocktailId") REFERENCES "Cocktail"("workspaceId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "BatchPlan_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "BatchPlan_values_check" CHECK ("sourceContentVersion">=0 AND "version">=0 AND length(trim("name"))>0 AND "creationFingerprint" ~ '^[0-9a-f]{64}$'),
 CONSTRAINT "BatchPlan_snapshot_check" CHECK (jsonb_typeof("snapshot")='object' AND COALESCE("snapshot"->>'schemaVersion'='1',FALSE) AND "snapshot" ? 'recipe'),
 CONSTRAINT "BatchPlan_parameters_check" CHECK (jsonb_typeof("parameters")='object' AND "parameters" ? 'mode' AND "parameters" ? 'target' AND "parameters" ? 'includedPositions' AND "parameters" ? 'rounding')
);
CREATE UNIQUE INDEX "BatchPlan_creatorId_creationRequestId_key" ON "BatchPlan"("creatorId","creationRequestId");
CREATE INDEX "BatchPlan_workspaceId_updatedAt_id_idx" ON "BatchPlan"("workspaceId","updatedAt","id");
COMMIT;
