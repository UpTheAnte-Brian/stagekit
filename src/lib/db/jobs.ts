import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

type JobCountRow = {
  job_id: string | null;
};

type SourceJobCountRow = {
  source_job_id: string | null;
};

type PostgrestLikeError = {
  code?: string;
  details?: string | null;
  message?: string;
};

const SCENE_SCHEMA_TOKENS = [
  "job_scene_applications",
  "scene_templates",
  "scene_template_items",
  "scene_application_id",
  "scene_template_item_id",
];

function isMissingSceneSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const value = error as PostgrestLikeError;
  const haystack = `${value.code ?? ""} ${value.message ?? ""} ${value.details ?? ""}`.toLowerCase();

  return SCENE_SCHEMA_TOKENS.some((token) => haystack.includes(token));
}

function countByKey(rows: JobCountRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    if (!row.job_id) {
      return acc;
    }

    acc[row.job_id] = (acc[row.job_id] ?? 0) + 1;
    return acc;
  }, {});
}

function countBySourceJobKey(rows: SourceJobCountRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    if (!row.source_job_id) {
      return acc;
    }

    acc[row.source_job_id] = (acc[row.source_job_id] ?? 0) + 1;
    return acc;
  }, {});
}

export type JobWithStats = Pick<
  JobRow,
  "id" | "name" | "status" | "address1" | "address2" | "address_label" | "city" | "state" | "postal" | "start_date" | "end_date" | "latitude" | "longitude"
> & {
  activeItemCount: number;
  importedItemCount: number;
  packRequestCount: number;
  sceneApplicationCount: number;
};

export type AssignableJob = Pick<JobRow, "id" | "name" | "status" | "address1" | "address2" | "address_label" | "city" | "state" | "postal"> & {
  address_label: string | null;
};

export type PublicCoverageCell = {
  /** Coordinates are normalized within the service area, not project coordinates. */
  x: number;
  y: number;
  projectCount: number;
};

export type PublicCoverageSummary = {
  mappedProjectCount: number;
  communityCount: number;
  cells: PublicCoverageCell[];
};

function withResolvedAddressLabel<T extends Pick<JobRow, "address1" | "address2" | "address_label" | "city" | "state" | "postal">>(job: T) {
  const fallbackAddress = [job.address1, job.address2, job.city, job.state, job.postal].filter(Boolean).join(", ");

  return {
    ...job,
    address_label: job.address_label ?? (fallbackAddress || null),
  };
}

export async function listJobsWithStats(): Promise<JobWithStats[]> {
  const supabase = await createServerSupabaseClient();
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id,name,status,address1,address2,address_label,city,state,postal,start_date,end_date,latitude,longitude")
    .order("created_at", { ascending: false });

  if (jobsError) {
    throw new Error(`Failed to load jobs: ${jobsError.message}`);
  }

  if ((jobs ?? []).length === 0) {
    return [] as JobWithStats[];
  }

  const jobIds = (jobs ?? []).map((job) => job.id);
  const [
    { data: activeAssignments, error: activeError },
    { data: importedItems, error: importedError },
    { data: packRequests, error: packRequestsError },
    { data: sceneApplications, error: sceneApplicationsError },
  ] = await Promise.all([
    supabase.from("job_items").select("job_id").in("job_id", jobIds).is("checked_in_at", null),
    supabase.from("inventory_items").select("source_job_id").in("source_job_id", jobIds),
    supabase.from("job_pack_requests").select("job_id").in("job_id", jobIds).neq("status", "cancelled"),
    supabase.from("job_scene_applications").select("job_id").in("job_id", jobIds),
  ]);

  if (activeError) {
    throw new Error(`Failed to load active assignments: ${activeError.message}`);
  }
  if (importedError) {
    throw new Error(`Failed to load imported inventory counts: ${importedError.message}`);
  }
  if (packRequestsError) {
    throw new Error(`Failed to load pack request counts: ${packRequestsError.message}`);
  }
  if (sceneApplicationsError && !isMissingSceneSchemaError(sceneApplicationsError)) {
    throw new Error(`Failed to load scene application counts: ${sceneApplicationsError.message}`);
  }

  const activeByJobId = countByKey((activeAssignments ?? []) as JobCountRow[]);
  const importedByJobId = countBySourceJobKey((importedItems ?? []) as SourceJobCountRow[]);
  const packRequestsByJobId = countByKey((packRequests ?? []) as JobCountRow[]);
  const sceneApplicationsByJobId = countByKey((sceneApplications ?? []) as JobCountRow[]);

  return (jobs ?? []).map((job) => ({
    ...job,
    activeItemCount: activeByJobId[job.id] ?? 0,
    importedItemCount: importedByJobId[job.id] ?? 0,
    packRequestCount: packRequestsByJobId[job.id] ?? 0,
    sceneApplicationCount: sceneApplicationsByJobId[job.id] ?? 0,
  }));
}

export async function listAssignableJobs(): Promise<AssignableJob[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id,name,status,address1,address2,address_label,city,state,postal")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load assignable jobs: ${error.message}`);
  }

  return (data ?? []).map((job) => withResolvedAddressLabel(job)) as AssignableJob[];
}

/**
 * Returns only a coarse, aggregated service-area pattern for the public site.
 * Individual projects and their locations must remain available only to signed-in staff.
 */
export async function getPublicCoverageSummary(): Promise<PublicCoverageSummary> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("latitude,longitude,city")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) throw new Error(`Failed to load public coverage summary: ${error.message}`);

  const projects = (data ?? []).filter((job) => job.latitude != null && job.longitude != null);
  const communities = new Set(projects.map((job) => job.city?.trim().toLowerCase()).filter(Boolean));
  if (projects.length === 0) return { mappedProjectCount: 0, communityCount: 0, cells: [] };

  const minLongitude = -93.72;
  const maxLongitude = -92.96;
  const minLatitude = 44.67;
  const maxLatitude = 45.20;
  const cellSize = 0.075;
  const cells = new Map<string, { longitude: number; latitude: number; projectCount: number }>();

  for (const project of projects) {
    const longitude = project.longitude as number;
    const latitude = project.latitude as number;
    const longitudeBucket = Math.floor((longitude - minLongitude) / cellSize);
    const latitudeBucket = Math.floor((latitude - minLatitude) / cellSize);
    const key = `${longitudeBucket}:${latitudeBucket}`;
    const existing = cells.get(key);
    if (existing) {
      existing.projectCount += 1;
    } else {
      // Render each group at the centre of a ~5-mile cell, never at a project address.
      cells.set(key, {
        longitude: minLongitude + (longitudeBucket + 0.5) * cellSize,
        latitude: minLatitude + (latitudeBucket + 0.5) * cellSize,
        projectCount: 1,
      });
    }
  }

  return {
    mappedProjectCount: projects.length,
    communityCount: communities.size,
    cells: [...cells.values()].map((cell) => ({
      x: Math.max(5, Math.min(95, ((cell.longitude - minLongitude) / (maxLongitude - minLongitude)) * 100)),
      y: Math.max(5, Math.min(95, 100 - ((cell.latitude - minLatitude) / (maxLatitude - minLatitude)) * 100)),
      projectCount: cell.projectCount,
    })),
  };
}
