-- WARNUNG: DESTRUKTIV - LOESCHT BESTEHENDE DATEN IM AKTUELL AKTIVEN SCHEMA.

-- ============================================================================
-- BLOCK: GUARD (TEST DB ONLY)
-- ============================================================================
SELECT DATABASE() AS active_database_before_guard;

DELIMITER $$
DROP PROCEDURE IF EXISTS `__guard_reset_absolute_state`$$
CREATE PROCEDURE `__guard_reset_absolute_state`()
BEGIN
  DECLARE v_db_name VARCHAR(255);
  SET v_db_name = LOWER(COALESCE(DATABASE(), ''));

  SELECT v_db_name AS active_database_evaluated;

  IF v_db_name = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ABSOLUTE RESET ABGEBROCHEN: Keine aktive Datenbank.';
  END IF;

  IF v_db_name NOT LIKE '%\\_test' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ABSOLUTE RESET ABGEBROCHEN: Nur Test-Datenbanken mit Suffix _test erlaubt.';
  END IF;
END$$
CALL `__guard_reset_absolute_state`()$$
DROP PROCEDURE IF EXISTS `__guard_reset_absolute_state`$$
DELIMITER ;

-- ============================================================================
-- BLOCK: CONTEXT
-- ============================================================================
SELECT DATABASE() AS active_database;

-- ============================================================================
-- BLOCK: DROP (DESTRUCTIVE RESET)
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `appointment_employee`;
DROP TABLE IF EXISTS `appointment_note`;
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `backup_log`;
DROP TABLE IF EXISTS `customer_attachment`;
DROP TABLE IF EXISTS `customer_note`;
DROP TABLE IF EXISTS `customer`;
DROP TABLE IF EXISTS `employee_attachment`;
DROP TABLE IF EXISTS `employee`;
DROP TABLE IF EXISTS `help_texts`;
DROP TABLE IF EXISTS `note_template`;
DROP TABLE IF EXISTS `note`;
DROP TABLE IF EXISTS `project_attachment`;
DROP TABLE IF EXISTS `project_note`;
DROP TABLE IF EXISTS `project`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `teams`;
DROP TABLE IF EXISTS `tours`;
DROP TABLE IF EXISTS `user_settings_value`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- BLOCK: CREATE (FULL REBUILD FROM CURRENT DRIZZLE SCHEMA)
-- ============================================================================
CREATE TABLE `appointment_employee` (
  `appointment_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `appointment_employee_appointment_id_employee_id_pk` PRIMARY KEY(`appointment_id`,`employee_id`)
);

CREATE TABLE `appointments` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `project_id` bigint NOT NULL,
  `tour_id` int,
  `title` varchar(255) NOT NULL,
  `description` text,
  `start_date` date NOT NULL,
  `start_time` time,
  `end_date` date,
  `end_time` time,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `appointment_note` (
  `appointment_id` bigint NOT NULL,
  `note_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `appointment_note_appointment_id_note_id_pk` PRIMARY KEY(`appointment_id`,`note_id`)
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

CREATE TABLE `customer_note` (
  `customer_id` bigint NOT NULL,
  `note_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `customer_note_customer_id_note_id_pk` PRIMARY KEY(`customer_id`,`note_id`)
);

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

CREATE TABLE `note_template` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `color` varchar(255),
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `note_template_id` PRIMARY KEY(`id`)
);

CREATE TABLE `note` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `color` varchar(255),
  `is_pinned` boolean NOT NULL DEFAULT false,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `note_id` PRIMARY KEY(`id`)
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

CREATE TABLE `project_note` (
  `project_id` bigint NOT NULL,
  `note_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `project_note_project_id_note_id_pk` PRIMARY KEY(`project_id`,`note_id`)
);

CREATE TABLE `project` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `order_number` varchar(255),
  `amount` decimal(12,2),
  `customer_id` bigint NOT NULL,
  `description_md` text,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `project_id` PRIMARY KEY(`id`)
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

CREATE TABLE `teams` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);

CREATE TABLE `tours` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `tours_id` PRIMARY KEY(`id`)
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
  `last_login_at` timestamp,
  `created_by` bigint,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_username_unique` UNIQUE(`username`),
  CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

ALTER TABLE `appointment_employee` ADD CONSTRAINT `appointment_employee_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointment_employee` ADD CONSTRAINT `appointment_employee_employee_id_employee_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointment_note` ADD CONSTRAINT `appointment_note_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointment_note` ADD CONSTRAINT `appointment_note_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_tour_id_tours_id_fk` FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `customer_attachment` ADD CONSTRAINT `customer_attachment_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `customer_note` ADD CONSTRAINT `customer_note_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `customer_note` ADD CONSTRAINT `customer_note_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `employee_attachment` ADD CONSTRAINT `employee_attachment_employee_id_employee_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `employee` ADD CONSTRAINT `employee_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `employee` ADD CONSTRAINT `employee_tour_id_tours_id_fk` FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `project_attachment` ADD CONSTRAINT `project_attachment_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `project_note` ADD CONSTRAINT `project_note_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `project_note` ADD CONSTRAINT `project_note_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `project` ADD CONSTRAINT `project_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE restrict ON UPDATE no action;

CREATE INDEX `idx_ae_employee_appointment` ON `appointment_employee` (`employee_id`,`appointment_id`);
CREATE INDEX `idx_an_note_appointment` ON `appointment_note` (`note_id`,`appointment_id`);
CREATE INDEX `idx_appt_start_date` ON `appointments` (`start_date`);
CREATE INDEX `idx_appt_project_start_time_id` ON `appointments` (`project_id`,`start_date`,`start_time`,`id`);
CREATE INDEX `idx_appt_tour_start_time_id` ON `appointments` (`tour_id`,`start_date`,`start_time`,`id`);
CREATE INDEX `idx_backup_created_id` ON `backup_log` (`created_at`,`id`);
CREATE INDEX `idx_backup_status_created_id` ON `backup_log` (`status`,`created_at`,`id`);
CREATE INDEX `idx_employee_active_name_id` ON `employee` (`is_active`,`last_name`,`first_name`,`id`);
CREATE INDEX `idx_project_customer_active_updated` ON `project` (`customer_id`,`is_active`,`updated_at`);
-- ============================================================================
-- BLOCK: SEED (STANDARD ROLES)
-- ============================================================================
INSERT INTO `roles` (`code`, `name`, `description`, `is_system`, `version`)
VALUES
  ('ADMIN', 'Admin', 'Vollzugriff. Systemadministration und Stammdaten.', true, 1),
  ('READER', 'Leser', 'Lesezugriff nur. Keine Bearbeitungsrechte.', true, 1),
  ('DISPATCHER', 'Disponent', 'Fachliche Bearbeitung von Projekten, Terminen und Kunden.', true, 1);

-- ============================================================================
-- BLOCK: VERIFY
-- ============================================================================
SELECT
  t.table_name
FROM information_schema.tables t
WHERE t.table_schema = DATABASE()
  AND t.table_name IN (
    'appointment_employee',
    'appointment_note',
    'appointments',
    'backup_log',
    'customer',
    'customer_attachment',
    'customer_note',
    'employee',
    'employee_attachment',
    'help_texts',
    'note',
    'note_template',
    'project',
    'project_attachment',
    'project_note',
    'roles',
    'teams',
    'tours',
    'user_settings_value',
    'users'
  )
ORDER BY t.table_name;

SELECT
  r.id,
  r.code,
  r.name,
  r.description,
  r.is_system,
  r.version,
  r.created_at,
  r.updated_at
FROM roles r
ORDER BY r.id;
