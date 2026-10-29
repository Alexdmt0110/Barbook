BEGIN;
CREATE TYPE "StockMovementKind" AS ENUM ('INITIAL','ADD','REMOVE','SET');
CREATE TABLE "StockProduct" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "name" VARCHAR(80) NOT NULL, "packaging" VARCHAR(120) NOT NULL,
  "quantity" INTEGER NOT NULL, "threshold" INTEGER NOT NULL, "target" INTEGER NOT NULL, "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "StockProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockProduct_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockProduct_values_check" CHECK ("quantity">=0 AND "threshold">=0 AND "target">=0 AND "version">=0),
  CONSTRAINT "StockProduct_labels_check" CHECK (length(trim("name"))>0 AND length(trim("packaging"))>0)
);
CREATE UNIQUE INDEX "StockProduct_workspaceId_id_key" ON "StockProduct"("workspaceId","id");
CREATE INDEX "StockProduct_workspaceId_name_id_idx" ON "StockProduct"("workspaceId","name","id");
CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "productId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "requestId" UUID NOT NULL, "fingerprint" CHAR(64) NOT NULL, "kind" "StockMovementKind" NOT NULL,
  "beforeQuantity" INTEGER NOT NULL, "afterQuantity" INTEGER NOT NULL, "delta" INTEGER NOT NULL,
  "reason" VARCHAR(240) NOT NULL, "productVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockMovement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_workspaceId_productId_fkey" FOREIGN KEY ("workspaceId","productId") REFERENCES "StockProduct"("workspaceId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_values_check" CHECK ("beforeQuantity">=0 AND "afterQuantity">=0 AND "productVersion">=0 AND "delta"::BIGINT="afterQuantity"::BIGINT-"beforeQuantity"::BIGINT),
  CONSTRAINT "StockMovement_identity_check" CHECK ("fingerprint" ~ '^[0-9a-f]{64}$' AND length(trim("reason"))>0),
  CONSTRAINT "StockMovement_kind_check" CHECK (
    ("kind"='INITIAL' AND "beforeQuantity"=0 AND "productVersion"=0)
    OR ("kind"='ADD' AND "delta">0 AND "productVersion">0)
    OR ("kind"='REMOVE' AND "delta"<0 AND "productVersion">0)
    OR ("kind"='SET' AND "delta"<>0 AND "productVersion">0)
  )
);
CREATE UNIQUE INDEX "StockMovement_actorId_requestId_key" ON "StockMovement"("actorId","requestId");
CREATE UNIQUE INDEX "StockMovement_productId_productVersion_key" ON "StockMovement"("productId","productVersion");
CREATE INDEX "StockMovement_workspaceId_productId_productVersion_idx" ON "StockMovement"("workspaceId","productId","productVersion");
COMMIT;
