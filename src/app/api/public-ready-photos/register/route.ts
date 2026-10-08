import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const sources = ["godaddy", "zillow_sold", "other"] as const;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Sign in to add pictures." }, { status: 401 });
  const body = await request.json() as { storagePath?: string; fileName?: string; contentType?: string; fileSizeBytes?: number; source?: string; notes?: string };
  if (!body.storagePath || !body.fileName) return NextResponse.json({ message: "Picture details are required." }, { status: 400 });
  const source = sources.includes(body.source as typeof sources[number]) ? body.source as typeof sources[number] : "other";
  const { error } = await supabase.from("public_ready_photos").insert({ storage_path: body.storagePath, file_name: body.fileName, content_type: body.contentType ?? "image/jpeg", file_size_bytes: body.fileSizeBytes ?? null, source, notes: body.notes?.trim() || null, created_by: user.id });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
