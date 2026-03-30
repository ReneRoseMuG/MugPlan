-- WARNUNG: DESTRUKTIV - DROPT DAS GESAMTE AKTIVE SCHEMA UND BAUT ES NEU AUF.
-- VOR AUSFUEHRUNG DIE FOLGENDE ZEILE AUF DEN ZIELNAMEN DER SERVER-DATENBANK SETZEN:
SET @expected_database = 'REPLACE_WITH_TARGET_DATABASE';

-- ============================================================================
-- BLOCK: GUARD
-- ============================================================================
SELECT DATABASE() AS active_database_before_guard, @expected_database AS expected_database_before_guard;

DELIMITER $$
DROP PROCEDURE IF EXISTS `__guard_recreate_server_schema_from_repo`$$
CREATE PROCEDURE `__guard_recreate_server_schema_from_repo`()
BEGIN
  DECLARE v_db_name VARCHAR(255);
  DECLARE v_expected_db_name VARCHAR(255);

  SET v_db_name = COALESCE(DATABASE(), '');
  SET v_expected_db_name = COALESCE(@expected_database, '');

  IF v_db_name = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'SCHEMA-RECREATE ABGEBROCHEN: Keine aktive Datenbank.';
  END IF;

  IF v_expected_db_name = '' OR v_expected_db_name = 'REPLACE_WITH_TARGET_DATABASE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'SCHEMA-RECREATE ABGEBROCHEN: @expected_database wurde nicht gesetzt.';
  END IF;

  IF LOWER(v_db_name) <> LOWER(v_expected_db_name) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'SCHEMA-RECREATE ABGEBROCHEN: Aktive Datenbank stimmt nicht mit @expected_database ueberein.';
  END IF;
END$$
CALL `__guard_recreate_server_schema_from_repo`()$$
DROP PROCEDURE IF EXISTS `__guard_recreate_server_schema_from_repo`$$
DELIMITER ;

-- ============================================================================
-- BLOCK: CONTEXT
-- ============================================================================
SELECT DATABASE() AS active_database_confirmed;

-- ============================================================================
-- BLOCK: DROP
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `appointment_employee`;
DROP TABLE IF EXISTS `appointment_note`;
DROP TABLE IF EXISTS `appointment_tags`;
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `backup_log`;
DROP TABLE IF EXISTS `calendar_sync_log`;
DROP TABLE IF EXISTS `project_order_items`;
DROP TABLE IF EXISTS `components`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `component_categories`;
DROP TABLE IF EXISTS `product_categories`;
DROP TABLE IF EXISTS `customer_attachment`;
DROP TABLE IF EXISTS `customer_note`;
DROP TABLE IF EXISTS `customer_tags`;
DROP TABLE IF EXISTS `customer`;
DROP TABLE IF EXISTS `employee_attachment`;
DROP TABLE IF EXISTS `employee_tags`;
DROP TABLE IF EXISTS `employee`;
DROP TABLE IF EXISTS `help_texts`;
DROP TABLE IF EXISTS `note_template`;
DROP TABLE IF EXISTS `note`;
DROP TABLE IF EXISTS `project_attachment`;
DROP TABLE IF EXISTS `project_note`;
DROP TABLE IF EXISTS `project_tags`;
DROP TABLE IF EXISTS `project_order`;
DROP TABLE IF EXISTS `project`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `seed_run_entity`;
DROP TABLE IF EXISTS `seed_run`;
DROP TABLE IF EXISTS `tags`;
DROP TABLE IF EXISTS `teams`;
DROP TABLE IF EXISTS `tours`;
DROP TABLE IF EXISTS `user_settings_value`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `__drizzle_migrations`;

-- ============================================================================
-- BLOCK: CREATE TABLES
-- ============================================================================
CREATE TABLE `customer` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `customer_number` varchar(255) NOT NULL,
  `first_name` varchar(255),
  `last_name` varchar(255),
  `full_name` varchar(255),
  `company` varchar(255),
  `email` varchar(255),
  `phone` varchar(255),
  `address_line1` varchar(255),
  `address_line2` varchar(255),
  `postal_code` varchar(255),
  `city` varchar(255),
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `customer_id` PRIMARY KEY(`id`),
  CONSTRAINT `customer_customer_number_unique` UNIQUE(`customer_number`)
);

CREATE TABLE `tours` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL DEFAULT '#2563eb',
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `tours_id` PRIMARY KEY(`id`)
);

CREATE TABLE `teams` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);

CREATE TABLE `roles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `is_system` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `roles_id` PRIMARY KEY(`id`),
  CONSTRAINT `roles_code_unique` UNIQUE(`code`)
);

CREATE TABLE `users` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `two_factor_secret_encrypted` text,
  `two_factor_backup_codes_reserved` text,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `full_name` varchar(200) NOT NULL,
  `role_id` int NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `last_login_at` timestamp NULL,
  `created_by` bigint,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_username_unique` UNIQUE(`username`),
  CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

CREATE TABLE `note` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `card_color` varchar(255),
  `print` boolean NOT NULL DEFAULT true,
  `card_color_locked` boolean NOT NULL DEFAULT false,
  `is_pinned` boolean NOT NULL DEFAULT false,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `note_id` PRIMARY KEY(`id`)
);

CREATE TABLE `note_template` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `card_color` varchar(255),
  `print` boolean NOT NULL DEFAULT true,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `note_template_id` PRIMARY KEY(`id`)
);

CREATE TABLE `customer_note` (
  `customer_id` bigint NOT NULL,
  `note_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `customer_note_customer_id_note_id_pk` PRIMARY KEY(`customer_id`,`note_id`)
);

CREATE TABLE `project` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` int NOT NULL DEFAULT 1,
  `customer_id` bigint NOT NULL,
  `description_md` text,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `project_id` PRIMARY KEY(`id`)
);

CREATE TABLE `project_order` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `project_id` bigint NOT NULL,
  `order_number` varchar(255) NOT NULL,
  `amount` decimal(12,2),
  `planned_date_text` varchar(255),
  `planned_week` varchar(10),
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `project_order_id` PRIMARY KEY(`id`),
  CONSTRAINT `project_order_project_id_unique` UNIQUE(`project_id`),
  CONSTRAINT `project_order_order_number_unique` UNIQUE(`order_number`)
);

CREATE TABLE `product_categories` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
  CONSTRAINT `product_categories_name_unique` UNIQUE(`name`)
);

CREATE TABLE `component_categories` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `component_categories_id` PRIMARY KEY(`id`),
  CONSTRAINT `component_categories_name_unique` UNIQUE(`name`)
);

CREATE TABLE `products` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `category_id` bigint NOT NULL,
  `description` text,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `products_id` PRIMARY KEY(`id`),
  CONSTRAINT `products_name_unique` UNIQUE(`name`)
);

CREATE TABLE `components` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `category_id` bigint NOT NULL,
  `description` text,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `components_id` PRIMARY KEY(`id`),
  CONSTRAINT `components_name_unique` UNIQUE(`name`)
);

CREATE TABLE `project_order_items` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `order_number` varchar(255) NOT NULL,
  `project_id` bigint NOT NULL,
  `product_id` bigint,
  `component_id` bigint,
  `description` text,
  `quantity` int NOT NULL DEFAULT 1,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `project_order_items_id` PRIMARY KEY(`id`),
  CONSTRAINT `chk_project_order_items_quantity_positive` CHECK(`project_order_items`.`quantity` > 0),
  CONSTRAINT `chk_project_order_items_relation_consistent` CHECK((`project_order_items`.`product_id` IS NOT NULL AND `project_order_items`.`component_id` IS NULL) OR (`project_order_items`.`product_id` IS NULL AND `project_order_items`.`component_id` IS NOT NULL))
);

CREATE TABLE `project_note` (
  `project_id` bigint NOT NULL,
  `note_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `project_note_project_id_note_id_pk` PRIMARY KEY(`project_id`,`note_id`)
);

CREATE TABLE `project_attachment` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `project_id` bigint NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(255) NOT NULL,
  `file_size` int NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `project_attachment_id` PRIMARY KEY(`id`)
);

CREATE TABLE `customer_attachment` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `customer_id` bigint NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(255) NOT NULL,
  `file_size` int NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `customer_attachment_id` PRIMARY KEY(`id`)
);

CREATE TABLE `appointments` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `project_id` bigint,
  `customer_id` bigint NOT NULL,
  `tour_id` int,
  `display_mode` varchar(32) NOT NULL DEFAULT 'standard',
  `title` varchar(255) NOT NULL,
  `description` text,
  `start_date` date NOT NULL,
  `start_time` time,
  `end_date` date,
  `end_time` time,
  `external_event_id` varchar(255),
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `tags` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(7) NOT NULL,
  `is_default` boolean NOT NULL DEFAULT false,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tags_id` PRIMARY KEY(`id`),
  CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);

CREATE TABLE `project_tags` (
  `project_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `project_tags_project_id_tag_id_pk` PRIMARY KEY(`project_id`,`tag_id`)
);

CREATE TABLE `customer_tags` (
  `customer_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `customer_tags_customer_id_tag_id_pk` PRIMARY KEY(`customer_id`,`tag_id`)
);

CREATE TABLE `employee` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(255),
  `email` varchar(255),
  `is_active` boolean NOT NULL DEFAULT true,
  `team_id` int,
  `tour_id` int,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `employee_id` PRIMARY KEY(`id`)
);

CREATE TABLE `employee_tags` (
  `employee_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `employee_tags_employee_id_tag_id_pk` PRIMARY KEY(`employee_id`,`tag_id`)
);

CREATE TABLE `appointment_tags` (
  `appointment_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `appointment_tags_appointment_id_tag_id_pk` PRIMARY KEY(`appointment_id`,`tag_id`)
);

CREATE TABLE `employee_attachment` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `employee_id` bigint NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(255) NOT NULL,
  `file_size` int NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `employee_attachment_id` PRIMARY KEY(`id`)
);

CREATE TABLE `appointment_employee` (
  `appointment_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `appointment_employee_appointment_id_employee_id_pk` PRIMARY KEY(`appointment_id`,`employee_id`)
);

CREATE TABLE `appointment_note` (
  `appointment_id` bigint NOT NULL,
  `note_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `appointment_note_appointment_id_note_id_pk` PRIMARY KEY(`appointment_id`,`note_id`)
);

CREATE TABLE `help_texts` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `help_key` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `help_texts_id` PRIMARY KEY(`id`),
  CONSTRAINT `help_texts_help_key_unique` UNIQUE(`help_key`)
);

CREATE TABLE `seed_run` (
  `id` varchar(36) NOT NULL,
  `config_json` json NOT NULL,
  `summary_json` json,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `seed_run_id` PRIMARY KEY(`id`)
);

CREATE TABLE `seed_run_entity` (
  `seed_run_id` varchar(36) NOT NULL,
  `entity_type` varchar(64) NOT NULL,
  `entity_id` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `seed_run_entity_seed_run_id_entity_type_entity_id_pk` PRIMARY KEY(`seed_run_id`,`entity_type`,`entity_id`)
);

CREATE TABLE `user_settings_value` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `setting_key` varchar(128) NOT NULL,
  `scope_type` varchar(16) NOT NULL,
  `scope_id` varchar(128) NOT NULL,
  `value_json` json NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint,
  CONSTRAINT `user_settings_value_id` PRIMARY KEY(`id`),
  CONSTRAINT `user_settings_value_key_scope_unique` UNIQUE(`setting_key`,`scope_type`,`scope_id`)
);

CREATE TABLE `backup_log` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `status` varchar(16) NOT NULL,
  `error_message` text,
  `exported_record_count` int NOT NULL DEFAULT 0,
  `file_path` text,
  CONSTRAINT `backup_log_id` PRIMARY KEY(`id`)
);

CREATE TABLE `calendar_sync_log` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `appointment_id` bigint,
  `action` varchar(32) NOT NULL,
  `status` varchar(16) NOT NULL,
  `message` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `calendar_sync_log_id` PRIMARY KEY(`id`)
);

CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- BLOCK: FOREIGN KEYS
-- ============================================================================
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE restrict ON UPDATE no action;

ALTER TABLE `customer_note` ADD CONSTRAINT `customer_note_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `customer_note` ADD CONSTRAINT `customer_note_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `project` ADD CONSTRAINT `project_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `project_order` ADD CONSTRAINT `project_order_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `products` ADD CONSTRAINT `products_category_id_product_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `components` ADD CONSTRAINT `components_category_id_component_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `component_categories`(`id`) ON DELETE restrict ON UPDATE no action;

ALTER TABLE `project_order_items` ADD CONSTRAINT `project_order_items_order_number_project_order_order_number_fk` FOREIGN KEY (`order_number`) REFERENCES `project_order`(`order_number`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `project_order_items` ADD CONSTRAINT `project_order_items_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `project_order_items` ADD CONSTRAINT `project_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `project_order_items` ADD CONSTRAINT `project_order_items_component_id_components_id_fk` FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON DELETE restrict ON UPDATE no action;

ALTER TABLE `project_note` ADD CONSTRAINT `project_note_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `project_note` ADD CONSTRAINT `project_note_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `project_attachment` ADD CONSTRAINT `project_attachment_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `customer_attachment` ADD CONSTRAINT `customer_attachment_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `appointments` ADD CONSTRAINT `appointments_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_tour_id_tours_id_fk` FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON DELETE restrict ON UPDATE restrict;

ALTER TABLE `project_tags` ADD CONSTRAINT `project_tags_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `project_tags` ADD CONSTRAINT `project_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `employee` ADD CONSTRAINT `employee_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `employee` ADD CONSTRAINT `employee_tour_id_tours_id_fk` FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `employee_tags` ADD CONSTRAINT `employee_tags_employee_id_employee_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `employee_tags` ADD CONSTRAINT `employee_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointment_tags` ADD CONSTRAINT `appointment_tags_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointment_tags` ADD CONSTRAINT `appointment_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `employee_attachment` ADD CONSTRAINT `employee_attachment_employee_id_employee_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointment_employee` ADD CONSTRAINT `appointment_employee_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointment_employee` ADD CONSTRAINT `appointment_employee_employee_id_employee_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointment_note` ADD CONSTRAINT `appointment_note_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointment_note` ADD CONSTRAINT `appointment_note_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `seed_run_entity` ADD CONSTRAINT `seed_run_entity_seed_run_id_seed_run_id_fk` FOREIGN KEY (`seed_run_id`) REFERENCES `seed_run`(`id`) ON DELETE cascade ON UPDATE no action;

-- ============================================================================
-- BLOCK: INDEXES
-- ============================================================================
CREATE INDEX `idx_project_customer_active_updated` ON `project` (`customer_id`,`is_active`,`updated_at`);
CREATE INDEX `idx_project_order_number_project` ON `project_order` (`order_number`,`project_id`);
CREATE INDEX `idx_order_items_order_number_project` ON `project_order_items` (`order_number`,`project_id`);
CREATE INDEX `idx_order_items_project` ON `project_order_items` (`project_id`);
CREATE INDEX `idx_appt_start_date` ON `appointments` (`start_date`);
CREATE INDEX `idx_appt_project_start_time_id` ON `appointments` (`project_id`,`start_date`,`start_time`,`id`);
CREATE INDEX `idx_appt_customer_start_time_id` ON `appointments` (`customer_id`,`start_date`,`start_time`,`id`);
CREATE INDEX `idx_appt_tour_start_time_id` ON `appointments` (`tour_id`,`start_date`,`start_time`,`id`);
CREATE INDEX `idx_tags_is_default` ON `tags` (`is_default`);
CREATE INDEX `idx_project_tags_tag_project` ON `project_tags` (`tag_id`,`project_id`);
CREATE INDEX `idx_customer_tags_tag_customer` ON `customer_tags` (`tag_id`,`customer_id`);
CREATE INDEX `idx_employee_tags_tag_employee` ON `employee_tags` (`tag_id`,`employee_id`);
CREATE INDEX `idx_appointment_tags_tag_appointment` ON `appointment_tags` (`tag_id`,`appointment_id`);
CREATE INDEX `idx_employee_active_name_id` ON `employee` (`is_active`,`last_name`,`first_name`,`id`);
CREATE INDEX `idx_ae_employee_appointment` ON `appointment_employee` (`employee_id`,`appointment_id`);
CREATE INDEX `idx_an_note_appointment` ON `appointment_note` (`note_id`,`appointment_id`);
CREATE INDEX `seed_run_entity_seed_run_idx` ON `seed_run_entity` (`seed_run_id`);
CREATE INDEX `seed_run_entity_entity_idx` ON `seed_run_entity` (`entity_type`,`entity_id`);
CREATE INDEX `idx_backup_created_id` ON `backup_log` (`created_at`,`id`);
CREATE INDEX `idx_backup_status_created_id` ON `backup_log` (`status`,`created_at`,`id`);
CREATE INDEX `idx_calendar_sync_appointment_created` ON `calendar_sync_log` (`appointment_id`,`created_at`);
CREATE INDEX `idx_calendar_sync_status_created` ON `calendar_sync_log` (`status`,`created_at`);

-- ============================================================================
-- BLOCK: MIGRATION HISTORY
-- ============================================================================
INSERT INTO `__drizzle_migrations` (`id`, `hash`, `created_at`) VALUES
  (1, '3ee268168fa50a53c31e367b4cfa8d4469460e0f2d0c2fc4d8d207ccf29e2143', 1772440591018),
  (2, 'c364635f61162f3b92b547ac5ceac459900679a862e93281bf40593e196002f9', 1772442165346),
  (3, 'ca685863b3e9e5ae4754c25bac3cc441ebfaaa07fed74b0d4e0ef864319f4bf5', 1772697433542),
  (4, 'd7b492d280d2f20fef3160ad4d63767defa80998c71ef16bd90448266950ad1d', 1772784000000),
  (5, '307e4c5cf663858600ed2b8dd4ae92bbe1694c8ffaf212a8f006fa43ebb272b2', 1773100800000),
  (6, 'fcb607c95be24a602ff3918f260326323eb400948bb3b79b1748cd6521923899', 1773014400000),
  (7, '1fd230ef69e0c814735778663e81a5972ce94014799d84d872ead2de95e0fd41', 1773108000000),
  (8, '1aec3b1fb9a9b6ddedf600baa10fb4621e3ab7922dd968705d6ad408f3a26455', 1773148800000),
  (9, '15ee62189167b5c249817252cfe4e23122bffb09f05cc3bed267322166f9e812', 1773333317735),
  (10, '2647d5257167e1bc703f744ae9e90222efd1a617dd9da4261c9a831d289f1817', 1773428400000),
  (11, '3c5a0d95c5d83ff1214802fb545472c0683d725ddab65ac9babe0ed154d9464d', 1773482400000),
  (12, '0bc7e1dd703e2b3e6bf44be829e07d8f8d5f4d1c26bd0fc299cf504b299c316e', 1773576000000),
  (13, '3f214571dab726e9a8ea9d98f83c2bcc299187b62e18174152a1bda039ba5dca', 1773655200000),
  (14, 'c589d2ed338833c95e6ae553ac8b0a0ae45343e0c57136796733f987d27c9975', 1773901251178),
  (15, 'd9e5341d01fecbf503a42ec780b149217c25df58af851cec21900ebcba94945d', 1774260614932),
  (16, '6deeeebb2f509bd4ae341e3253640a8ef102008661d041ad16caf5d4dffd3701', 1774742400000),
  (17, 'c83863861d38b90470fc901c835e146369da3d89cc56a405c75b03cd88e62ffe', 1774828800000),
  (18, '4b0278739a678b09f5af9d283c2a48be3b407988ac00d4a485a68e0e9f4d1677', 1774800000000),
  (19, 'a3d6a6da828b1b0cdf4c61d6668d9818e72d7031c5724c447095e55a663ac495', 1775088000000),
  (20, '83e28dfaf5fdbbbf5524eb3f330add22e12a984e46187cb219fb0af53b8ee7ba', 1775174400000);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- BLOCK: VERIFY
-- ============================================================================
SELECT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = DATABASE()
  AND t.table_name IN (
    '__drizzle_migrations',
    'appointment_employee',
    'appointment_note',
    'appointment_tags',
    'appointments',
    'backup_log',
    'calendar_sync_log',
    'component_categories',
    'components',
    'customer',
    'customer_attachment',
    'customer_note',
    'customer_tags',
    'employee',
    'employee_attachment',
    'employee_tags',
    'help_texts',
    'note',
    'note_template',
    'product_categories',
    'products',
    'project',
    'project_attachment',
    'project_note',
    'project_order',
    'project_order_items',
    'project_tags',
    'roles',
    'seed_run',
    'seed_run_entity',
    'tags',
    'teams',
    'tours',
    'user_settings_value',
    'users'
  )
ORDER BY t.table_name;

SELECT id, hash, created_at
FROM `__drizzle_migrations`
ORDER BY id;

SHOW CREATE TABLE `users`;
SHOW CREATE TABLE `project_order`;
SHOW CREATE TABLE `project_order_items`;
SHOW CREATE TABLE `note`;
