delete from project_order_items
where product_id is null
  and component_id is null;

alter table project_order_items
  drop check chk_project_order_items_relation_consistent;

alter table project_order_items
  drop column description;

alter table project_order_items
  add constraint chk_project_order_items_relation_consistent
  check (
    (
      (product_id is not null and component_id is null)
      or (product_id is null and component_id is not null)
    )
    and (specification_id is null or component_id is not null)
  );
