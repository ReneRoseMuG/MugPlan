ALTER TABLE `appointments`
  ADD COLUMN IF NOT EXISTS `customer_id` bigint NULL,
  ADD COLUMN IF NOT EXISTS `display_mode` varchar(32) NOT NULL DEFAULT 'standard';
--> statement-breakpoint
UPDATE `appointments` a
INNER JOIN `project` p ON p.id = a.project_id
SET a.customer_id = p.customer_id
WHERE a.customer_id IS NULL;
--> statement-breakpoint
ALTER TABLE `appointments`
  MODIFY COLUMN `project_id` bigint NULL,
  MODIFY COLUMN `customer_id` bigint NOT NULL;
--> statement-breakpoint
CREATE INDEX `idx_appt_customer_start_time_id` ON `appointments` (`customer_id`,`start_date`,`start_time`,`id`);
