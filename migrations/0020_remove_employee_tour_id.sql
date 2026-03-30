ALTER TABLE `employee`
  DROP FOREIGN KEY `employee_tour_id_tours_id_fk`;

--> statement-breakpoint

ALTER TABLE `employee`
  DROP COLUMN `tour_id`;
