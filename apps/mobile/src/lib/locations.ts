import type { Database } from "./database";
import { getSupabaseClient } from "./supabase";

export type Location = Pick<Database["public"]["Tables"]["locations"]["Row"], "id" | "name" | "kind"> & {
  address_label: string | null;
  latitude: number | null;
  longitude: number | null;
};

export async function listLocations() {
  const supabase = getSupabaseClient();
  const [{ data: locations, error: locationsError }, { data: activeJobs, error: jobsError }] = await Promise.all([
    supabase.from("locations").select("id,name,kind,source_job_id").order("name", { ascending: true }),
    supabase.from("jobs").select("id").eq("status", "active"),
  ]);

  if (locationsError) {
    throw new Error(locationsError.message);
  }
  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const activeJobIds = new Set((activeJobs ?? []).map((job) => job.id));

  return (locations ?? [])
    .filter((location) => !location.source_job_id || activeJobIds.has(location.source_job_id))
    .map((location) => ({
      ...location,
      address_label: null,
      latitude: null,
      longitude: null,
    }));
}
