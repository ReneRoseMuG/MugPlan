CREATE TABLE `calendar_week_note` (
  `id` bigint AUTO_INCREMENT PRIMARY KEY,
  `note_id` bigint NOT NULL,
  `year_number` int NOT NULL,
  `week_number` int NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT now(),
  `updated_at` timestamp NOT NULL DEFAULT now() ON UPDATE now(),
  CONSTRAINT `fk_cwn_note`
    FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE CASCADE,
  CONSTRAINT `uq_cwn_note_week`
    UNIQUE (`note_id`, `year_number`, `week_number`),
  CONSTRAINT `chk_cwn_week_valid`
    CHECK (`week_number` >= 1 AND `week_number` <= 53)
);

CREATE INDEX `idx_cwn_year_week`
  ON `calendar_week_note` (`year_number`, `week_number`);
