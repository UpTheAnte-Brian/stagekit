-- Supabase no longer automatically exposes new public tables through the Data API.
-- Keep these grants explicit so fresh database resets, preview branches, and future
-- migrations remain usable by the authenticated Stagekit clients.

grant usage on schema public to authenticated, service_role;

grant all privileges on table
  public.locations,
  public.jobs,
  public.inventory_items,
  public.inventory_photos,
  public.job_items,
  public.intake_batches,
  public.job_pack_requests,
  public.job_pick_items,
  public.scene_templates,
  public.scene_template_items,
  public.job_scene_applications,
  public.job_consults,
  public.job_consult_media
to authenticated;

-- Server-side import and maintenance scripts use the service role through the
-- same Data API. It bypasses RLS, but still needs table privileges.
grant all privileges on table
  public.locations,
  public.jobs,
  public.inventory_items,
  public.inventory_photos,
  public.job_items,
  public.intake_batches,
  public.job_pack_requests,
  public.job_pick_items,
  public.scene_templates,
  public.scene_template_items,
  public.job_scene_applications,
  public.job_consults,
  public.job_consult_media
to service_role;

-- Inventory item codes are generated from this sequence during inserts.
grant usage, select on sequence public.inventory_item_code_seq to authenticated, service_role;

-- Apply the same Data API privilege to each table created by later migrations.
-- Migrations run as the database owner, so these defaults apply to that owner’s
-- subsequently created public tables.
alter default privileges for role postgres in schema public
  grant all privileges on tables to authenticated;

alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;
