import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const allowedChannels = ["website", "linkedin", "proposals"] as const;

export type PublicWorkPlace = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  beforeUrl: string;
  afterUrl: string;
};

export async function createPhotoRelease({ jobId, recipientName, recipientEmail, channels }: { jobId: string; recipientName: string; recipientEmail: string; channels: string[] }) {
  const supabase = await createServerSupabaseClient();
  const { data: visits, error: visitError } = await supabase
    .from("job_consults")
    .select("id")
    .eq("job_id", jobId);
  if (visitError) throw new Error(visitError.message);

  const visitIds = (visits ?? []).map((visit) => visit.id);
  if (visitIds.length === 0) throw new Error("Add a project visit and shortlist its best images first.");
  const { data: media, error: mediaError } = await supabase
    .from("job_consult_media")
    .select("id")
    .in("consult_id", visitIds)
    .eq("portfolio_candidate", true);
  if (mediaError) throw new Error(mediaError.message);
  if (!media?.length) throw new Error("Shortlist at least one image before creating a homeowner release.");

  const selectedChannels = channels.filter((channel): channel is (typeof allowedChannels)[number] => allowedChannels.includes(channel as (typeof allowedChannels)[number]));
  const { data: userData } = await supabase.auth.getUser();
  const { data: release, error: releaseError } = await supabase
    .from("job_photo_releases")
    .insert({
      job_id: jobId,
      recipient_name: recipientName || null,
      recipient_email: recipientEmail || null,
      channels: selectedChannels.length ? selectedChannels : ["website", "linkedin"],
      created_by: userData.user?.id ?? null,
    })
    .select("id,access_token")
    .single();
  if (releaseError) throw new Error(releaseError.message);

  const { error: itemError } = await supabase.from("job_photo_release_items").insert(media.map((item) => ({ release_id: release.id, media_id: item.id })));
  if (itemError) throw new Error(itemError.message);
  return release.access_token;
}

export async function getPhotoRelease(token: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: release, error } = await supabase
    .from("job_photo_releases")
    .select("id,job_id,recipient_name,status,channels,expires_at,responded_at,jobs!inner(name)")
    .eq("access_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!release) return null;

  const { data: items, error: itemError } = await supabase
    .from("job_photo_release_items")
    .select("id,decision,media_id,job_consult_media!inner(file_name,content_type,storage_bucket,storage_path)")
    .eq("release_id", release.id);
  if (itemError) throw new Error(itemError.message);

  const resolvedItems = await Promise.all((items ?? []).map(async (item) => {
    const media = item.job_consult_media;
    const { data } = await supabase.storage.from(media.storage_bucket).createSignedUrl(media.storage_path, 60 * 30);
    return { id: item.id, decision: item.decision, fileName: media.file_name, isVideo: media.content_type?.startsWith("video/") ?? false, url: data?.signedUrl ?? null };
  }));
  return { id: release.id, token, jobName: release.jobs.name, recipientName: release.recipient_name, status: release.status, channels: release.channels, expiresAt: release.expires_at, respondedAt: release.responded_at, items: resolvedItems };
}

export async function respondToPhotoRelease({ token, approvedItemIds, declined }: { token: string; approvedItemIds: string[]; declined: boolean }) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: release, error } = await supabase.from("job_photo_releases").select("id,status,expires_at").eq("access_token", token).maybeSingle();
  if (error) throw new Error(error.message);
  if (!release) throw new Error("This release link is not valid.");
  if (release.status !== "pending") throw new Error("This photo release has already been completed.");
  if (new Date(release.expires_at) < new Date()) {
    await supabase.from("job_photo_releases").update({ status: "expired" }).eq("id", release.id);
    throw new Error("This photo release link has expired.");
  }
  const { data: items, error: itemsError } = await supabase.from("job_photo_release_items").select("id").eq("release_id", release.id);
  if (itemsError) throw new Error(itemsError.message);
  const approved = new Set(approvedItemIds);
  for (const item of items ?? []) {
    const decision = declined ? "declined" : approved.has(item.id) ? "approved" : "declined";
    const { error: updateError } = await supabase.from("job_photo_release_items").update({ decision }).eq("id", item.id);
    if (updateError) throw new Error(updateError.message);
  }
  const { error: releaseError } = await supabase.from("job_photo_releases").update({ status: declined ? "declined" : "approved", responded_at: new Date().toISOString() }).eq("id", release.id);
  if (releaseError) throw new Error(releaseError.message);
}

export async function listApprovedPortfolioMedia() {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: releases, error: releaseError } = await supabase
      .from("job_photo_releases")
      .select("id")
      .eq("status", "approved")
      .contains("channels", ["website"])
      .order("responded_at", { ascending: false })
      .limit(6);
    if (releaseError || !releases?.length) return [];

    const { data: items, error: itemError } = await supabase
      .from("job_photo_release_items")
      .select("id,job_consult_media!inner(storage_bucket,storage_path,content_type,portfolio_cover)")
      .in("release_id", releases.map((release) => release.id))
      .eq("decision", "approved")
      .limit(6);
    if (itemError) return [];
    const approvedPhotos = (items ?? [])
      .filter((item) => !item.job_consult_media.content_type?.startsWith("video/"))
      .sort((a, b) => Number(b.job_consult_media.portfolio_cover) - Number(a.job_consult_media.portfolio_cover));
    return Promise.all(approvedPhotos.map(async (item) => {
      const media = item.job_consult_media;
      const { data } = await supabase.storage.from(media.storage_bucket).createSignedUrl(media.storage_path, 60 * 30);
      return { id: item.id, url: data?.signedUrl ?? null };
    }));
  } catch {
    return [];
  }
}

/**
 * Returns only website-approved image pairs for the public work map. Locations
 * are rounded to a nearby community point so the map never reveals an address.
 */
export async function listPublicWorkPlaces(): Promise<PublicWorkPlace[]> {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: releases, error: releasesError } = await supabase
      .from("job_photo_releases")
      .select("id,job_id")
      .eq("status", "approved")
      .contains("channels", ["website"]);
    if (releasesError || !releases?.length) return [];

    const { data: releaseItems, error: releaseItemsError } = await supabase
      .from("job_photo_release_items")
      .select("media_id,release_id")
      .in("release_id", releases.map((release) => release.id))
      .eq("decision", "approved");
    if (releaseItemsError || !releaseItems?.length) return [];

    const jobIdByReleaseId = new Map(releases.map((release) => [release.id, release.job_id]));
    const approvedMediaIds = [...new Set(releaseItems.map((item) => item.media_id))];
    const { data: media, error: mediaError } = await supabase
      .from("job_consult_media")
      .select("id,consult_id,storage_bucket,storage_path,content_type,created_at")
      .in("id", approvedMediaIds)
      .like("content_type", "image/%")
      .order("created_at", { ascending: true });
    if (mediaError || !media?.length) return [];

    const { data: consults, error: consultsError } = await supabase
      .from("job_consults")
      .select("id,job_id,visit_type")
      .in("id", [...new Set(media.map((item) => item.consult_id))]);
    if (consultsError || !consults?.length) return [];

    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id,city,latitude,longitude")
      .in("id", [...new Set(releases.map((release) => release.job_id))])
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    if (jobsError || !jobs?.length) return [];

    const consultById = new Map(consults.map((consult) => [consult.id, consult]));
    const approvedJobIdsByMediaId = new Map<string, Set<string>>();
    for (const item of releaseItems) {
      const jobId = jobIdByReleaseId.get(item.release_id);
      if (jobId) approvedJobIdsByMediaId.set(item.media_id, new Set([...(approvedJobIdsByMediaId.get(item.media_id) ?? []), jobId]));
    }
    const imagesByJobId = new Map<string, { before?: typeof media[number]; after?: typeof media[number] }>();
    for (const image of media) {
      const consult = consultById.get(image.consult_id);
      if (!consult || !approvedJobIdsByMediaId.get(image.id)?.has(consult.job_id)) continue;
      const images = imagesByJobId.get(consult.job_id) ?? {};
      if (consult.visit_type === "finished_walkthrough") images.after ??= image;
      else images.before ??= image;
      imagesByJobId.set(consult.job_id, images);
    }

    const places = await Promise.all(jobs.map(async (job) => {
      const images = imagesByJobId.get(job.id);
      if (!images?.before || !images.after || job.latitude == null || job.longitude == null) return null;
      const [before, after] = await Promise.all([images.before, images.after].map(async (image) => {
        const { data } = await supabase.storage.from(image.storage_bucket).createSignedUrl(image.storage_path, 60 * 30);
        return data?.signedUrl ?? null;
      }));
      if (!before || !after) return null;
      return {
        id: job.id,
        label: `${job.city?.trim() || "Twin Cities"} home`,
        latitude: Math.round(job.latitude * 100) / 100,
        longitude: Math.round(job.longitude * 100) / 100,
        beforeUrl: before,
        afterUrl: after,
      };
    }));
    return places.filter((place): place is PublicWorkPlace => place !== null);
  } catch {
    return [];
  }
}
