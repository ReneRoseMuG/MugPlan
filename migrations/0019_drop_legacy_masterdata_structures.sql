SET @has_project_order_items = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
);

SET @specification_fk_name = (
  SELECT constraint_name
  FROM information_schema.key_column_usage
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND column_name = 'specification_id'
    AND referenced_table_name = 'component_specifications'
  ORDER BY constraint_name
  LIMIT 1
);

SET @has_relation_check = (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND constraint_name = 'chk_project_order_items_relation_consistent'
    AND constraint_type = 'CHECK'
);

SET @has_specification_column = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND column_name = 'specification_id'
);

SET @drop_specification_fk_sql = IF(
  @has_project_order_items > 0 AND @specification_fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `project_order_items` DROP FOREIGN KEY `', @specification_fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @drop_specification_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_relation_check_sql = IF(
  @has_project_order_items > 0 AND @has_relation_check > 0,
  'ALTER TABLE `project_order_items` DROP CHECK `chk_project_order_items_relation_consistent`',
  'SELECT 1'
);
PREPARE stmt FROM @drop_relation_check_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_specification_column_sql = IF(
  @has_project_order_items > 0 AND @has_specification_column > 0,
  'ALTER TABLE `project_order_items` DROP COLUMN `specification_id`',
  'SELECT 1'
);
PREPARE stmt FROM @drop_specification_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_relation_check_sql = IF(
  @has_project_order_items > 0,
  'ALTER TABLE `project_order_items` ADD CONSTRAINT `chk_project_order_items_relation_consistent` CHECK (((`product_id` IS NOT NULL AND `component_id` IS NULL) OR (`product_id` IS NULL AND `component_id` IS NOT NULL)))',
  'SELECT 1'
);
PREPARE stmt FROM @add_relation_check_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
DROP TABLE IF EXISTS `component_specifications`;
--> statement-breakpoint
DROP TABLE IF EXISTS `product_component`;
