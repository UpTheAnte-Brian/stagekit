create table public.job_photo_releases (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  access_token uuid not null unique default gen_random_uuid(),
  recipient_name text,
  recipient_email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'expired')),
  channels text[] not null default array['website', 'linkedin'],
  expires_at timestamptz not null default (now() + interval '30 days'),
  responded_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.job_photo_release_items (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.job_photo_releases(id) on delete cascade,
  media_id uuid not null references public.job_consult_media(id) on delete cascade,
  decision text not null default 'pending' check (decision in ('pending', 'approved', 'declined')),
  unique (release_id, media_id)
);

create index job_photo_releases_job_idx on public.job_photo_releases (job_id, created_at desc);
create index job_photo_releases_token_idx on public.job_photo_releases (access_token);
create index job_photo_release_items_release_idx on public.job_photo_release_items (release_id);

alter table public.job_photo_releases enable row level security;
alter table public.job_photo_release_items enable row level security;

create policy "job_photo_releases_auth_rw" on public.job_photo_releases for all to authenticated using (true) with check (true);
create policy "job_photo_release_items_auth_rw" on public.job_photo_release_items for all to authenticated using (true) with check (true);

comment on table public.job_photo_releases is 'Private, expiring homeowner approval links for already-shortlisted finished media.';
