CREATE TABLE IF NOT EXISTS `employee_absence` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `employee_id` bigint NOT NULL,
  `type` enum('vacation','sick') NOT NULL,
  `from_date` date NOT NULL,
  `until_date` date NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `employee_absence_id` PRIMARY KEY(`id`),
  CONSTRAINT `employee_absence_employee_id_employee_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON DELETE cascade
);

CREATE INDEX `idx_employee_absence_employee_from_until_id`
  ON `employee_absence` (`employee_id`, `from_date`, `until_date`, `id`);
