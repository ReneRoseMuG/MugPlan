CREATE TABLE IF NOT EXISTS `seed_run` (
  `id` varchar(36) NOT NULL,
  `config_json` json NOT NULL,
  `summary_json` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `seed_run_entity` (
  `seed_run_id` varchar(36) NOT NULL,
  `entity_type` varchar(64) NOT NULL,
  `entity_id` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`seed_run_id`, `entity_type`, `entity_id`),
  KEY `seed_run_entity_seed_run_idx` (`seed_run_id`),
  KEY `seed_run_entity_entity_idx` (`entity_type`, `entity_id`),
  CONSTRAINT `seed_run_entity_seed_run_fk`
    FOREIGN KEY (`seed_run_id`) REFERENCES `seed_run` (`id`) ON DELETE CASCADE
);
