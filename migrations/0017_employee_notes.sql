CREATE TABLE `employee_note` (
  `employee_id` bigint NOT NULL,
  `note_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  CONSTRAINT `employee_note_employee_id_fk`
    FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_note_note_id_fk`
    FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_note_employee_id_note_id_pk`
    PRIMARY KEY (`employee_id`, `note_id`)
);
