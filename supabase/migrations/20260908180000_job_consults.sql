-- On-site staging consults are the working record created before pack requests.
create table if not exists public.job_consults (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  title text not null default 'On-site consult',
  occurred_at timestamptz not null default now(),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_consults_job_idx on public.job_consults(job_id);
create index if not exists job_consults_occurred_at_idx on public.job_consults(occurred_at desc);

create table if not exists public.job_consult_media (
  id uuid primary key default gen_random_uuid(),
  consult_id uuid not null references public.job_consults(id) on delete cascade,
  storage_bucket text not null default 'job-consults',
  storage_path text not null,
  file_name text not null,
  content_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists job_consult_media_consult_idx on public.job_consult_media(consult_id);

alter table public.job_consults enable row level security;
alter table public.job_consult_media enable row level security;

drop policy if exists "job_consults_rw_auth" on public.job_consults;
create policy "job_consults_rw_auth" on public.job_consults
for all to authenticated
using (true)
with check (true);

drop policy if exists "job_consult_media_rw_auth" on public.job_consult_media;
create policy "job_consult_media_rw_auth" on public.job_consult_media
for all to authenticated
using (true)
with check (true);

drop trigger if exists trg_job_consults_updated_at on public.job_consults;
create trigger trg_job_consults_updated_at
before update on public.job_consults
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('job-consults', 'job-consults', false)
on conflict (id) do nothing;

drop policy if exists "job_consults_bucket_read_auth" on storage.objects;
create policy "job_consults_bucket_read_auth"
on storage.objects for select
to authenticated
using (bucket_id = 'job-consults');

drop policy if exists "job_consults_bucket_insert_auth" on storage.objects;
create policy "job_consults_bucket_insert_auth"
on storage.objects for insert
to authenticated
with check (bucket_id = 'job-consults');

drop policy if exists "job_consults_bucket_update_auth" on storage.objects;
create policy "job_consults_bucket_update_auth"
on storage.objects for update
to authenticated
using (bucket_id = 'job-consults');

drop policy if exists "job_consults_bucket_delete_auth" on storage.objects;
create policy "job_consults_bucket_delete_auth"
on storage.objects for delete
to authenticated
using (bucket_id = 'job-consults');
