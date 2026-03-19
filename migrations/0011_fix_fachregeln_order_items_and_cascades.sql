delete from project_order_items
where product_id is null
  and component_id is null;

SET @poi_has_relation_consistency_check = EXISTS(
  SELECT 1
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND constraint_type = 'CHECK'
    AND constraint_name = 'chk_project_order_items_relation_consistent'
);

SET @poi_drop_relation_consistency_check_sql = IF(
  @poi_has_relation_consistency_check,
  'ALTER TABLE `project_order_items` DROP CHECK `chk_project_order_items_relation_consistent`',
  'SELECT 1'
);
PREPARE stmt_poi_drop_relation_consistency_check FROM @poi_drop_relation_consistency_check_sql;
EXECUTE stmt_poi_drop_relation_consistency_check;
DEALLOCATE PREPARE stmt_poi_drop_relation_consistency_check;

SET @poi_has_description_column = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND column_name = 'description'
);

SET @poi_drop_description_column_sql = IF(
  @poi_has_description_column,
  'ALTER TABLE `project_order_items` DROP COLUMN `description`',
  'SELECT 1'
);
PREPARE stmt_poi_drop_description_column FROM @poi_drop_description_column_sql;
EXECUTE stmt_poi_drop_description_column;
DEALLOCATE PREPARE stmt_poi_drop_description_column;

SET @poi_has_relation_consistency_check = EXISTS(
  SELECT 1
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND constraint_type = 'CHECK'
    AND constraint_name = 'chk_project_order_items_relation_consistent'
);

SET @poi_add_relation_consistency_check_sql = IF(
  @poi_has_relation_consistency_check,
  'SELECT 1',
  'ALTER TABLE `project_order_items` ADD CONSTRAINT `chk_project_order_items_relation_consistent` CHECK (((`product_id` IS NOT NULL AND `component_id` IS NULL) OR (`product_id` IS NULL AND `component_id` IS NOT NULL)) AND (`specification_id` IS NULL OR `component_id` IS NOT NULL))'
);
PREPARE stmt_poi_add_relation_consistency_check FROM @poi_add_relation_consistency_check_sql;
EXECUTE stmt_poi_add_relation_consistency_check;
DEALLOCATE PREPARE stmt_poi_add_relation_consistency_check;
