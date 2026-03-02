CREATE TABLE `appointment_tags` (
	`appointment_id` bigint NOT NULL,
	`tag_id` bigint NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `appointment_tags_appointment_id_tag_id_pk` PRIMARY KEY(`appointment_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `customer_tags` (
	`customer_id` bigint NOT NULL,
	`tag_id` bigint NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `customer_tags_customer_id_tag_id_pk` PRIMARY KEY(`customer_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `employee_tags` (
	`employee_id` bigint NOT NULL,
	`tag_id` bigint NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `employee_tags_employee_id_tag_id_pk` PRIMARY KEY(`employee_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `project_tags` (
	`project_id` bigint NOT NULL,
	`tag_id` bigint NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `project_tags_project_id_tag_id_pk` PRIMARY KEY(`project_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7) NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `appointment_tags` ADD CONSTRAINT `appointment_tags_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointment_tags` ADD CONSTRAINT `appointment_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_tags` ADD CONSTRAINT `employee_tags_employee_id_employee_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_tags` ADD CONSTRAINT `employee_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_tags` ADD CONSTRAINT `project_tags_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_tags` ADD CONSTRAINT `project_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_appointment_tags_tag_appointment` ON `appointment_tags` (`tag_id`,`appointment_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_tags_tag_customer` ON `customer_tags` (`tag_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_tags_tag_employee` ON `employee_tags` (`tag_id`,`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_project_tags_tag_project` ON `project_tags` (`tag_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `idx_tags_is_default` ON `tags` (`is_default`);