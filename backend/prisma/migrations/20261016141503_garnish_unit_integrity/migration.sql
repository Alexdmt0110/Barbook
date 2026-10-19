-- Enforce the existing API invariant without repairing or deleting historical data.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "GarnishIngredient" WHERE "unit" = 'TOP_UP') THEN
    RAISE EXCEPTION 'Reconcile historical TOP_UP garnishes before adding the constraint. No rows were modified.';
  END IF;
END
$$;

ALTER TABLE "GarnishIngredient"
  ADD CONSTRAINT "GarnishIngredient_unit_not_top_up_check"
  CHECK ("unit" IS NULL OR "unit" <> 'TOP_UP');

COMMIT;
