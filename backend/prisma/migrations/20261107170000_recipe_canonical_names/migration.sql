BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF current_setting('server_encoding') <> 'UTF8' THEN
    RAISE EXCEPTION 'Recipe name migration requires UTF8; no data was changed.';
  END IF;
END $$;

-- Same equivalence as toSlug: no locale-dependent case folding or unaccent extension.
CREATE FUNCTION barbook_recipe_name_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $function$
  SELECT btrim(regexp_replace(
    translate(regexp_replace(normalize(value, NFD) COLLATE "C", U&'[\0300-\036f]', '', 'g'),
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') COLLATE "C",
    '[^a-z0-9]+', '-', 'g'), '-');
$function$;

-- Prevent an old writer from creating a collision between inspection and index creation.
LOCK TABLE "Cocktail" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Cocktail" WHERE barbook_recipe_name_key(name) = '') THEN
    RAISE EXCEPTION 'Empty canonical recipe name: explicit data review required; no data was changed.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Cocktail"
    GROUP BY "workspaceId", barbook_recipe_name_key(name) COLLATE "C" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Canonical recipe name collisions: explicit data review required; no data was changed.';
  END IF;
END $$;

ALTER TABLE "Cocktail" ADD COLUMN "nameKey" text COLLATE "C" NOT NULL DEFAULT '';
UPDATE "Cocktail" SET "nameKey" = barbook_recipe_name_key(name);

-- Old clients omit nameKey; even a client supplying a false key cannot bypass uniqueness.
CREATE FUNCTION barbook_set_recipe_name_key() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $function$
BEGIN
  NEW."nameKey" := barbook_recipe_name_key(NEW.name);
  RETURN NEW;
END;
$function$;
CREATE TRIGGER "Cocktail_nameKey_derive" BEFORE INSERT OR UPDATE ON "Cocktail"
FOR EACH ROW EXECUTE FUNCTION barbook_set_recipe_name_key();
ALTER TABLE "Cocktail" ADD CONSTRAINT "Cocktail_nameKey_consistent"
  CHECK ("nameKey" <> '' AND "nameKey" = barbook_recipe_name_key(name));
CREATE UNIQUE INDEX "Cocktail_workspaceId_nameKey_key" ON "Cocktail"("workspaceId", "nameKey");

COMMIT;
