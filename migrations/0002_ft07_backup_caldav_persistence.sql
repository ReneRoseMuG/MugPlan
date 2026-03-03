ALTER TABLE `appointments`
  ADD COLUMN IF NOT EXISTS `external_event_id` varchar(255) NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `calendar_sync_log` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `appointment_id` bigint NULL,
  `action` varchar(32) NOT NULL,
  `status` varchar(16) NOT NULL,
  `message` text NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `calendar_sync_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_sync_appointment_created` ON `calendar_sync_log` (`appointment_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_calendar_sync_status_created` ON `calendar_sync_log` (`status`,`created_at`);
