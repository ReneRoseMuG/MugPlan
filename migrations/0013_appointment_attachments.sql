CREATE TABLE `appointment_attachment` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`appointment_id` bigint NOT NULL,
	`filename` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime_type` varchar(255) NOT NULL,
	`file_size` int NOT NULL,
	`storage_path` varchar(500) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `appointment_attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointment_attachment` ADD CONSTRAINT `appointment_attachment_appointment_id_appointment_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;
