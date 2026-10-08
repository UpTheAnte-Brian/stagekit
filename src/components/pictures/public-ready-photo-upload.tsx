"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const MAX_SIZE = 50 * 1024 * 1024;

export function PublicReadyPhotoUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const files = Array.from(inputRef.current?.files ?? []);
    if (!files.length || uploading) return;
    const invalid = files.find((file) => !file.type.startsWith("image/") || file.size > MAX_SIZE);
    if (invalid) { setMessage(`${invalid.name} must be an image smaller than 50 MB.`); return; }
    setUploading(true); setMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const storagePath = `library/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("public-ready-photos").upload(storagePath, file, { contentType: file.type || "image/jpeg", upsert: false });
        if (uploadError) throw new Error(uploadError.message);
        const response = await fetch("/api/public-ready-photos/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ storagePath, fileName: file.name, contentType: file.type, fileSizeBytes: file.size, source: form.get("source"), notes: form.get("notes") }) });
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        if (!response.ok) throw new Error(payload?.message || "Could not save picture details.");
      }
      formElement.reset(); router.refresh(); setMessage(files.length === 1 ? "Picture added to the public library." : `${files.length} pictures added to the public library.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed. Please try again."); }
    finally { setUploading(false); }
  }

  return <form className="grid gap-4 rounded-2xl border border-[#d9c59d] bg-[#fffaf1] p-5" onSubmit={submit}>
    <div><h2 className="text-lg font-semibold text-[#33413b]">Add public-ready pictures</h2><p className="mt-1 text-sm text-[#6f756c]">These skip the homeowner approval workflow and may appear on the AJ site.</p></div>
    <input accept="image/jpeg,image/png,image/webp,image/avif,image/gif,.heic,.heif" className="block w-full rounded-xl border border-dashed border-[#c9b58a] bg-white px-3 py-4 text-sm" multiple ref={inputRef} required type="file" />
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-[#4e584f]">Source<select className="mt-1 block w-full rounded-lg border border-[#d7c9af] bg-white px-3 py-2" defaultValue="godaddy" name="source"><option value="godaddy">Existing GoDaddy site</option><option value="zillow_sold">Zillow sold listing</option><option value="other">Other public-ready source</option></select></label><label className="text-sm font-medium text-[#4e584f]">Notes <span className="font-normal text-[#6f756c]">(optional)</span><input className="mt-1 block w-full rounded-lg border border-[#d7c9af] bg-white px-3 py-2" name="notes" placeholder="Listing, room, or usage note" /></label></div>
    <div className="flex items-center gap-3"><button className="rounded-lg bg-[#254238] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={uploading} type="submit">{uploading ? "Adding pictures…" : "Add pictures"}</button>{message ? <p className="text-sm text-[#526158]" role="status">{message}</p> : null}</div>
  </form>;
}
