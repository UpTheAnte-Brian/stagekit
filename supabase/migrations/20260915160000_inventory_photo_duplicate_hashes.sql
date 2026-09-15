alter table public.inventory_photos
  add column if not exists exact_sha1 text;
create index if not exists inventory_photos_exact_sha1_idx
  on public.inventory_photos (exact_sha1) where exact_sha1 is not null;

-- A replacement file must be scanned again before it can be compared.
create or replace function public.clear_inventory_photo_hash() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.storage_path is distinct from old.storage_path
     or new.storage_bucket is distinct from old.storage_bucket then
    new.exact_sha1 := null;
  end if;
  return new;
end;
$$;
create trigger clear_inventory_photo_hash_on_replacement
before update on public.inventory_photos
for each row execute function public.clear_inventory_photo_hash();
