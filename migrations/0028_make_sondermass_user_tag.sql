-- Datenmigration: Sondermaß ist ein frei vergebbarer Benutzer-Tag.
-- Keine Schemaänderung. Der Picker filtert Workflow-Tags über is_default=true.
UPDATE tags
SET is_default = false
WHERE name = 'Sondermaß';
