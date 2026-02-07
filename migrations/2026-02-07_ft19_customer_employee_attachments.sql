CREATE TABLE `customer_attachment` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(255) NOT NULL,
  `file_size` int NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customer_attachment_customer_id_customer_id_fk` (`customer_id`),
  CONSTRAINT `customer_attachment_customer_id_customer_id_fk`
    FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`) ON DELETE CASCADE
);

CREATE TABLE `employee_attachment` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_id` bigint NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(255) NOT NULL,
  `file_size` int NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_attachment_employee_id_employee_id_fk` (`employee_id`),
  CONSTRAINT `employee_attachment_employee_id_employee_id_fk`
    FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
);
