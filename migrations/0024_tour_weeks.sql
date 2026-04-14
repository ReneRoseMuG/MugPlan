CREATE TABLE `tour_week` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tour_id` int NOT NULL,
  `iso_year` int NOT NULL,
  `iso_week` int NOT NULL,
  `is_blocked` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tour_week_id` PRIMARY KEY (`id`),
  CONSTRAINT `fk_tour_week_tour`
    FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,
  CONSTRAINT `chk_tw_week_valid` CHECK (`iso_week` >= 1 AND `iso_week` <= 53)
);

--> statement-breakpoint

CREATE UNIQUE INDEX `uq_tw_tour_year_week`
  ON `tour_week` (`tour_id`, `iso_year`, `iso_week`);

--> statement-breakpoint

CREATE INDEX `idx_tw_tour_year_week`
  ON `tour_week` (`tour_id`, `iso_year`, `iso_week`);

--> statement-breakpoint

CREATE INDEX `idx_tw_blocked_tour_year_week`
  ON `tour_week` (`is_blocked`, `tour_id`, `iso_year`, `iso_week`);
