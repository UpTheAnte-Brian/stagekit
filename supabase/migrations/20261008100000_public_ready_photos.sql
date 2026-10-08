-- Public-ready photos are intentionally separate from project media and homeowner releases.
create table if not exists public.public_ready_photos (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'public-ready-photos',
  storage_path text not null,
  file_name text not null,
  content_type text,
  file_size_bytes bigint,
  source text not null default 'other' check (source in ('godaddy', 'zillow_sold', 'other')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists public_ready_photos_created_at_idx on public.public_ready_photos(created_at desc);

alter table public.public_ready_photos enable row level security;

create policy "public_ready_photos_rw_auth" on public.public_ready_photos
for all to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-ready-photos', 'public-ready-photos', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/heic', 'image/heif'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public_ready_photos_bucket_read_auth" on storage.objects for select to authenticated using (bucket_id = 'public-ready-photos');
create policy "public_ready_photos_bucket_insert_auth" on storage.objects for insert to authenticated with check (bucket_id = 'public-ready-photos');
create policy "public_ready_photos_bucket_delete_auth" on storage.objects for delete to authenticated using (bucket_id = 'public-ready-photos');

comment on table public.public_ready_photos is 'Images cleared for public use without a project association or homeowner approval workflow.';
