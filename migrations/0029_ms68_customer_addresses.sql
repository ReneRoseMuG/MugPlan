CREATE TABLE `address_category` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `role_key` varchar(32) NULL,
  `is_protected` boolean NOT NULL DEFAULT false,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `address_category_id` PRIMARY KEY (`id`)
);

--> statement-breakpoint

CREATE UNIQUE INDEX `uq_address_category_name` ON `address_category` (`name`);

--> statement-breakpoint

CREATE UNIQUE INDEX `uq_address_category_role` ON `address_category` (`role_key`);

--> statement-breakpoint

CREATE TABLE `customer_address` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  `address_line1` varchar(255) NULL,
  `address_line2` varchar(255) NULL,
  `postal_code` varchar(255) NULL,
  `city` varchar(255) NULL,
  `country` varchar(255) NULL,
  `version` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `customer_address_id` PRIMARY KEY (`id`),
  CONSTRAINT `fk_customer_address_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_customer_address_category`
    FOREIGN KEY (`category_id`) REFERENCES `address_category`(`id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
);

--> statement-breakpoint

CREATE UNIQUE INDEX `uq_customer_address_customer_category`
  ON `customer_address` (`customer_id`, `category_id`);

--> statement-breakpoint

CREATE INDEX `idx_customer_address_customer`
  ON `customer_address` (`customer_id`);

--> statement-breakpoint

CREATE INDEX `idx_customer_address_category`
  ON `customer_address` (`category_id`);

--> statement-breakpoint

INSERT IGNORE INTO `address_category`
  (`name`, `role_key`, `is_protected`, `sort_order`, `is_active`, `version`)
VALUES
  ('Rechnungsadresse', 'BILLING', true, 1, true, 1),
  ('Lieferadresse', 'DELIVERY', true, 2, true, 1);

--> statement-breakpoint

INSERT INTO `customer_address`
  (`customer_id`, `category_id`, `address_line1`, `address_line2`, `postal_code`, `city`, `country`, `version`, `created_at`, `updated_at`)
SELECT
  c.`id`,
  (SELECT `id` FROM `address_category` WHERE `role_key` = 'BILLING' LIMIT 1),
  c.`address_line1`,
  c.`address_line2`,
  c.`postal_code`,
  c.`city`,
  c.`country`,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `customer` c
WHERE NOT EXISTS (
  SELECT 1 FROM `customer_address` ca
  WHERE ca.`customer_id` = c.`id`
    AND ca.`category_id` = (SELECT `id` FROM `address_category` WHERE `role_key` = 'BILLING' LIMIT 1)
);
