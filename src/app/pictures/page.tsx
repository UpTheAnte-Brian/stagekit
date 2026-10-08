import { revalidatePath } from "next/cache";

import { PublicReadyPhotoUpload } from "@/components/pictures/public-ready-photo-upload";
import { listPublicReadyPhotos } from "@/lib/db/public-ready-photos";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const sourceLabels = { godaddy: "Existing GoDaddy site", zillow_sold: "Zillow sold listing", other: "Other public-ready source" } as const;

export default async function PicturesPage() {
  const pictures = await listPublicReadyPhotos();

  async function removePicture(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const supabase = await createServerSupabaseClient();
    const { data: picture } = await supabase.from("public_ready_photos").select("storage_bucket,storage_path").eq("id", id).maybeSingle();
    if (!picture) return;
    const { error } = await supabase.from("public_ready_photos").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await supabase.storage.from(picture.storage_bucket).remove([picture.storage_path]);
    revalidatePath("/pictures"); revalidatePath("/");
  }

  return <div className="space-y-7">
    <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9e7b39]">Public website</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Pictures</h1><p className="mt-2 max-w-2xl text-muted">A reusable library for images that are already cleared for the public AJ site. These have no project association and do not enter the approval process.</p></div>
    <PublicReadyPhotoUpload />
    <section><div className="flex items-baseline justify-between gap-4"><h2 className="text-xl font-semibold">Public-ready library</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-muted">{pictures.length} picture{pictures.length === 1 ? "" : "s"}</span></div>
      {pictures.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pictures.map((picture) => <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm" key={picture.id}><div className="aspect-[4/3] bg-slate-100">{picture.url ? <img alt={picture.fileName} className="h-full w-full object-cover" src={picture.url} /> : <div className="flex h-full items-center justify-center text-sm text-muted">Preview unavailable</div>}</div><div className="p-4"><p className="truncate font-medium">{picture.fileName}</p><p className="mt-1 text-xs text-muted">{sourceLabels[picture.source]}</p>{picture.notes ? <p className="mt-2 text-sm text-muted">{picture.notes}</p> : null}<form action={removePicture} className="mt-4"><input name="id" type="hidden" value={picture.id} /><button className="text-sm font-semibold text-rose-700 hover:underline">Remove picture</button></form></div></article>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-border bg-white p-8 text-center text-muted">Add the first public-ready photo from the former GoDaddy site or a sold Zillow listing.</div>}
    </section>
  </div>;
}
