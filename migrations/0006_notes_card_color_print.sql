SET @add_note_card_color = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'note'
        AND column_name = 'card_color'
    ),
    'SELECT 1',
    'ALTER TABLE `note` ADD COLUMN `card_color` varchar(255) NULL AFTER `body`'
  )
);
PREPARE stmt_add_note_card_color FROM @add_note_card_color;
EXECUTE stmt_add_note_card_color;
DEALLOCATE PREPARE stmt_add_note_card_color;

SET @copy_note_color = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'note'
        AND column_name = 'color'
    ),
    'UPDATE `note` SET `card_color` = `color` WHERE `card_color` IS NULL AND `color` IS NOT NULL',
    'SELECT 1'
  )
);
PREPARE stmt_copy_note_color FROM @copy_note_color;
EXECUTE stmt_copy_note_color;
DEALLOCATE PREPARE stmt_copy_note_color;

SET @drop_note_color = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'note'
        AND column_name = 'color'
    ),
    'ALTER TABLE `note` DROP COLUMN `color`',
    'SELECT 1'
  )
);
PREPARE stmt_drop_note_color FROM @drop_note_color;
EXECUTE stmt_drop_note_color;
DEALLOCATE PREPARE stmt_drop_note_color;

SET @add_note_print = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'note'
        AND column_name = 'print'
    ),
    'SELECT 1',
    'ALTER TABLE `note` ADD COLUMN `print` boolean NOT NULL DEFAULT true AFTER `card_color`'
  )
);
PREPARE stmt_add_note_print FROM @add_note_print;
EXECUTE stmt_add_note_print;
DEALLOCATE PREPARE stmt_add_note_print;

SET @add_note_card_color_locked = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'note'
        AND column_name = 'card_color_locked'
    ),
    'SELECT 1',
    'ALTER TABLE `note` ADD COLUMN `card_color_locked` boolean NOT NULL DEFAULT false AFTER `print`'
  )
);
PREPARE stmt_add_note_card_color_locked FROM @add_note_card_color_locked;
EXECUTE stmt_add_note_card_color_locked;
DEALLOCATE PREPARE stmt_add_note_card_color_locked;

SET @add_note_template_card_color = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'note_template'
        AND column_name = 'card_color'
    ),
    'SELECT 1',
    'ALTER TABLE `note_template` ADD COLUMN `card_color` varchar(255) NULL AFTER `body`'
  )
);
PREPARE stmt_add_note_template_card_color FROM @add_note_template_card_color;
EXECUTE stmt_add_note_template_card_color;
DEALLOCATE PREPARE stmt_add_note_template_card_color;

SET @copy_note_template_color = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'note_template'
        AND column_name = 'color'
    ),
    'UPDATE `note_template` SET `card_color` = `color` WHERE `card_color` IS NULL AND `color` IS NOT NULL',
    'SELECT 1'
  )
);
PREPARE stmt_copy_note_template_color FROM @copy_note_template_color;
EXECUTE stmt_copy_note_template_color;
DEALLOCATE PREPARE stmt_copy_note_template_color;

SET @drop_note_template_color = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'note_template'
        AND column_name = 'color'
    ),
    'ALTER TABLE `note_template` DROP COLUMN `color`',
    'SELECT 1'
  )
);
PREPARE stmt_drop_note_template_color FROM @drop_note_template_color;
EXECUTE stmt_drop_note_template_color;
DEALLOCATE PREPARE stmt_drop_note_template_color;

SET @add_note_template_print = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'note_template'
        AND column_name = 'print'
    ),
    'SELECT 1',
    'ALTER TABLE `note_template` ADD COLUMN `print` boolean NOT NULL DEFAULT true AFTER `card_color`'
  )
);
PREPARE stmt_add_note_template_print FROM @add_note_template_print;
EXECUTE stmt_add_note_template_print;
DEALLOCATE PREPARE stmt_add_note_template_print;
