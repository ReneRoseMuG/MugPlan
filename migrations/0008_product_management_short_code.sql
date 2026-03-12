SET @products_has_short_code = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'products'
    AND column_name = 'short_code'
);

SET @products_add_short_code_sql = IF(
  @products_has_short_code,
  'SELECT 1',
  'ALTER TABLE `products` ADD COLUMN `short_code` varchar(64) NULL AFTER `name`'
);
PREPARE stmt_products_add_short_code FROM @products_add_short_code_sql;
EXECUTE stmt_products_add_short_code;
DEALLOCATE PREPARE stmt_products_add_short_code;

SET @components_has_short_code = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'components'
    AND column_name = 'short_code'
);

SET @components_add_short_code_sql = IF(
  @components_has_short_code,
  'SELECT 1',
  'ALTER TABLE `components` ADD COLUMN `short_code` varchar(64) NULL AFTER `name`'
);
PREPARE stmt_components_add_short_code FROM @components_add_short_code_sql;
EXECUTE stmt_components_add_short_code;
DEALLOCATE PREPARE stmt_components_add_short_code;
