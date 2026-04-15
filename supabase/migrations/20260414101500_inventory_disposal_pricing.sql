alter table public.inventory_items
  add column if not exists marked_for_disposal boolean not null default false,
  add column if not exists estimated_listing_price_cents integer,
  add column if not exists replacement_cost_cents integer;

create index if not exists inventory_items_marked_for_disposal_idx on public.inventory_items(marked_for_disposal);
