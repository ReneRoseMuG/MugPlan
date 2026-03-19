SET @product_categories_has_is_default = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'product_categories'
    AND column_name = 'is_default'
);

SET @product_categories_add_is_default_sql = IF(
  @product_categories_has_is_default,
  'SELECT 1',
  'ALTER TABLE `product_categories` ADD COLUMN `is_default` boolean NOT NULL DEFAULT false'
);
PREPARE stmt_product_categories_add_is_default FROM @product_categories_add_is_default_sql;
EXECUTE stmt_product_categories_add_is_default;
DEALLOCATE PREPARE stmt_product_categories_add_is_default;

SET @component_categories_has_is_default = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'component_categories'
    AND column_name = 'is_default'
);

SET @component_categories_add_is_default_sql = IF(
  @component_categories_has_is_default,
  'SELECT 1',
  'ALTER TABLE `component_categories` ADD COLUMN `is_default` boolean NOT NULL DEFAULT false'
);
PREPARE stmt_component_categories_add_is_default FROM @component_categories_add_is_default_sql;
EXECUTE stmt_component_categories_add_is_default;
DEALLOCATE PREPARE stmt_component_categories_add_is_default;

update product_categories
set is_default = true
where trim(name) in ('Fass Saunen');

update component_categories
set is_default = true
where trim(name) in (
  'Dachvarianten',
  'Fenster',
  'Inneneinrichtung',
  'Öfen',
  'Rückwände',
  'Steuerungen',
  'Türen',
  'Vorderwände'
);
