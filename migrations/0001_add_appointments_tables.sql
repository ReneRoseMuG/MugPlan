CREATE TABLE appointments (
  id bigint NOT NULL AUTO_INCREMENT,
  project_id bigint NOT NULL,
  tour_id int DEFAULT NULL,
  title varchar(255) NOT NULL,
  description text,
  start_date date NOT NULL,
  start_time time DEFAULT NULL,
  end_date date DEFAULT NULL,
  end_time time DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_appointments_project (project_id),
  KEY fk_appointments_tour (tour_id),
  CONSTRAINT fk_appointments_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_tour FOREIGN KEY (tour_id) REFERENCES tours (id) ON DELETE SET NULL ON UPDATE RESTRICT
);

CREATE TABLE appointment_employee (
  appointment_id bigint NOT NULL,
  employee_id bigint NOT NULL,
  PRIMARY KEY (appointment_id, employee_id),
  KEY fk_ae_employee (employee_id),
  CONSTRAINT fk_ae_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
  CONSTRAINT fk_ae_employee FOREIGN KEY (employee_id) REFERENCES employee (id) ON DELETE CASCADE
);
