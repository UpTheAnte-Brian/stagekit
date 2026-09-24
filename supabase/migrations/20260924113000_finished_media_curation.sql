-- Curation is internal only. A candidate is not public and is not a homeowner release.
alter table public.job_consult_media
  add column if not exists portfolio_candidate boolean not null default false,
  add column if not exists portfolio_cover boolean not null default false;

create index if not exists job_consult_media_portfolio_candidate_idx
  on public.job_consult_media (portfolio_candidate)
  where portfolio_candidate = true;

comment on column public.job_consult_media.portfolio_candidate is
  'Internal shortlist for future portfolio review; does not grant any public-use permission.';
comment on column public.job_consult_media.portfolio_cover is
  'Internal preferred cover image for a project; does not grant any public-use permission.';
