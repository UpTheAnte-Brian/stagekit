import Link from "next/link";

import { PublicWorkMap } from "@/components/web/public-work-map";
import { listPublicWorkPlaces } from "@/lib/db/photo-releases";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const places = await listPublicWorkPlaces();
  return <main className="min-h-screen bg-[#f8f6f1] px-6 py-8 text-[#1e2622] lg:px-10 lg:py-12"><header className="mx-auto flex max-w-7xl items-center justify-between gap-6"><Link className="group" href="/"><span className="block font-serif text-2xl tracking-[0.18em] text-[#1f2924]">AJ</span><span className="block text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[#9e7b39]">Home Staging</span></Link><Link className="rounded-full border border-[#c9b58a] px-4 py-2 text-sm font-semibold text-[#665021] hover:bg-[#efe7d5]" href="/">Back home</Link></header><section className="mx-auto max-w-7xl py-16"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Our work</p><h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.04] text-[#26332c]">A closer look at transformations across the Twin Cities.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[#59635c]">Choose a place on the map to view its homeowner-approved before and after. Markers show an approximate community location, never a home address.</p><div className="mt-10"><PublicWorkMap apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY} places={places} /></div></section></main>;
}
