CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  role_id INT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT users_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT users_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_settings_value (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(128) NOT NULL,
  scope_type VARCHAR(16) NOT NULL,
  scope_id VARCHAR(128) NOT NULL,
  value_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by BIGINT NULL,
  CONSTRAINT user_settings_value_scope_type_chk CHECK (scope_type IN ('GLOBAL', 'ROLE', 'USER')),
  CONSTRAINT user_settings_value_key_scope_unique UNIQUE (setting_key, scope_type, scope_id)
);

INSERT INTO roles (code, name, description, is_system)
VALUES
  ('READER', 'Leser', 'Lesezugriff nur. Keine Bearbeitungsrechte.', 1),
  ('DISPATCHER', 'Disponent', 'Fachliche Bearbeitung von Projekten, Terminen und Kunden.', 1),
  ('ADMIN', 'Admin', 'Vollzugriff. Systemadministration und Stammdaten.', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_system = VALUES(is_system);
