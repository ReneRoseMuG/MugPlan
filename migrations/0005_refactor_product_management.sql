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

INSERT INTO `project_order` (`project_id`, `order_number`, `amount`, `planned_date_text`, `planned_week`, `version`, `created_at`, `updated_at`)
SELECT
  `p`.`id`,
  CASE
    WHEN `p`.`order_number` IS NULL OR CHAR_LENGTH(TRIM(`p`.`order_number`)) = 0
      THEN CONCAT('LEGACY-', LPAD(`p`.`id`, 8, '0'))
    ELSE TRIM(`p`.`order_number`)
  END,
  `p`.`amount`,
  NULL,
  NULL,
  COALESCE(`p`.`version`, 1),
  `p`.`created_at`,
  `p`.`updated_at`
FROM `project` `p`
LEFT JOIN `project_order` `po` ON `po`.`project_id` = `p`.`id`
WHERE `po`.`project_id` IS NULL;

ALTER TABLE `project_order_items`
  ADD COLUMN `order_number` varchar(255) NULL AFTER `id`,
  ADD COLUMN `specification_id` bigint NULL AFTER `component_id`;

UPDATE `project_order_items` `poi`
INNER JOIN `project_order` `po` ON `po`.`project_id` = `poi`.`project_id`
SET `poi`.`order_number` = `po`.`order_number`
WHERE `poi`.`order_number` IS NULL;

ALTER TABLE `project_order_items`
  MODIFY COLUMN `order_number` varchar(255) NOT NULL;

ALTER TABLE `project_order_items`
  ADD KEY `idx_order_items_order_number_project` (`order_number`, `project_id`),
  ADD CONSTRAINT `fk_poi_order_number`
    FOREIGN KEY (`order_number`) REFERENCES `project_order` (`order_number`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_poi_specification_id`
    FOREIGN KEY (`specification_id`) REFERENCES `component_specifications` (`id`) ON DELETE RESTRICT;

ALTER TABLE `project_order_items`
  DROP CHECK `chk_project_order_items_source_consistent`;

ALTER TABLE `project_order_items`
  ADD CONSTRAINT `chk_project_order_items_relation_consistent`
  CHECK (
    (
      (`product_id` IS NOT NULL AND `component_id` IS NULL)
      OR (`product_id` IS NULL AND `component_id` IS NOT NULL)
      OR (`product_id` IS NULL AND `component_id` IS NULL AND `description` IS NOT NULL)
    )
    AND (`specification_id` IS NULL OR `component_id` IS NOT NULL)
  );

ALTER TABLE `project_order_items`
  DROP COLUMN `source`;

ALTER TABLE `project`
  DROP COLUMN `order_number`,
  DROP COLUMN `amount`;
