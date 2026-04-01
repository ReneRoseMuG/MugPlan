ALTER TABLE `customer`
  ADD COLUMN `country` varchar(255) NULL AFTER `city`;

--> statement-breakpoint

UPDATE `customer`
SET `country` = 'Deutschland'
WHERE `country` IS NULL;
