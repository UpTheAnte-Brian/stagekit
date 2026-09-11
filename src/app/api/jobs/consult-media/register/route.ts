import { NextResponse } from "next/server";
import { z } from "zod";

import { addJobConsultMedia } from "@/lib/db/job-details";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_CONSULT_MEDIA_BYTES = 1024 * 1024 * 1024;

const registerMediaRequestSchema = z.object({
  jobId: z.string().uuid(),
  consultId: z.string().uuid(),
  storagePath: z.string().trim().min(1).max(1000),
  fileName: z.string().trim().min(1).max(500),
  contentType: z.string().trim().max(200).nullable(),
  fileSizeBytes: z.number().int().positive().max(MAX_CONSULT_MEDIA_BYTES),
});

export async function POST(request: Request) {
  let storagePath: string | null = null;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null = null;

  try {
    const payload = registerMediaRequestSchema.parse(await request.json());
    storagePath = payload.storagePath;
    const expectedPathPrefix = `consults/${payload.jobId}/${payload.consultId}/`;
    if (!storagePath.startsWith(expectedPathPrefix)) {
      return NextResponse.json({ message: "The upload path is invalid." }, { status: 400 });
    }

    supabase = await createServerSupabaseClient();
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

    await addJobConsultMedia({
      consultId: payload.consultId,
      storagePath,
      fileName: payload.fileName,
      contentType: payload.contentType,
      fileSizeBytes: payload.fileSizeBytes,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (storagePath && supabase) {
      await supabase.storage.from("job-consults").remove([storagePath]);
    }
    const message = error instanceof Error ? error.message : "Failed to save the uploaded media.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
