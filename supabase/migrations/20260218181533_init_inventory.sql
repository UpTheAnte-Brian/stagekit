-- Extensions
create extension if not exists "pgcrypto";

-- 1) Enums
do $$ begin
  create type public.inventory_item_status as enum ('available','on_job','packed','maintenance','sold','lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_condition as enum ('new','like_new','good','fair','rough');
exception when duplicate_object then null; end $$;

-- 2) Core tables
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'warehouse', -- warehouse | unit | truck | client | other
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address1 text,
  address2 text,
  city text,
  state text,
  postal text,
  start_date date,
  end_date date,
  status text not null default 'active', -- active | completed | cancelled
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique, -- optional human-friendly id like CHAIR-001
  name text not null,
  brand text,
  category text,        -- chair | ottoman | plant | art | rug | etc
  color text,
  material text,
  dimensions text,      -- freeform for v1 (e.g. 30"W x 34"D x 32"H)
  status public.inventory_item_status not null default 'available',
  condition public.inventory_condition not null default 'good',
  purchase_price_cents integer,
  purchase_date date,
  notes text,
  home_location_id uuid references public.locations(id) on delete set null,
  current_location_id uuid references public.locations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_category_idx on public.inventory_items(category);
create index if not exists inventory_items_status_idx on public.inventory_items(status);

-- 3) Photos metadata (actual files in Storage)
create table if not exists public.inventory_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  storage_bucket text not null default 'inventory',
  storage_path text not null, -- e.g. items/<itemId>/<photoId>.jpg
  sort_order int not null default 0,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_photos_item_idx on public.inventory_photos(item_id);

-- 4) Item ↔ job assignments (check-out / check-in)
create table if not exists public.job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  checked_out_at timestamptz not null default now(),
  checked_out_by uuid references auth.users(id) on delete set null,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id) on delete set null,
  notes text,
  unique(job_id, item_id, checked_out_at)
);

create index if not exists job_items_job_idx on public.job_items(job_id);
create index if not exists job_items_item_idx on public.job_items(item_id);

-- 5) Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
create trigger trg_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

-- 6) Minimal access control model
-- We’ll start with: any authenticated user can manage everything (single-tenant).
-- Later: add organizations/teams.

alter table public.locations enable row level security;
alter table public.jobs enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_photos enable row level security;
alter table public.job_items enable row level security;

-- Helper: auth required
create policy "locations_rw_auth" on public.locations
for all to authenticated
using (true)
with check (true);

create policy "jobs_rw_auth" on public.jobs
for all to authenticated
using (true)
with check (true);

create policy "items_rw_auth" on public.inventory_items
for all to authenticated
using (true)
with check (true);

create policy "photos_rw_auth" on public.inventory_photos
for all to authenticated
using (true)
with check (true);

create policy "job_items_rw_auth" on public.job_items
for all to authenticated
using (true)
with check (true);

-- Public read option (optional): keep OFF for now
-- If you later want a public catalog view, we can add a read-only policy.
