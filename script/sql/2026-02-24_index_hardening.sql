-- Index hardening migration (index-only, backward compatible)

ALTER TABLE appointments
  ADD INDEX idx_appt_start_date (start_date);

ALTER TABLE appointments
  ADD INDEX idx_appt_project_start_time_id (project_id, start_date, start_time, id);

ALTER TABLE appointments
  ADD INDEX idx_appt_tour_start_time_id (tour_id, start_date, start_time, id);

ALTER TABLE appointment_employee
  ADD INDEX idx_ae_employee_appointment (employee_id, appointment_id);

ALTER TABLE project
  ADD INDEX idx_project_customer_active_updated (customer_id, is_active, updated_at);

ALTER TABLE backup_log
  ADD INDEX idx_backup_created_id (created_at, id);
