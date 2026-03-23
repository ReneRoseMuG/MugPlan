SET @has_duplicate_trimmed_tour_names := (
  SELECT EXISTS(
    SELECT 1
    FROM (
      SELECT LOWER(TRIM(`name`)) AS normalized_name
      FROM `tours`
      GROUP BY LOWER(TRIM(`name`))
      HAVING COUNT(*) > 1
    ) AS duplicate_tour_names
  )
);
SET @duplicate_tour_names_check_sql := IF(
  @has_duplicate_trimmed_tour_names = 1,
  "SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration 0014 blocked: duplicate trimmed tour names exist in tours.name';",
  "SELECT 1;"
);
PREPARE duplicate_tour_names_stmt FROM @duplicate_tour_names_check_sql;
EXECUTE duplicate_tour_names_stmt;
DEALLOCATE PREPARE duplicate_tour_names_stmt;
--> statement-breakpoint
ALTER TABLE `tours` ADD CONSTRAINT `tours_name_unique` UNIQUE(`name`);
