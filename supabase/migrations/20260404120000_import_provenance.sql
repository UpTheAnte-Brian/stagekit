alter table public.inventory_items
  add column if not exists import_source_path text,
  add column if not exists import_source_asset_key text,
  add column if not exists import_group_key text,
  add column if not exists import_review_notes text;

create index if not exists inventory_items_import_source_path_idx on public.inventory_items(import_source_path);
create index if not exists inventory_items_import_group_key_idx on public.inventory_items(import_group_key);
