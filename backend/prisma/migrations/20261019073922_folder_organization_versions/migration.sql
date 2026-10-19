-- Refuse ambiguous legacy data instead of discarding existing memberships.
BEGIN;

LOCK TABLE "Cocktail", "CocktailFolder", "Folder" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CocktailFolder" AS cf
    JOIN "Cocktail" AS c ON c."id" = cf."cocktailId"
    WHERE cf."workspaceId" <> c."workspaceId"
       OR c."folderId" IS DISTINCT FROM cf."folderId"
  ) THEN
    RAISE EXCEPTION 'Reconcile ambiguous CocktailFolder memberships before switching readers. No memberships were removed.';
  END IF;
END
$$;

INSERT INTO "CocktailFolder" ("workspaceId", "cocktailId", "folderId")
SELECT c."workspaceId", c."id", c."folderId"
FROM "Cocktail" AS c
WHERE c."folderId" IS NOT NULL
ON CONFLICT ("cocktailId", "folderId") DO NOTHING;

ALTER TABLE "Cocktail"
  ADD COLUMN "organizationVersion" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "Cocktail_organizationVersion_nonnegative_check"
    CHECK ("organizationVersion" >= 0);

ALTER TABLE "Folder"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "Folder_version_nonnegative_check"
    CHECK ("version" >= 0);

COMMIT;
