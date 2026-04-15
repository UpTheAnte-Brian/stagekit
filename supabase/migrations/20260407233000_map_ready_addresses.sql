alter table public.jobs
  add column if not exists address_label text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geocoded_at timestamptz;

alter table public.locations
  add column if not exists address1 text,
  add column if not exists address2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal text,
  add column if not exists country text,
  add column if not exists address_label text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geocoded_at timestamptz;

create index if not exists jobs_lat_lng_idx on public.jobs(latitude, longitude);
create index if not exists locations_lat_lng_idx on public.locations(latitude, longitude);

update public.jobs
set address_label = concat_ws(', ', nullif(address1, ''), nullif(city, ''), nullif(state, ''), nullif(postal, ''))
where address_label is null
  and coalesce(nullif(address1, ''), nullif(city, ''), nullif(state, ''), nullif(postal, '')) is not null;

update public.locations
set address_label = concat_ws(', ', nullif(address1, ''), nullif(city, ''), nullif(state, ''), nullif(postal, ''))
where address_label is null
  and coalesce(nullif(address1, ''), nullif(city, ''), nullif(state, ''), nullif(postal, '')) is not null;
