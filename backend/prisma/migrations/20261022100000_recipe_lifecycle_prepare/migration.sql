-- Additive preparation only: no public writer activates these states in B5a.
BEGIN;

ALTER TABLE "Cocktail"
  ADD COLUMN "contentVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deletedAt" TIMESTAMPTZ(3),
  ADD COLUMN "restoreUntil" TIMESTAMPTZ(3),
  ADD CONSTRAINT "Cocktail_contentVersion_nonnegative_check"
    CHECK ("contentVersion" >= 0),
  ADD CONSTRAINT "Cocktail_restore_window_check" CHECK (
    ("deletedAt" IS NULL AND "restoreUntil" IS NULL)
    OR (
      "deletedAt" IS NOT NULL AND "restoreUntil" IS NOT NULL
      AND isfinite("deletedAt") AND isfinite("restoreUntil")
      AND "restoreUntil" = (
        ("deletedAt" AT TIME ZONE 'UTC') + INTERVAL '30 days'
      ) AT TIME ZONE 'UTC'
    )
  );

CREATE INDEX "Cocktail_workspaceId_deletedAt_idx"
  ON "Cocktail"("workspaceId", "deletedAt");

ALTER TABLE "CocktailIngredient"
  ADD COLUMN "abvUnknown" BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT "CocktailIngredient_abv_state_check"
    CHECK (NOT "abvUnknown" OR "abvOverride" IS NULL);

COMMIT;
