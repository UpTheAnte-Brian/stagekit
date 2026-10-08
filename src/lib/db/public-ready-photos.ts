import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PublicReadyPhoto = {
  id: string;
  fileName: string;
  source: "godaddy" | "zillow_sold" | "other";
  notes: string | null;
  storageBucket: string;
  storagePath: string;
  createdAt: string;
  url: string | null;
};

export async function listPublicReadyPhotos(): Promise<PublicReadyPhoto[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("public_ready_photos").select("id,file_name,source,notes,storage_bucket,storage_path,created_at").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return Promise.all((data ?? []).map(async (photo) => {
    const { data: signed } = await supabase.storage.from(photo.storage_bucket).createSignedUrl(photo.storage_path, 60 * 30);
    return { id: photo.id, fileName: photo.file_name, source: photo.source as PublicReadyPhoto["source"], notes: photo.notes, storageBucket: photo.storage_bucket, storagePath: photo.storage_path, createdAt: photo.created_at, url: signed?.signedUrl ?? null };
  }));
}

export async function listPublicReadyPhotoUrls() {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase.from("public_ready_photos").select("id,storage_bucket,storage_path").order("created_at", { ascending: false }).limit(12);
    if (error) return [];
    return Promise.all((data ?? []).map(async (photo) => {
      const { data: signed } = await supabase.storage.from(photo.storage_bucket).createSignedUrl(photo.storage_path, 60 * 30);
      return { id: photo.id, url: signed?.signedUrl ?? null };
    }));
  } catch { return []; }
}
