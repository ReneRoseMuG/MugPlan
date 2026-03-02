CREATE TABLE `product_categories` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `component_categories` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `component_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `component_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category_id` bigint NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `components` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category_id` bigint NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `components_id` PRIMARY KEY(`id`),
	CONSTRAINT `components_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `product_component` (
	`product_id` bigint NOT NULL,
	`component_id` bigint NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `product_component_product_id_component_id_pk` PRIMARY KEY(`product_id`,`component_id`)
);
--> statement-breakpoint
CREATE TABLE `project_order_items` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`project_id` bigint NOT NULL,
	`product_id` bigint,
	`component_id` bigint,
	`description` text,
	`quantity` int NOT NULL DEFAULT 1,
	`source` varchar(20) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_order_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_project_order_items_quantity_positive` CHECK(`project_order_items`.`quantity` > 0),
	CONSTRAINT `chk_project_order_items_source_consistent` CHECK((
      (`project_order_items`.`source` = 'product'
       AND `project_order_items`.`product_id` IS NOT NULL
       AND `project_order_items`.`component_id` IS NULL
       AND (`project_order_items`.`description` IS NULL OR char_length(trim(`project_order_items`.`description`)) = 0))
      OR
      (`project_order_items`.`source` = 'component'
       AND `project_order_items`.`component_id` IS NOT NULL
       AND `project_order_items`.`product_id` IS NULL
       AND (`project_order_items`.`description` IS NULL OR char_length(trim(`project_order_items`.`description`)) = 0))
      OR
      (`project_order_items`.`source` = 'text'
       AND `project_order_items`.`product_id` IS NULL
       AND `project_order_items`.`component_id` IS NULL
       AND `project_order_items`.`description` IS NOT NULL
       AND char_length(trim(`project_order_items`.`description`)) > 0)
    ))
);
--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_product_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `components` ADD CONSTRAINT `components_category_id_component_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `component_categories`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `product_component` ADD CONSTRAINT `product_component_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `product_component` ADD CONSTRAINT `product_component_component_id_components_id_fk` FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `project_order_items` ADD CONSTRAINT `project_order_items_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `project_order_items` ADD CONSTRAINT `project_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `project_order_items` ADD CONSTRAINT `project_order_items_component_id_components_id_fk` FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_pc_component_product` ON `product_component` (`component_id`,`product_id`);
--> statement-breakpoint
CREATE INDEX `idx_order_items_project` ON `project_order_items` (`project_id`);
