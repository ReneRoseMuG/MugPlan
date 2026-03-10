INSERT IGNORE INTO component_categories (name, is_active, version, created_at, updated_at)
VALUES ('Saunamodell', 1, 1, now(), now());

SET @saunamodell_category_id = (
  SELECT id
  FROM component_categories
  WHERE name = 'Saunamodell'
  LIMIT 1
);

UPDATE components
SET category_id = @saunamodell_category_id
WHERE category_id IN (
  SELECT legacy.id
  FROM (
    SELECT id
    FROM component_categories
    WHERE name IN ('Alle Modelle', 'Saunatyp')
      AND id <> @saunamodell_category_id
  ) AS legacy
);

DELETE FROM component_categories
WHERE name IN ('Alle Modelle', 'Saunatyp')
  AND id <> @saunamodell_category_id;

INSERT IGNORE INTO component_categories (name, is_active, version, created_at, updated_at)
VALUES ('Dach', 1, 1, now(), now());

SET @dach_category_id = (
  SELECT id
  FROM component_categories
  WHERE name = 'Dach'
  LIMIT 1
);

UPDATE components
SET category_id = @dach_category_id
WHERE category_id IN (
  SELECT legacy.id
  FROM (
    SELECT id
    FROM component_categories
    WHERE name = 'Dachvariante'
      AND id <> @dach_category_id
  ) AS legacy
);

DELETE FROM component_categories
WHERE name = 'Dachvariante'
  AND id <> @dach_category_id;

INSERT IGNORE INTO component_categories (name, is_active, version, created_at, updated_at)
VALUES ('Steuerung', 1, 1, now(), now());
