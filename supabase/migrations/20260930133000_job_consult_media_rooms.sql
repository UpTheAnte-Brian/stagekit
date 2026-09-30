-- A photo can document a specific room even when its visit contains media from
-- throughout the project. This stays optional for older uploads and general shots.
alter table public.job_consult_media
  add column if not exists room_label text;

create index if not exists job_consult_media_room_label_idx
  on public.job_consult_media (room_label)
  where room_label is not null;

comment on column public.job_consult_media.room_label is
  'Optional project-room label for reference and finished walkthrough media.';
