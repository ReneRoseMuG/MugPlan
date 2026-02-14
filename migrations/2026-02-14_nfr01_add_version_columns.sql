SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `customer` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tours' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `tours` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teams' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `teams` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `roles` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'note' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `note` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'note_template' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `note_template` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_note' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `customer_note` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `project` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_note' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `project_note` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_attachment' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `project_attachment` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_attachment' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `customer_attachment` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `appointments` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_status' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `project_status` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_project_status' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `project_project_status` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employee' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `employee` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employee_attachment' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `employee_attachment` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_employee' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `appointment_employee` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'help_texts' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `help_texts` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_settings_value' AND COLUMN_NAME = 'version'
    ),
    'SELECT 1',
    'ALTER TABLE `user_settings_value` ADD COLUMN `version` INT NOT NULL DEFAULT 1'
  )
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;
