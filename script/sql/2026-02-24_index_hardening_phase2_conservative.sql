-- Index hardening phase 2 (very conservative, index-only)

ALTER TABLE backup_log
  ADD INDEX idx_backup_status_created_id (status, created_at, id);

ALTER TABLE employee
  ADD INDEX idx_employee_active_name_id (is_active, last_name, first_name, id);
