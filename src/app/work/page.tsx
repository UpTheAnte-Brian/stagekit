import Link from "next/link";

import { CoverageMap } from "@/components/web/coverage-map";
import { PublicWorkMap } from "@/components/web/public-work-map";
import { getPublicCoverageSummary } from "@/lib/db/jobs";
import { listPublicWorkPlaces } from "@/lib/db/photo-releases";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const [places, coverage] = await Promise.all([listPublicWorkPlaces(), getPublicCoverageSummary()]);

  return (
    <main className="min-h-screen bg-[#f8f6f1] px-6 py-8 text-[#1e2622] lg:px-10 lg:py-12">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-6">
        <Link aria-label="AJ Home Staging home" className="group flex items-center gap-3" href="/">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-[#d8d0bd]"><img alt="" className="h-full w-full object-contain" src="/aj-home-favicon.png" /></span>
          <span><span className="block font-serif text-2xl tracking-[0.12em] text-[#1f2924]">AJ</span><span className="block text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[#9e7b39]">Home Staging</span></span>
        </Link>
        <Link className="rounded-full border border-[#c9b58a] px-4 py-2 text-sm font-semibold text-[#665021] hover:bg-[#efe7d5]" href="/">Back home</Link>
      </header>

      <section className="mx-auto max-w-7xl py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Our work</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.04] text-[#26332c]">A closer look at transformations across the Twin Cities.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#59635c]">We work throughout the Twin Cities. Our public map shows communities we have served, never individual home addresses.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Where we have worked</p>
            <h2 className="mt-3 font-serif text-4xl text-[#26332c]">A footprint across the metro.</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-[#59635c]">Select a city marker to see how many projects we have completed there.</p>
          </div>
          <CoverageMap apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY} coverage={coverage} />
        </div>

        <div className="mt-20 border-t border-[#e1d9c9] pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Selected transformations</p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-[#26332c]">Before-and-after stories, shared with permission.</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#59635c]">When a homeowner approves a finished project for the website, its before-and-after images appear here with an approximate community marker.</p>
          <div className="mt-10"><PublicWorkMap apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY} places={places} /></div>
        </div>
      </section>
    </main>
  );
}
