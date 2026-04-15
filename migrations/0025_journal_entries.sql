CREATE TABLE `journal_entry` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `table_name` varchar(64) NOT NULL,
  `record_id` bigint,
  `record_key` varchar(255),
  `op` varchar(32) NOT NULL,
  `field_name` varchar(128),
  `old_value` json,
  `new_value` json,
  `snapshot` json,
  `actor_user_id` bigint,
  `actor_name` varchar(255),
  `trigger_key` varchar(128),
  `message_text` text NOT NULL,
  `is_raw` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `journal_entry_id` PRIMARY KEY (`id`)
);

--> statement-breakpoint

CREATE INDEX `idx_journal_entry_created_id`
  ON `journal_entry` (`created_at`, `id`);

--> statement-breakpoint

CREATE INDEX `idx_journal_entry_table_record_created`
  ON `journal_entry` (`table_name`, `record_id`, `created_at`);

--> statement-breakpoint

CREATE INDEX `idx_journal_entry_table_record_key_created`
  ON `journal_entry` (`table_name`, `record_key`, `created_at`);

--> statement-breakpoint

CREATE INDEX `idx_journal_entry_actor_created`
  ON `journal_entry` (`actor_user_id`, `created_at`);

--> statement-breakpoint

CREATE INDEX `idx_journal_entry_trigger_created`
  ON `journal_entry` (`trigger_key`, `created_at`);

--> statement-breakpoint

CREATE TABLE `journal_entry_context` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `entry_id` bigint NOT NULL,
  `context_table` varchar(64) NOT NULL,
  `context_id` bigint,
  `context_key` varchar(255),
  `relation_role` varchar(64),
  CONSTRAINT `journal_entry_context_id` PRIMARY KEY (`id`),
  CONSTRAINT `fk_journal_context_entry`
    FOREIGN KEY (`entry_id`) REFERENCES `journal_entry`(`id`) ON DELETE CASCADE
);

--> statement-breakpoint

CREATE INDEX `idx_journal_context_entry`
  ON `journal_entry_context` (`entry_id`);

--> statement-breakpoint

CREATE INDEX `idx_journal_context_lookup`
  ON `journal_entry_context` (`context_table`, `context_id`, `entry_id`);

--> statement-breakpoint

CREATE INDEX `idx_journal_context_key_lookup`
  ON `journal_entry_context` (`context_table`, `context_key`, `entry_id`);
