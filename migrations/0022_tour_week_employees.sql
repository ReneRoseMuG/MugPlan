CREATE TABLE `tour_week_employees` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tour_id` int NOT NULL,
  `iso_year` int NOT NULL,
  `iso_week` int NOT NULL,
  `employee_id` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `tour_week_employees_id` PRIMARY KEY (`id`),
  CONSTRAINT `fk_tour_week_employees_tour`
    FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_tour_week_employees_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,
  CONSTRAINT `chk_twe_week_valid` CHECK (`iso_week` >= 1 AND `iso_week` <= 53)
);

--> statement-breakpoint

CREATE UNIQUE INDEX `uq_twe_year_week_employee`
  ON `tour_week_employees` (`iso_year`, `iso_week`, `employee_id`);

--> statement-breakpoint

CREATE INDEX `idx_twe_tour_year_week`
  ON `tour_week_employees` (`tour_id`, `iso_year`, `iso_week`);
