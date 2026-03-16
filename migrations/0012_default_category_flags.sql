alter table product_categories
  add column is_default boolean not null default false;

alter table component_categories
  add column is_default boolean not null default false;

update product_categories
set is_default = true
where trim(name) in ('Fass Saunen');

update component_categories
set is_default = true
where trim(name) in (
  'Dachvarianten',
  'Fenster',
  'Inneneinrichtung',
  'Öfen',
  'Rückwände',
  'Steuerungen',
  'Türen',
  'Vorderwände'
);
