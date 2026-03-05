-- FT01: Termin-Notizen als eigene Join-Tabelle appointment_note
-- Ausfuehrung: MySQL Workbench (gegen Zielschema von MugPlan)
-- Verhalten: Idempotent (Tabelle/FKs/Index werden nur angelegt, wenn sie fehlen)

SET @schema_name := DATABASE();

CREATE TABLE IF NOT EXISTS `appointment_note` (
  `appointment_id` bigint NOT NULL,
  `note_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `appointment_note_appointment_id_note_id_pk` PRIMARY KEY (`appointment_id`, `note_id`)
);

SET @fk_appointment_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = @schema_name
    AND table_name = 'appointment_note'
    AND constraint_name = 'appointment_note_appointment_id_appointments_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);

SET @ddl_fk_appointment := IF(
  @fk_appointment_exists = 0,
  'ALTER TABLE `appointment_note` ADD CONSTRAINT `appointment_note_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;',
  'SELECT ''SKIP: FK appointment_note -> appointments existiert bereits'' AS message;'
);
PREPARE stmt_fk_appointment FROM @ddl_fk_appointment;
EXECUTE stmt_fk_appointment;
DEALLOCATE PREPARE stmt_fk_appointment;

SET @fk_note_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = @schema_name
    AND table_name = 'appointment_note'
    AND constraint_name = 'appointment_note_note_id_note_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);

SET @ddl_fk_note := IF(
  @fk_note_exists = 0,
  'ALTER TABLE `appointment_note` ADD CONSTRAINT `appointment_note_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE cascade ON UPDATE no action;',
  'SELECT ''SKIP: FK appointment_note -> note existiert bereits'' AS message;'
);
PREPARE stmt_fk_note FROM @ddl_fk_note;
EXECUTE stmt_fk_note;
DEALLOCATE PREPARE stmt_fk_note;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'appointment_note'
    AND index_name = 'idx_an_note_appointment'
);

SET @ddl_idx := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_an_note_appointment` ON `appointment_note` (`note_id`, `appointment_id`);',
  'SELECT ''SKIP: Index idx_an_note_appointment existiert bereits'' AS message;'
);
PREPARE stmt_idx FROM @ddl_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- Verifikation
SELECT
  t.table_name,
  c.column_name,
  c.column_type,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
INNER JOIN information_schema.columns c
  ON c.table_schema = t.table_schema
 AND c.table_name = t.table_name
WHERE t.table_schema = DATABASE()
  AND t.table_name = 'appointment_note'
ORDER BY c.ordinal_position;

SELECT
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = DATABASE()
  AND tc.table_name = 'appointment_note'
ORDER BY tc.constraint_name;

SELECT
  s.index_name,
  GROUP_CONCAT(s.column_name ORDER BY s.seq_in_index) AS columns_in_index
FROM information_schema.statistics s
WHERE s.table_schema = DATABASE()
  AND s.table_name = 'appointment_note'
GROUP BY s.index_name
ORDER BY s.index_name;
