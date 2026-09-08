/*
  Introduit l'appartenance multiple des cocktails aux dossiers.

  Cette migration constitue la phase EXPAND de la transition.

  L'ancienne colonne Cocktail.folderId est volontairement conservée
  pour permettre au backend existant de continuer à fonctionner
  pendant que le code est migré vers CocktailFolder.

  Toutes les appartenances existantes sont copiées avant que la
  nouvelle relation ne soit utilisée par l'application.
*/

BEGIN;

CREATE TABLE "CocktailFolder" (
                                "workspaceId" TEXT NOT NULL,
                                "cocktailId" TEXT NOT NULL,
                                "folderId" TEXT NOT NULL,

                                CONSTRAINT "CocktailFolder_pkey"
                                  PRIMARY KEY ("cocktailId", "folderId")
);

-- Copier l'organisation existante.
INSERT INTO "CocktailFolder" (
  "workspaceId",
  "cocktailId",
  "folderId"
)
SELECT
  "workspaceId",
  "id",
  "folderId"
FROM "Cocktail"
WHERE "folderId" IS NOT NULL;

-- Refuser explicitement la migration si le backfill
-- ne correspond pas exactement à l'ancien modèle.
DO $$
DECLARE
legacy_membership_count BIGINT;
  migrated_membership_count BIGINT;
BEGIN
SELECT COUNT(*)
INTO legacy_membership_count
FROM "Cocktail"
WHERE "folderId" IS NOT NULL;

SELECT COUNT(*)
INTO migrated_membership_count
FROM "CocktailFolder";

IF legacy_membership_count <> migrated_membership_count THEN
    RAISE EXCEPTION
      'CocktailFolder backfill count mismatch: legacy %, migrated %.',
      legacy_membership_count,
      migrated_membership_count;
END IF;

  IF EXISTS (
    SELECT 1
    FROM "Cocktail" AS c
    WHERE c."folderId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "CocktailFolder" AS cf
        WHERE cf."workspaceId" = c."workspaceId"
          AND cf."cocktailId" = c."id"
          AND cf."folderId" = c."folderId"
      )
  ) THEN
    RAISE EXCEPTION
      'CocktailFolder backfill is missing one or more legacy memberships.';
END IF;
END
$$;

-- Les consultations d'un dossier recherchent principalement
-- ses relations à l'intérieur de son workspace.
CREATE INDEX "CocktailFolder_workspaceId_folderId_idx"
  ON "CocktailFolder"("workspaceId", "folderId");

-- Garantir au niveau PostgreSQL qu'aucune relation
-- ne peut traverser les frontières d'un workspace.
ALTER TABLE "CocktailFolder"
  ADD CONSTRAINT "CocktailFolder_workspaceId_cocktailId_fkey"
    FOREIGN KEY ("workspaceId", "cocktailId")
      REFERENCES "Cocktail"("workspaceId", "id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;

ALTER TABLE "CocktailFolder"
  ADD CONSTRAINT "CocktailFolder_workspaceId_folderId_fkey"
    FOREIGN KEY ("workspaceId", "folderId")
      REFERENCES "Folder"("workspaceId", "id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;

COMMIT;
