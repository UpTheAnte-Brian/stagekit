create sequence if not exists public.inventory_item_code_seq start 1001;

create or replace function public.next_inventory_item_code()
returns text as $$
begin
  return 'SK-' || lpad(nextval('public.inventory_item_code_seq')::text, 5, '0');
end;
$$ language plpgsql;

create table if not exists public.intake_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  job_id uuid references public.jobs(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.intake_batches enable row level security;

create policy "intake_batches_rw_auth" on public.intake_batches
for all to authenticated
using (true)
with check (true);

alter table public.inventory_items
  add column if not exists item_code text,
  add column if not exists room text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists intake_batch_id uuid references public.intake_batches(id) on delete set null,
  add column if not exists source_job_id uuid references public.jobs(id) on delete set null;

alter table public.inventory_items
  alter column item_code set default public.next_inventory_item_code();

update public.inventory_items
set item_code = public.next_inventory_item_code()
where item_code is null;

alter table public.inventory_items
  alter column item_code set not null;

create unique index if not exists inventory_items_item_code_key on public.inventory_items(item_code);
create index if not exists inventory_items_room_idx on public.inventory_items(room);
create index if not exists inventory_items_source_job_idx on public.inventory_items(source_job_id);
create index if not exists inventory_items_intake_batch_idx on public.inventory_items(intake_batch_id);
create index if not exists inventory_items_current_location_idx on public.inventory_items(current_location_id);
create index if not exists inventory_items_tags_gin_idx on public.inventory_items using gin(tags);
create index if not exists intake_batches_job_idx on public.intake_batches(job_id);

create unique index if not exists job_items_active_assignment_idx
on public.job_items(job_id, item_id)
where checked_in_at is null;
