import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_CONSULT_MEDIA_BYTES = 1024 * 1024 * 1024;

const uploadUrlRequestSchema = z.object({
  jobId: z.string().uuid(),
  consultId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(500),
  contentType: z.string().trim().max(200).optional(),
  fileSizeBytes: z.number().int().positive().max(MAX_CONSULT_MEDIA_BYTES),
});

export async function POST(request: Request) {
  try {
    const payload = uploadUrlRequestSchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    const { data: consult, error: consultError } = await supabase
      .from("job_consults")
      .select("id")
      .eq("id", payload.consultId)
      .eq("job_id", payload.jobId)
      .maybeSingle();

    if (consultError) {
      throw new Error(consultError.message);
    }
    if (!consult) {
      return NextResponse.json({ message: "The saved visit could not be found." }, { status: 404 });
    }

    const extension = payload.fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? (payload.contentType?.startsWith("video/") ? "mp4" : "jpg");
    const storagePath = `consults/${payload.jobId}/${payload.consultId}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage.from("job-consults").createSignedUploadUrl(storagePath);

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to prepare the media upload.");
    }

    return NextResponse.json({ storagePath, token: data.token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare the media upload.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
