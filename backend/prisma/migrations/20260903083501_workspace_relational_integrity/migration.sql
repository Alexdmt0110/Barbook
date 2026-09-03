/*
  Renforce l'isolation relationnelle des workspaces.

  Les ressources d'un cocktail (dossier, alcool principal,
  ingrédients, garnitures et tags) doivent appartenir au même
  workspace que le cocktail.

  Les tables de liaison existent déjà et contiennent des données.
  workspaceId est donc ajouté temporairement comme nullable,
  rétro-rempli depuis Cocktail, contrôlé, puis rendu NOT NULL.
*/

-- Ajouter workspaceId sans casser les lignes existantes.
ALTER TABLE "CocktailIngredient"
  ADD COLUMN "workspaceId" TEXT;

ALTER TABLE "CocktailTag"
  ADD COLUMN "workspaceId" TEXT;

ALTER TABLE "GarnishIngredient"
  ADD COLUMN "workspaceId" TEXT;

-- Le cocktail est la source de vérité du workspace pour
-- toutes les lignes enfant existantes.
UPDATE "CocktailIngredient" AS ci
SET "workspaceId" = c."workspaceId"
  FROM "Cocktail" AS c
WHERE c."id" = ci."cocktailId";

UPDATE "CocktailTag" AS ct
SET "workspaceId" = c."workspaceId"
  FROM "Cocktail" AS c
WHERE c."id" = ct."cocktailId";

UPDATE "GarnishIngredient" AS gi
SET "workspaceId" = c."workspaceId"
  FROM "Cocktail" AS c
WHERE c."id" = gi."cocktailId";

-- Refuser explicitement la migration si une ligne enfant
-- n'a pas pu être rattachée à un cocktail.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CocktailIngredient"
    WHERE "workspaceId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'CocktailIngredient contains rows without a resolvable workspace.';
END IF;

  IF EXISTS (
    SELECT 1
    FROM "CocktailTag"
    WHERE "workspaceId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'CocktailTag contains rows without a resolvable workspace.';
END IF;

  IF EXISTS (
    SELECT 1
    FROM "GarnishIngredient"
    WHERE "workspaceId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'GarnishIngredient contains rows without a resolvable workspace.';
END IF;
END
$$;

-- Vérifier aussi les invariants inter-workspaces avant de
-- créer les contraintes composites.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Cocktail" AS c
    JOIN "Folder" AS f
      ON f."id" = c."folderId"
    WHERE c."folderId" IS NOT NULL
      AND c."workspaceId" <> f."workspaceId"
  ) THEN
    RAISE EXCEPTION
      'Cocktail contains a folder from another workspace.';
END IF;

  IF EXISTS (
    SELECT 1
    FROM "Cocktail" AS c
    JOIN "Ingredient" AS i
      ON i."id" = c."mainAlcoholId"
    WHERE c."mainAlcoholId" IS NOT NULL
      AND c."workspaceId" <> i."workspaceId"
  ) THEN
    RAISE EXCEPTION
      'Cocktail contains a main alcohol from another workspace.';
END IF;

  IF EXISTS (
    SELECT 1
    FROM "CocktailIngredient" AS ci
    JOIN "Ingredient" AS i
      ON i."id" = ci."ingredientId"
    WHERE ci."workspaceId" <> i."workspaceId"
  ) THEN
    RAISE EXCEPTION
      'CocktailIngredient contains an ingredient from another workspace.';
END IF;

  IF EXISTS (
    SELECT 1
    FROM "GarnishIngredient" AS gi
    JOIN "Ingredient" AS i
      ON i."id" = gi."ingredientId"
    WHERE gi."workspaceId" <> i."workspaceId"
  ) THEN
    RAISE EXCEPTION
      'GarnishIngredient contains an ingredient from another workspace.';
END IF;

  IF EXISTS (
    SELECT 1
    FROM "CocktailTag" AS ct
    JOIN "Tag" AS t
      ON t."id" = ct."tagId"
    WHERE ct."workspaceId" <> t."workspaceId"
  ) THEN
    RAISE EXCEPTION
      'CocktailTag contains a tag from another workspace.';
END IF;
END
$$;

-- Les FK composites doivent cibler des couples déclarés uniques.
CREATE UNIQUE INDEX "Cocktail_workspaceId_id_key"
  ON "Cocktail"("workspaceId", "id");

CREATE UNIQUE INDEX "Folder_workspaceId_id_key"
  ON "Folder"("workspaceId", "id");

CREATE UNIQUE INDEX "Ingredient_workspaceId_id_key"
  ON "Ingredient"("workspaceId", "id");

CREATE UNIQUE INDEX "Tag_workspaceId_id_key"
  ON "Tag"("workspaceId", "id");

-- Le backfill étant terminé et contrôlé, workspaceId peut
-- maintenant devenir obligatoire.
ALTER TABLE "CocktailIngredient"
  ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "CocktailTag"
  ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "GarnishIngredient"
  ALTER COLUMN "workspaceId" SET NOT NULL;

-- Ajouter les nouvelles contraintes avant de retirer les
-- anciennes permet de conserver les relations protégées
-- pendant toute la migration.
ALTER TABLE "Cocktail"
  ADD CONSTRAINT "Cocktail_workspaceId_folderId_fkey"
    FOREIGN KEY ("workspaceId", "folderId")
      REFERENCES "Folder"("workspaceId", "id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;

ALTER TABLE "Cocktail"
  ADD CONSTRAINT "Cocktail_workspaceId_mainAlcoholId_fkey"
    FOREIGN KEY ("workspaceId", "mainAlcoholId")
      REFERENCES "Ingredient"("workspaceId", "id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;

ALTER TABLE "CocktailIngredient"
  ADD CONSTRAINT "CocktailIngredient_workspaceId_cocktailId_fkey"
    FOREIGN KEY ("workspaceId", "cocktailId")
      REFERENCES "Cocktail"("workspaceId", "id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;

ALTER TABLE "CocktailIngredient"
  ADD CONSTRAINT "CocktailIngredient_workspaceId_ingredientId_fkey"
    FOREIGN KEY ("workspaceId", "ingredientId")
      REFERENCES "Ingredient"("workspaceId", "id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;

ALTER TABLE "GarnishIngredient"
  ADD CONSTRAINT "GarnishIngredient_workspaceId_cocktailId_fkey"
    FOREIGN KEY ("workspaceId", "cocktailId")
      REFERENCES "Cocktail"("workspaceId", "id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;

ALTER TABLE "GarnishIngredient"
  ADD CONSTRAINT "GarnishIngredient_workspaceId_ingredientId_fkey"
    FOREIGN KEY ("workspaceId", "ingredientId")
      REFERENCES "Ingredient"("workspaceId", "id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;

ALTER TABLE "CocktailTag"
  ADD CONSTRAINT "CocktailTag_workspaceId_cocktailId_fkey"
    FOREIGN KEY ("workspaceId", "cocktailId")
      REFERENCES "Cocktail"("workspaceId", "id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;

ALTER TABLE "CocktailTag"
  ADD CONSTRAINT "CocktailTag_workspaceId_tagId_fkey"
    FOREIGN KEY ("workspaceId", "tagId")
      REFERENCES "Tag"("workspaceId", "id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;

-- Les contraintes composites sont maintenant actives :
-- les anciennes FK simples deviennent redondantes.
ALTER TABLE "Cocktail"
DROP CONSTRAINT "Cocktail_folderId_fkey";

ALTER TABLE "Cocktail"
DROP CONSTRAINT "Cocktail_mainAlcoholId_fkey";

ALTER TABLE "CocktailIngredient"
DROP CONSTRAINT "CocktailIngredient_cocktailId_fkey";

ALTER TABLE "CocktailIngredient"
DROP CONSTRAINT "CocktailIngredient_ingredientId_fkey";

ALTER TABLE "CocktailTag"
DROP CONSTRAINT "CocktailTag_cocktailId_fkey";

ALTER TABLE "CocktailTag"
DROP CONSTRAINT "CocktailTag_tagId_fkey";

ALTER TABLE "GarnishIngredient"
DROP CONSTRAINT "GarnishIngredient_cocktailId_fkey";

ALTER TABLE "GarnishIngredient"
DROP CONSTRAINT "GarnishIngredient_ingredientId_fkey";
