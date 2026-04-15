-- Create the bucket
insert into storage.buckets (id, name, public)
values ('inventory','inventory', false)
on conflict (id) do nothing;

-- Storage RLS policies
-- Allow authenticated users to CRUD objects in this bucket
create policy "inventory_bucket_read_auth"
on storage.objects for select
to authenticated
using (bucket_id = 'inventory');

create policy "inventory_bucket_insert_auth"
on storage.objects for insert
to authenticated
with check (bucket_id = 'inventory');

create policy "inventory_bucket_update_auth"
on storage.objects for update
to authenticated
using (bucket_id = 'inventory');

create policy "inventory_bucket_delete_auth"
on storage.objects for delete
to authenticated
using (bucket_id = 'inventory');
