ALTER TABLE `calendar_week_note`
  ADD COLUMN `tour_id` int NULL,
  ADD CONSTRAINT `fk_cwn_tour`
    FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON DELETE SET NULL;

ALTER TABLE `calendar_week_note`
  ADD CONSTRAINT `uq_cwn_note_year_week_tour`
    UNIQUE (`note_id`, `year_number`, `week_number`, `tour_id`);

DROP INDEX `uq_cwn_note_week` ON `calendar_week_note`;

CREATE INDEX `idx_cwn_year_week_tour`
  ON `calendar_week_note` (`year_number`, `week_number`, `tour_id`);
