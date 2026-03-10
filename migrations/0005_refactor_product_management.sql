SET @add_project_type_column = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'project'
        AND column_name = 'type'
    ),
    'SELECT 1',
    'ALTER TABLE `project` ADD COLUMN `type` int NOT NULL DEFAULT 1 AFTER `name`'
  )
);
PREPARE stmt_add_project_type_column FROM @add_project_type_column;
EXECUTE stmt_add_project_type_column;
DEALLOCATE PREPARE stmt_add_project_type_column;

CREATE TABLE IF NOT EXISTS `component_specifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `component_id` bigint NOT NULL,
  `spec_name` varchar(255) NOT NULL,
  `spec_value` text NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_component_specifications_value` (`component_id`, `spec_name`, `spec_value`(191)),
  KEY `idx_component_specifications_component` (`component_id`),
  CONSTRAINT `component_specifications_component_id_components_id_fk`
    FOREIGN KEY (`component_id`) REFERENCES `components` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `project_order` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `order_number` varchar(255) NOT NULL,
  `amount` decimal(12,2) NULL,
  `planned_date_text` varchar(255) NULL,
  `planned_week` varchar(10) NULL,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_order_project_id_unique` (`project_id`),
  UNIQUE KEY `project_order_order_number_unique` (`order_number`),
  KEY `idx_project_order_number_project` (`order_number`, `project_id`),
  CONSTRAINT `project_order_project_id_project_id_fk`
    FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @project_has_order_number = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'project'
    AND column_name = 'order_number'
);

SET @project_has_amount = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'project'
    AND column_name = 'amount'
);

SET @project_order_seed_sql = CONCAT(
  'INSERT INTO `project_order` (`project_id`, `order_number`, `amount`, `planned_date_text`, `planned_week`, `version`, `created_at`, `updated_at`) ',
  'SELECT ',
  '  `p`.`id`, ',
  IF(
    @project_has_order_number,
    'CASE WHEN `p`.`order_number` IS NULL OR CHAR_LENGTH(TRIM(`p`.`order_number`)) = 0 THEN CONCAT(''LEGACY-'', LPAD(`p`.`id`, 8, ''0'')) ELSE TRIM(`p`.`order_number`) END, ',
    'CONCAT(''LEGACY-'', LPAD(`p`.`id`, 8, ''0'')), '
  ),
  IF(@project_has_amount, '`p`.`amount`, ', 'NULL, '),
  '  NULL, ',
  '  NULL, ',
  '  COALESCE(`p`.`version`, 1), ',
  '  `p`.`created_at`, ',
  '  `p`.`updated_at` ',
  'FROM `project` `p` ',
  'LEFT JOIN `project_order` `po` ON `po`.`project_id` = `p`.`id` ',
  'WHERE `po`.`project_id` IS NULL'
);
PREPARE stmt_project_order_seed FROM @project_order_seed_sql;
EXECUTE stmt_project_order_seed;
DEALLOCATE PREPARE stmt_project_order_seed;

SET @poi_has_order_number = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND column_name = 'order_number'
);

SET @poi_has_specification_id = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND column_name = 'specification_id'
);

SET @poi_add_columns_sql = CONCAT(
  'ALTER TABLE `project_order_items` ',
  IF(
    NOT @poi_has_order_number AND NOT @poi_has_specification_id,
    'ADD COLUMN `order_number` varchar(255) NULL AFTER `id`, ADD COLUMN `specification_id` bigint NULL AFTER `component_id`',
    IF(
      NOT @poi_has_order_number,
      'ADD COLUMN `order_number` varchar(255) NULL AFTER `id`',
      IF(
        NOT @poi_has_specification_id,
        'ADD COLUMN `specification_id` bigint NULL AFTER `component_id`',
        'ENGINE=InnoDB'
      )
    )
  )
);
PREPARE stmt_poi_add_columns FROM @poi_add_columns_sql;
EXECUTE stmt_poi_add_columns;
DEALLOCATE PREPARE stmt_poi_add_columns;

UPDATE `project_order_items` `poi`
INNER JOIN `project_order` `po` ON `po`.`project_id` = `poi`.`project_id`
SET `poi`.`order_number` = `po`.`order_number`
WHERE `poi`.`order_number` IS NULL;

ALTER TABLE `project_order_items`
  MODIFY COLUMN `order_number` varchar(255) NOT NULL;

SET @poi_has_order_number_project_index = EXISTS(
  SELECT 1
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND index_name = 'idx_order_items_order_number_project'
);

SET @poi_add_order_number_project_index_sql = IF(
  @poi_has_order_number_project_index,
  'SELECT 1',
  'ALTER TABLE `project_order_items` ADD KEY `idx_order_items_order_number_project` (`order_number`, `project_id`)'
);
PREPARE stmt_poi_add_order_number_project_index FROM @poi_add_order_number_project_index_sql;
EXECUTE stmt_poi_add_order_number_project_index;
DEALLOCATE PREPARE stmt_poi_add_order_number_project_index;

SET @poi_has_order_number_fk = EXISTS(
  SELECT 1
  FROM information_schema.referential_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND constraint_name = 'fk_poi_order_number'
);

SET @poi_add_order_number_fk_sql = IF(
  @poi_has_order_number_fk,
  'SELECT 1',
  'ALTER TABLE `project_order_items` ADD CONSTRAINT `fk_poi_order_number` FOREIGN KEY (`order_number`) REFERENCES `project_order` (`order_number`) ON DELETE CASCADE'
);
PREPARE stmt_poi_add_order_number_fk FROM @poi_add_order_number_fk_sql;
EXECUTE stmt_poi_add_order_number_fk;
DEALLOCATE PREPARE stmt_poi_add_order_number_fk;

SET @poi_has_specification_fk = EXISTS(
  SELECT 1
  FROM information_schema.referential_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND constraint_name = 'fk_poi_specification_id'
);

SET @poi_add_specification_fk_sql = IF(
  @poi_has_specification_fk,
  'SELECT 1',
  'ALTER TABLE `project_order_items` ADD CONSTRAINT `fk_poi_specification_id` FOREIGN KEY (`specification_id`) REFERENCES `component_specifications` (`id`) ON DELETE RESTRICT'
);
PREPARE stmt_poi_add_specification_fk FROM @poi_add_specification_fk_sql;
EXECUTE stmt_poi_add_specification_fk;
DEALLOCATE PREPARE stmt_poi_add_specification_fk;

SET @poi_has_source_consistency_check = EXISTS(
  SELECT 1
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND constraint_type = 'CHECK'
    AND constraint_name = 'chk_project_order_items_source_consistent'
);

SET @poi_drop_source_consistency_check_sql = IF(
  @poi_has_source_consistency_check,
  'ALTER TABLE `project_order_items` DROP CHECK `chk_project_order_items_source_consistent`',
  'SELECT 1'
);
PREPARE stmt_poi_drop_source_consistency_check FROM @poi_drop_source_consistency_check_sql;
EXECUTE stmt_poi_drop_source_consistency_check;
DEALLOCATE PREPARE stmt_poi_drop_source_consistency_check;

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
  'ALTER TABLE `project_order_items` ADD CONSTRAINT `chk_project_order_items_relation_consistent` CHECK ((`product_id` IS NOT NULL AND `component_id` IS NULL) OR (`product_id` IS NULL AND `component_id` IS NOT NULL) OR (`product_id` IS NULL AND `component_id` IS NULL AND `description` IS NOT NULL)) AND (`specification_id` IS NULL OR `component_id` IS NOT NULL)'
);
PREPARE stmt_poi_add_relation_consistency_check FROM @poi_add_relation_consistency_check_sql;
EXECUTE stmt_poi_add_relation_consistency_check;
DEALLOCATE PREPARE stmt_poi_add_relation_consistency_check;

SET @poi_has_source_column = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'project_order_items'
    AND column_name = 'source'
);

SET @poi_drop_source_column_sql = IF(
  @poi_has_source_column,
  'ALTER TABLE `project_order_items` DROP COLUMN `source`',
  'SELECT 1'
);
PREPARE stmt_poi_drop_source_column FROM @poi_drop_source_column_sql;
EXECUTE stmt_poi_drop_source_column;
DEALLOCATE PREPARE stmt_poi_drop_source_column;

SET @project_has_order_number_column = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'project'
    AND column_name = 'order_number'
);

SET @project_has_amount_column = EXISTS(
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'project'
    AND column_name = 'amount'
);

SET @project_drop_legacy_columns_sql = IF(
  @project_has_order_number_column AND @project_has_amount_column,
  'ALTER TABLE `project` DROP COLUMN `order_number`, DROP COLUMN `amount`',
  IF(
    @project_has_order_number_column,
    'ALTER TABLE `project` DROP COLUMN `order_number`',
    IF(
      @project_has_amount_column,
      'ALTER TABLE `project` DROP COLUMN `amount`',
      'SELECT 1'
    )
  )
);
PREPARE stmt_project_drop_legacy_columns FROM @project_drop_legacy_columns_sql;
EXECUTE stmt_project_drop_legacy_columns;
DEALLOCATE PREPARE stmt_project_drop_legacy_columns;
