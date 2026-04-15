with warehouse as (
  insert into public.locations (name, kind, notes)
  values ('Warehouse', 'warehouse', 'Primary staging warehouse')
  returning id
)
insert into public.inventory_items (
  sku,
  name,
  category,
  status,
  condition,
  current_location_id,
  home_location_id
)
select
  seed.sku,
  seed.name,
  seed.category,
  'available'::public.inventory_item_status,
  'good'::public.inventory_condition,
  warehouse.id,
  warehouse.id
from warehouse
cross join (
  values
    ('CHAIR-001', 'Cream Accent Chair', 'chair'),
    ('OTTO-001', 'Striped Ottoman', 'ottoman'),
    ('PLANT-001', 'Topiary Plant', 'plant')
) as seed(sku, name, category);
