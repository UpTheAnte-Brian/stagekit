import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const allowedChannels = ["website", "linkedin", "proposals"] as const;

export async function createPhotoRelease({ jobId, recipientName, recipientEmail, channels }: { jobId: string; recipientName: string; recipientEmail: string; channels: string[] }) {
  const supabase = await createServerSupabaseClient();
  const { data: visits, error: visitError } = await supabase
    .from("job_consults")
    .select("id")
    .eq("job_id", jobId)
    .eq("visit_type", "finished_walkthrough");
  if (visitError) throw new Error(visitError.message);

  const visitIds = (visits ?? []).map((visit) => visit.id);
  if (visitIds.length === 0) throw new Error("Add a finished walkthrough and shortlist its best images first.");
  const { data: media, error: mediaError } = await supabase
    .from("job_consult_media")
    .select("id")
    .in("consult_id", visitIds)
    .eq("portfolio_candidate", true);
  if (mediaError) throw new Error(mediaError.message);
  if (!media?.length) throw new Error("Shortlist at least one finished image before creating a homeowner release.");

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
