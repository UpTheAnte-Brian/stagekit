import Link from "next/link";
import { listApprovedPortfolioMedia } from "@/lib/db/photo-releases";
import { getPublicCoverageSummary } from "@/lib/db/jobs";
import { CoverageMap } from "@/components/web/coverage-map";
import { ContactForm } from "@/components/web/contact-form";

export const dynamic = "force-dynamic";

const services = [
  ["Vacant Staging", "A tailored furniture and accessory plan that helps every room make an immediate impression."],
  ["Occupied Staging", "Thoughtful editing and strategic additions that make a lived-in home feel market-ready."],
  ["In-Home Consultations", "A practical room-by-room plan for sellers who want expert direction and a clear next step."],
];

export default async function HomePage() {
  const approvedPortfolioMedia = await listApprovedPortfolioMedia();
  const coverage = await getPublicCoverageSummary();
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#1e2622]">
      <header className="sticky top-0 z-50 border-b border-[#e1d9c9]/80 bg-[#f8f6f1]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link aria-label="AJ Home Staging home" className="group" href="/">
            <span className="block font-serif text-2xl tracking-[0.18em] text-[#1f2924]">AJ</span>
            <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[#9e7b39]">Home Staging</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-medium text-[#48524c] md:flex">
            <a className="transition hover:text-[#1f2924]" href="#services">Services</a>
            <a className="transition hover:text-[#1f2924]" href="#approach">Our approach</a>
            <Link className="transition hover:text-[#1f2924]" href="/work">Our work</Link>
            <a className="transition hover:text-[#1f2924]" href="#coverage">Coverage area</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Thoughtful staging for a confident sale</p>
          <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[1.04] tracking-tight text-[#26332c] sm:text-6xl">Staging that lets buyers feel at home.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#59635c]">AJ Home Staging creates welcoming, considered spaces that help a home stand out—and help buyers imagine the life waiting inside.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="rounded-full bg-[#283a31] px-6 py-3 text-sm font-semibold !text-[#fffdf8] shadow-sm transition hover:bg-[#1d2c25]" href="#contact">Start a conversation</a>
            <Link className="rounded-full border border-[#c9b58a] px-6 py-3 text-sm font-semibold text-[#665021] transition hover:bg-[#efe7d5]" href="/work">See our work</Link>
          </div>
        </div>
        <div className="relative min-h-96 overflow-hidden rounded-[2rem] bg-[#d8d1c2] p-7 shadow-[0_24px_60px_rgba(48,42,29,0.16)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.82),transparent_20%),linear-gradient(145deg,#c5b69c_0%,#e8e1d4_46%,#9eae9d_100%)]" />
          <div className="relative flex h-full min-h-96 flex-col justify-end rounded-[1.4rem] border border-white/40 bg-white/10 p-7 backdrop-blur-[2px]">
            <p className="max-w-xs font-serif text-3xl leading-tight text-[#25342b]">A home’s best first impression starts before the front door opens.</p>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-[#536158]">AJ Home Staging</p>
          </div>
        </div>
      </section>

      <section className="scroll-mt-20 border-y border-[#e1d9c9] bg-[#fffdf8]" id="services">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">How we help</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="font-serif text-4xl leading-tight text-[#26332c]">Every home has a story worth showing well.</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {services.map(([title, description]) => <article key={title} className="border-l border-[#c8ad75] pl-5"><h3 className="font-serif text-xl text-[#26332c]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#657067]">{description}</p></article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20 lg:px-10" id="portfolio">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Selected work</p><h2 className="mt-3 font-serif text-4xl text-[#26332c]">Finished homes, thoughtfully remembered.</h2></div><p className="max-w-md text-sm leading-6 text-[#657067]">Our portfolio is growing from homeowner-approved finished walkthroughs. Each project will share the finished space while protecting the privacy of the people who lived there.</p></div>
        {approvedPortfolioMedia.length > 0 ? <div className="mt-10 grid gap-5 md:grid-cols-3">{approvedPortfolioMedia.map((media, index) => <div className={`aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#d9d4ca] ${index % 3 === 1 ? "md:mt-10" : ""}`} key={media.id}>{media.url ? <img alt="AJ Home Staging finished project" className="h-full w-full object-cover" src={media.url} /> : null}</div>)}</div> : <div className="mt-10 rounded-[1.5rem] border border-[#e1d9c9] bg-white px-6 py-10 text-center"><p className="font-serif text-3xl text-[#26332c]">New transformations are on the way.</p><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#657067]">We&apos;re collecting homeowner-approved finished images to share here.</p><Link className="mt-5 inline-flex rounded-full border border-[#c9b58a] px-5 py-2.5 text-sm font-semibold text-[#665021] transition hover:bg-[#efe7d5]" href="/work">Explore our coverage</Link></div>}
      </section>

      <section className="scroll-mt-20 border-y border-[#e1d9c9] bg-[#fffdf8] px-6 py-20 lg:px-10" id="coverage">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Where we work</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#26332c]">Rooted in the Twin Cities.</h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-[#59635c]">From the west metro to St. Paul and beyond, we have helped homes across the Twin Cities make a stronger first impression.</p>
            {coverage.mappedProjectCount > 0 ? <div className="mt-8 flex flex-wrap gap-3"><div className="rounded-2xl border border-[#dfd4bc] bg-[#f8f3e8] px-5 py-4"><strong className="block font-serif text-3xl text-[#26332c]">{coverage.mappedProjectCount}+</strong><span className="text-sm text-[#657067]">mapped projects</span></div><div className="rounded-2xl border border-[#d5dfd3] bg-[#eff4ee] px-5 py-4"><strong className="block font-serif text-3xl text-[#26332c]">{coverage.communityCount}+</strong><span className="text-sm text-[#657067]">communities served</span></div></div> : null}
          </div>
          <CoverageMap apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY} coverage={coverage} />
        </div>
      </section>

      <section className="scroll-mt-20 bg-[#283a31] px-6 py-16 text-white lg:px-10" id="approach"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2"><h2 className="font-serif text-4xl leading-tight">Beautifully staged. Carefully managed.</h2><p className="max-w-xl text-lg leading-8 text-[#d9e3d8]">Behind every finished room is an intentional process—from the first visit to the final walkthrough. Our client experience and project records are designed to make every detail feel considered.</p></div></section>

      <section className="border-y border-[#e1d9c9] bg-[#fffdf8] px-6 py-20 lg:px-10" aria-labelledby="staging-impact">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Why staging matters</p><h2 className="mt-3 font-serif text-4xl text-[#26332c]" id="staging-impact">A stronger first impression has real influence.</h2><div className="mt-10 grid gap-5 md:grid-cols-3"><article className="rounded-3xl border border-[#e1d9c9] bg-white p-7"><strong className="font-serif text-5xl text-[#26332c]">83%</strong><p className="mt-4 text-base leading-7 text-[#59635c]">of buyers’ agents say staging helps buyers picture a property as their future home.</p></article><article className="rounded-3xl border border-[#e1d9c9] bg-white p-7"><strong className="font-serif text-5xl text-[#26332c]">49%</strong><p className="mt-4 text-base leading-7 text-[#59635c]">of sellers’ agents report that staging reduced time on the market.</p></article><article className="rounded-3xl border border-[#e1d9c9] bg-white p-7"><strong className="font-serif text-5xl text-[#26332c]">29%</strong><p className="mt-4 text-base leading-7 text-[#59635c]">of sellers’ agents saw staging increase the dollar value offered by 1% to 10%.</p></article></div><p className="mt-6 text-sm leading-6 text-[#657067]">Source: <a className="underline decoration-[#c9a662] underline-offset-4 hover:text-[#26332c]" href="https://www.nar.realtor/research-and-statistics/research-reports/profile-of-home-staging" rel="noreferrer" target="_blank">National Association of REALTORS® 2025 Profile of Home Staging</a>.</p></div>
      </section>

      <footer className="scroll-mt-20 bg-[#1d2c25] px-6 py-16 text-[#e9eee6] lg:px-10" id="contact"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a662]">Contact us</p><h2 className="mt-4 font-serif text-4xl leading-tight">Ready to make your home memorable?</h2><p className="mt-4 max-w-md text-lg leading-8 text-[#bac8bb]">Tell us about your sale and the space you want buyers to see. We’ll be in touch soon.</p><a className="mt-7 inline-flex rounded-full border border-[#c9a662] px-6 py-3 text-sm font-semibold text-[#fffdf8] transition hover:bg-[#c9a662] hover:text-[#25342b]" href="tel:6123886499">Call 612.388.6499</a></div><ContactForm /></div></footer>
    </main>
  );
}
