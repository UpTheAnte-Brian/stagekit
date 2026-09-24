-- A project visit can happen before the stage or at its completion. Keeping both
-- in one timeline means finished walkthrough imagery stays tied to the job.
alter table public.job_consults
  add column if not exists visit_type text not null default 'site_visit'
  check (visit_type in ('site_visit', 'finished_walkthrough'));

comment on column public.job_consults.visit_type is
  'site_visit is planning/reference media; finished_walkthrough is the completed-stage photo and video record.';
