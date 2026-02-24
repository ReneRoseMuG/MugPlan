-- Rollback for 2026-02-24_index_hardening.sql

ALTER TABLE appointments
  DROP INDEX idx_appt_start_date;

ALTER TABLE appointments
  DROP INDEX idx_appt_project_start_time_id;

ALTER TABLE appointments
  DROP INDEX idx_appt_tour_start_time_id;

ALTER TABLE appointment_employee
  DROP INDEX idx_ae_employee_appointment;

ALTER TABLE project
  DROP INDEX idx_project_customer_active_updated;

ALTER TABLE backup_log
  DROP INDEX idx_backup_created_id;
