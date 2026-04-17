create table if not exists public.scene_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  room_type text,
  style_label text,
  summary text,
  notes text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scene_templates_active_idx on public.scene_templates(active);
create index if not exists scene_templates_sort_idx on public.scene_templates(sort_order, created_at desc);

create table if not exists public.scene_template_items (
  id uuid primary key default gen_random_uuid(),
  scene_template_id uuid not null references public.scene_templates(id) on delete cascade,
  sort_order integer not null default 0,
  request_text text not null,
  quantity integer not null default 1 check (quantity > 0),
  category text,
  color text,
  notes text,
  optional boolean not null default false,
  is_anchor boolean not null default false,
  requested_item_id uuid references public.inventory_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scene_template_items_template_idx on public.scene_template_items(scene_template_id, sort_order, created_at);
create index if not exists scene_template_items_item_idx on public.scene_template_items(requested_item_id);

create table if not exists public.job_scene_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  scene_template_id uuid not null references public.scene_templates(id) on delete restrict,
  room_label text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_scene_applications_job_idx on public.job_scene_applications(job_id, created_at desc);
create index if not exists job_scene_applications_template_idx on public.job_scene_applications(scene_template_id);

alter table public.job_pack_requests
  add column if not exists scene_application_id uuid,
  add column if not exists scene_template_item_id uuid;

do $$ begin
  alter table public.job_pack_requests
    add constraint job_pack_requests_scene_application_id_fkey
    foreign key (scene_application_id)
    references public.job_scene_applications(id)
    on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.job_pack_requests
    add constraint job_pack_requests_scene_template_item_id_fkey
    foreign key (scene_template_item_id)
    references public.scene_template_items(id)
    on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists job_pack_requests_scene_application_idx on public.job_pack_requests(scene_application_id);
create index if not exists job_pack_requests_scene_template_item_idx on public.job_pack_requests(scene_template_item_id);

alter table public.scene_templates enable row level security;
alter table public.scene_template_items enable row level security;
alter table public.job_scene_applications enable row level security;

drop policy if exists "scene_templates_rw_auth" on public.scene_templates;
create policy "scene_templates_rw_auth" on public.scene_templates
for all to authenticated
using (true)
with check (true);

drop policy if exists "scene_template_items_rw_auth" on public.scene_template_items;
create policy "scene_template_items_rw_auth" on public.scene_template_items
for all to authenticated
using (true)
with check (true);

drop policy if exists "job_scene_applications_rw_auth" on public.job_scene_applications;
create policy "job_scene_applications_rw_auth" on public.job_scene_applications
for all to authenticated
using (true)
with check (true);

drop trigger if exists trg_scene_templates_updated_at on public.scene_templates;
create trigger trg_scene_templates_updated_at
before update on public.scene_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_scene_template_items_updated_at on public.scene_template_items;
create trigger trg_scene_template_items_updated_at
before update on public.scene_template_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_job_scene_applications_updated_at on public.job_scene_applications;
create trigger trg_job_scene_applications_updated_at
before update on public.job_scene_applications
for each row execute function public.set_updated_at();

do $$
declare
  bedroom_template_id uuid;
  dining_template_id uuid;
begin
  insert into public.scene_templates (
    slug,
    name,
    room_type,
    style_label,
    summary,
    notes,
    sort_order
  )
  values (
    'bedroom-fresh-green',
    'Fresh Green Bedroom',
    'Primary Bedroom',
    'Soft organic',
    'A calm bedroom recipe built around soft white bedding, layered green pillows, matching nightstands, and balanced lamps and art.',
    'Starter template based on a frequently repeated bed wall composition.',
    10
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    room_type = excluded.room_type,
    style_label = excluded.style_label,
    summary = excluded.summary,
    notes = excluded.notes,
    sort_order = excluded.sort_order,
    active = true
  returning id into bedroom_template_id;

  if not exists (
    select 1
    from public.scene_template_items
    where scene_template_id = bedroom_template_id
  ) then
    insert into public.scene_template_items (
      scene_template_id,
      sort_order,
      request_text,
      quantity,
      category,
      color,
      notes,
      optional,
      is_anchor
    )
    values
      (bedroom_template_id, 10, 'upholstered bed', 1, 'bed', 'gray', 'Use a clean-lined queen or king bed with a simple upholstered profile.', false, true),
      (bedroom_template_id, 20, 'white duvet or coverlet', 1, 'bedding', 'white', 'Keep the bed bright and hotel-like.', false, false),
      (bedroom_template_id, 30, 'euro or sleeping pillows', 2, 'pillow', 'white', 'Use larger back pillows for volume.', false, false),
      (bedroom_template_id, 40, 'accent pillows', 2, 'pillow', 'green', 'Velvet or soft-texture pillows in a muted sage tone.', false, false),
      (bedroom_template_id, 50, 'textured lumbar pillow', 1, 'pillow', 'cream', 'A smaller front pillow adds depth without clutter.', true, false),
      (bedroom_template_id, 60, 'bedside table', 2, 'nightstand', 'light wood', 'Matching tables keep the composition symmetrical.', false, false),
      (bedroom_template_id, 70, 'table lamp', 2, 'lamp', 'black and white', 'Rounded dark base with white shade is a close fit.', false, false),
      (bedroom_template_id, 80, 'oversized art above bed', 1, 'art', 'green', 'Wide landscape art with muted green or neutral tones.', false, false),
      (bedroom_template_id, 90, 'small bedside plant', 1, 'plant', 'green', 'Optional organic accent for one nightstand.', true, false);
  end if;

  insert into public.scene_templates (
    slug,
    name,
    room_type,
    style_label,
    summary,
    notes,
    sort_order
  )
  values (
    'dining-neutral-gathering',
    'Neutral Dining Gathering',
    'Dining Room',
    'Warm minimal',
    'A warm dining setup centered on a dark rectangular table, light upholstered seating, and simple tabletop styling.',
    'Starter template based on a repeated staged dining composition.',
    20
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    room_type = excluded.room_type,
    style_label = excluded.style_label,
    summary = excluded.summary,
    notes = excluded.notes,
    sort_order = excluded.sort_order,
    active = true
  returning id into dining_template_id;

  if not exists (
    select 1
    from public.scene_template_items
    where scene_template_id = dining_template_id
  ) then
    insert into public.scene_template_items (
      scene_template_id,
      sort_order,
      request_text,
      quantity,
      category,
      color,
      notes,
      optional,
      is_anchor
    )
    values
      (dining_template_id, 10, 'rectangular dining table', 1, 'table', 'dark wood', 'A substantial dark table anchors the scene.', false, true),
      (dining_template_id, 20, 'upholstered dining chair', 4, 'chair', 'light neutral', 'Use four matching chairs to keep the layout clean.', false, false),
      (dining_template_id, 30, 'woven placemat', 4, 'tabletop', 'natural', 'Round woven placemats soften the dark tabletop.', false, false),
      (dining_template_id, 40, 'white dinner plate', 4, 'tabletop', 'white', 'Simple layered place settings work well here.', false, false),
      (dining_template_id, 50, 'cloth napkin', 4, 'tabletop', 'white', 'Keep napkins loose and relaxed instead of formal folds.', true, false),
      (dining_template_id, 60, 'ceramic vase set', 2, 'decor', 'warm neutral', 'Mix heights for the center styling.', false, false),
      (dining_template_id, 70, 'greenery stems', 1, 'floral', 'green', 'Eucalyptus or similar soft greenery keeps the palette fresh.', false, false),
      (dining_template_id, 80, 'round wall mirror', 1, 'mirror', 'black', 'Optional mirror or wall piece helps finish the vignette.', true, false);
  end if;
end
$$;
