create table if not exists public.job_pick_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  pack_request_id uuid references public.job_pack_requests(id) on delete set null,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  notes text,
  picked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists job_pick_items_job_item_key on public.job_pick_items(job_id, item_id);
create unique index if not exists job_pick_items_item_key on public.job_pick_items(item_id);
create index if not exists job_pick_items_job_idx on public.job_pick_items(job_id);
create index if not exists job_pick_items_pack_request_idx on public.job_pick_items(pack_request_id);

alter table public.job_pick_items enable row level security;

drop policy if exists "job_pick_items_rw_auth" on public.job_pick_items;
create policy "job_pick_items_rw_auth" on public.job_pick_items
for all to authenticated
using (true)
with check (true);

drop trigger if exists trg_job_pick_items_updated_at on public.job_pick_items;
create trigger trg_job_pick_items_updated_at
before update on public.job_pick_items
for each row execute function public.set_updated_at();
