create table if not exists public.job_pack_requests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  requested_item_id uuid references public.inventory_items(id) on delete set null,
  request_text text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  room text,
  category text,
  color text,
  notes text,
  optional boolean not null default false,
  status text not null default 'requested',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_pack_requests_status_check check (status in ('requested', 'packed', 'cancelled'))
);

create index if not exists job_pack_requests_job_idx on public.job_pack_requests(job_id);
create index if not exists job_pack_requests_status_idx on public.job_pack_requests(status);
create index if not exists job_pack_requests_item_idx on public.job_pack_requests(requested_item_id);

alter table public.job_pack_requests enable row level security;

drop policy if exists "job_pack_requests_rw_auth" on public.job_pack_requests;
create policy "job_pack_requests_rw_auth" on public.job_pack_requests
for all to authenticated
using (true)
with check (true);

drop trigger if exists trg_job_pack_requests_updated_at on public.job_pack_requests;
create trigger trg_job_pack_requests_updated_at
before update on public.job_pack_requests
for each row execute function public.set_updated_at();
