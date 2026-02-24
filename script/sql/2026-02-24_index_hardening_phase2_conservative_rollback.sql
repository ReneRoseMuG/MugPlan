-- Rollback for 2026-02-24_index_hardening_phase2_conservative.sql

ALTER TABLE backup_log
  DROP INDEX idx_backup_status_created_id;

ALTER TABLE employee
  DROP INDEX idx_employee_active_name_id;
