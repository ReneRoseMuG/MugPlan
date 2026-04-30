DELETE atg
FROM appointment_tags atg
INNER JOIN tags t ON t.id = atg.tag_id
WHERE lower(trim(t.name)) = lower(trim('Planung blockiert'));
--> statement-breakpoint
DELETE ptg
FROM project_tags ptg
INNER JOIN tags t ON t.id = ptg.tag_id
WHERE lower(trim(t.name)) = lower(trim('Planung blockiert'));
--> statement-breakpoint
DELETE ctg
FROM customer_tags ctg
INNER JOIN tags t ON t.id = ctg.tag_id
WHERE lower(trim(t.name)) = lower(trim('Planung blockiert'));
--> statement-breakpoint
DELETE etg
FROM employee_tags etg
INNER JOIN tags t ON t.id = etg.tag_id
WHERE lower(trim(t.name)) = lower(trim('Planung blockiert'));
--> statement-breakpoint
DELETE FROM tags
WHERE lower(trim(name)) = lower(trim('Planung blockiert'));
