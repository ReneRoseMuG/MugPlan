-- ============================================================
-- MuG Plan - Vollständiges Datenbankschema
-- Alle 15 Tabellen für die Fasssauna-Monteur-Verwaltung
-- ============================================================

-- ============================================================
-- SICHERHEIT: DROP TABLE Anweisungen
-- Achtung: Dies löscht alle bestehenden Tabellen!
-- ============================================================

DROP TABLE IF EXISTS `appointment_employee`;
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `project_project_status`;
DROP TABLE IF EXISTS `project_attachment`;
DROP TABLE IF EXISTS `project_note`;
DROP TABLE IF EXISTS `customer_note`;
DROP TABLE IF EXISTS `project`;
DROP TABLE IF EXISTS `project_status`;
DROP TABLE IF EXISTS `employee`;
DROP TABLE IF EXISTS `note`;
DROP TABLE IF EXISTS `note_template`;
DROP TABLE IF EXISTS `help_texts`;
DROP TABLE IF EXISTS `tours`;
DROP TABLE IF EXISTS `teams`;
DROP TABLE IF EXISTS `customer`;

-- ============================================================
-- 1. CUSTOMER - Kundenstammdaten
-- ============================================================

CREATE TABLE `customer` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `customer_number` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(255) NOT NULL,
  `last_name` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `company` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(255) NOT NULL,
  `address_line1` VARCHAR(255) DEFAULT NULL,
  `address_line2` VARCHAR(255) DEFAULT NULL,
  `postal_code` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT (now()),
  `updated_at` TIMESTAMP NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_customer_number_unique` (`customer_number`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 2. TOURS - Geografische Einsatzgebiete
-- ============================================================

CREATE TABLE `tours` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `color` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 3. TEAMS - Organisatorische Teams
-- ============================================================

CREATE TABLE `teams` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `color` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 4. NOTE - Allgemeine Notizen
-- ============================================================

CREATE TABLE `note` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT (now()),
  `updated_at` TIMESTAMP NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `color` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 5. NOTE_TEMPLATE - Vorlagen für Notizen
-- ============================================================

CREATE TABLE `note_template` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT (now()),
  `updated_at` TIMESTAMP NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `color` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 6. CUSTOMER_NOTE - Verbindung Kunden zu Notizen
-- ============================================================

CREATE TABLE `customer_note` (
  `customer_id` BIGINT NOT NULL,
  `note_id` BIGINT NOT NULL,
  PRIMARY KEY (`customer_id`,`note_id`),
  KEY `customer_note_note_id_note_id_fk` (`note_id`),
  CONSTRAINT `customer_note_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_note_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 7. PROJECT - Projekte/Aufträge
-- ============================================================

CREATE TABLE `project` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `customer_id` BIGINT NOT NULL,
  `description_md` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT (now()),
  `updated_at` TIMESTAMP NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_customer_id_customer_id_fk` (`customer_id`),
  CONSTRAINT `project_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 8. PROJECT_NOTE - Verbindung Projekte zu Notizen
-- ============================================================

CREATE TABLE `project_note` (
  `project_id` BIGINT NOT NULL,
  `note_id` BIGINT NOT NULL,
  PRIMARY KEY (`project_id`,`note_id`),
  KEY `project_note_note_id_note_id_fk` (`note_id`),
  CONSTRAINT `project_note_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_note_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 9. PROJECT_ATTACHMENT - Dateianhänge zu Projekten
-- ============================================================

CREATE TABLE `project_attachment` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `project_id` BIGINT NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(255) NOT NULL,
  `file_size` INT NOT NULL,
  `storage_path` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `project_attachment_project_id_project_id_fk` (`project_id`),
  CONSTRAINT `project_attachment_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 10. PROJECT_STATUS - Statustypen für Projekte
-- ============================================================

CREATE TABLE `project_status` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `color` VARCHAR(255) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT (now()),
  `updated_at` TIMESTAMP NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 11. PROJECT_PROJECT_STATUS - Verbindung Projekte zu Status
-- ============================================================

CREATE TABLE `project_project_status` (
  `project_id` BIGINT NOT NULL,
  `project_status_id` BIGINT NOT NULL,
  PRIMARY KEY (`project_id`,`project_status_id`),
  KEY `project_project_status_project_status_id_project_status_id_fk` (`project_status_id`),
  CONSTRAINT `project_project_status_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_project_status_project_status_id_project_status_id_fk` FOREIGN KEY (`project_status_id`) REFERENCES `project_status` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 12. EMPLOYEE - Mitarbeiterstammdaten
-- ============================================================

CREATE TABLE `employee` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(255) NOT NULL,
  `last_name` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `team_id` INT DEFAULT NULL,
  `tour_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT (now()),
  `updated_at` TIMESTAMP NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_team_id_teams_id_fk` (`team_id`),
  KEY `employee_tour_id_tours_id_fk` (`tour_id`),
  CONSTRAINT `employee_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `employee_tour_id_tours_id_fk` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 13. APPOINTMENTS - Termine/Einsätze
-- ============================================================

CREATE TABLE `appointments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `project_id` BIGINT NOT NULL,
  `tour_id` INT DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `start_date` DATE NOT NULL,
  `start_time` TIME DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `end_time` TIME DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_appointments_project` (`project_id`),
  KEY `fk_appointments_tour` (`tour_id`),
  CONSTRAINT `fk_appointments_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appointments_tour` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 14. APPOINTMENT_EMPLOYEE - Verbindung Termine zu Mitarbeitern
-- ============================================================

CREATE TABLE `appointment_employee` (
  `appointment_id` BIGINT NOT NULL,
  `employee_id` BIGINT NOT NULL,
  PRIMARY KEY (`appointment_id`,`employee_id`),
  KEY `fk_ae_employee` (`employee_id`),
  CONSTRAINT `fk_ae_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ae_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 15. HELP_TEXTS - Hilfetexte in der App
-- ============================================================

CREATE TABLE `help_texts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `help_key` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT (now()),
  `updated_at` TIMESTAMP NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `help_texts_help_key_unique` (`help_key`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- SCHEMA VOLLSTÄNDIG
-- ============================================================
-- Alle 15 Tabellen wurden erfolgreich erstellt.
-- Die Reihenfolge der DROP und CREATE Statements berücksichtigt
-- die Fremdschlüssel-Dependencies.
-- ============================================================
