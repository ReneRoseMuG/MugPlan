ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `two_factor_secret_encrypted` text NULL,
  ADD COLUMN IF NOT EXISTS `two_factor_backup_codes_reserved` text NULL;
