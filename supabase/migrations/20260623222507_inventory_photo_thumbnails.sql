alter table public.inventory_photos
add column if not exists thumbnail_storage_path text;
