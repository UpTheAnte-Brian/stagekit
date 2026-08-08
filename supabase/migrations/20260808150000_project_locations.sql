-- Keep a shared physical location for every project, so inventory can track
-- both the project assignment and the house where the item is sitting.
alter table public.locations
  add column if not exists source_job_id uuid references public.jobs(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'locations_source_job_id_key'
      and conrelid = 'public.locations'::regclass
  ) then
    alter table public.locations
      add constraint locations_source_job_id_key unique (source_job_id);
  end if;
end;
$$;

create or replace function public.sync_project_location()
returns trigger as $$
begin
  insert into public.locations (
    source_job_id,
    name,
    kind,
    address1,
    address2,
    city,
    state,
    postal,
    address_label,
    latitude,
    longitude,
    geocoded_at
  )
  values (
    new.id,
    new.name,
    'project',
    new.address1,
    new.address2,
    new.city,
    new.state,
    new.postal,
    coalesce(nullif(new.address_label, ''), concat_ws(', ', new.address1, new.city, new.state, new.postal)),
    new.latitude,
    new.longitude,
    new.geocoded_at
  )
  on conflict (source_job_id) do update
  set
    name = excluded.name,
    kind = excluded.kind,
    address1 = excluded.address1,
    address2 = excluded.address2,
    city = excluded.city,
    state = excluded.state,
    postal = excluded.postal,
    address_label = excluded.address_label,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    geocoded_at = excluded.geocoded_at;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_project_location on public.jobs;
create trigger trg_sync_project_location
after insert or update of name, address1, address2, city, state, postal, address_label, latitude, longitude, geocoded_at
on public.jobs
for each row
execute function public.sync_project_location();

-- Existing projects need locations too. The app only offers locations linked
-- to active projects in its Current Location control.
insert into public.locations (
  source_job_id,
  name,
  kind,
  address1,
  address2,
  city,
  state,
  postal,
  address_label,
  latitude,
  longitude,
  geocoded_at
)
select
  id,
  name,
  'project',
  address1,
  address2,
  city,
  state,
  postal,
  coalesce(nullif(address_label, ''), concat_ws(', ', address1, city, state, postal)),
  latitude,
  longitude,
  geocoded_at
from public.jobs
on conflict (source_job_id) do update
set
  name = excluded.name,
  kind = excluded.kind,
  address1 = excluded.address1,
  address2 = excluded.address2,
  city = excluded.city,
  state = excluded.state,
  postal = excluded.postal,
  address_label = excluded.address_label,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  geocoded_at = excluded.geocoded_at;
