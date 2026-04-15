ALTER TABLE `components`
  DROP INDEX `components_name_unique`;

--> statement-breakpoint

CREATE UNIQUE INDEX `components_category_name_unique`
  ON `components` (`category_id`, `name`);
