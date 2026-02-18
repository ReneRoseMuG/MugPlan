-- FT02: Optionale Auftragsnummer fuer Projekte
-- Ausfuehrung: MySQL Workbench (gegen Zielschema von MugPlan)
-- Verhalten: Idempotent (Spalte wird nur angelegt, wenn sie noch nicht existiert)

SET @schema_name := DATABASE();

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @schema_name
    AND table_name = 'project'
    AND column_name = 'order_number'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE `project` ADD COLUMN `order_number` varchar(255) NULL AFTER `name`;',
  'SELECT ''SKIP: project.order_number existiert bereits'' AS message;'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verifikation
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'project'
  AND column_name = 'order_number';
