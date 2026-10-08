import Link from "next/link";
import { listApprovedPortfolioMedia } from "@/lib/db/photo-releases";
import { listPublicReadyPhotoUrls } from "@/lib/db/public-ready-photos";
import { getPublicCoverageSummary } from "@/lib/db/jobs";
import { CoverageMap } from "@/components/web/coverage-map";
import { ContactForm } from "@/components/web/contact-form";
import { HeroPortfolioRotator } from "@/components/web/hero-portfolio-rotator";
import { PublicSiteHeader } from "@/components/web/public-site-header";
import { SelectedWorkRotator } from "@/components/web/selected-work-rotator";

export const dynamic = "force-dynamic";

const services = [
  ["In-Home Staging Consultations", "For the DIY seller who wants an expert eye. We walk through each room with practical recommendations for layout, edits, accessories, and the details that help a home show well."],
  ["Vacant Staging", "Our specialty: a tailored plan, furniture, art, and accessories selected to make an empty home feel inviting, memorable, and ready for the market."],
  ["Occupied Staging", "Strategic edits and additions for homes that are still lived in—from pillows and accessories to larger furniture pieces—built around the seller’s individual plan."],
  ["Home Improvement Recommendations", "A focused list of pre-listing improvements, prioritized around your budget and goals so you can put effort where it will matter most."],
  ["Vendor Connections", "Years in real estate and home projects mean access to trusted contractors and vendors who can help move the work forward."],
  ["Select & Purchase Home Goods", "We can source accessories, fixtures, paint, and finishing details—saving you time and making the decisions feel much less overwhelming."],
];

export default async function HomePage() {
  const [approvedPortfolioMedia, publicReadyPhotos] = await Promise.all([listApprovedPortfolioMedia(), listPublicReadyPhotoUrls()]);
  const publicImages = [...publicReadyPhotos, ...approvedPortfolioMedia];
  const imageUrls = publicImages.flatMap((media) => media.url ? [media.url] : []);
  const coverage = await getPublicCoverageSummary();
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#1e2622]">
      <PublicSiteHeader />

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Thoughtful staging for a confident sale</p>
          <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[1.04] tracking-tight text-[#26332c] sm:text-6xl">Staging that lets buyers feel at home.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#59635c]">AJ Home Staging creates welcoming, considered spaces that help a home stand out—and help buyers imagine the life waiting inside.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="rounded-full bg-[#283a31] px-6 py-3 text-sm font-semibold !text-[#fffdf8] shadow-sm transition hover:bg-[#1d2c25]" href="#contact">Start a conversation</a>
            <Link className="rounded-full border border-[#c9b58a] px-6 py-3 text-sm font-semibold text-[#665021] transition hover:bg-[#efe7d5]" href="/work">See our work</Link>
            <div aria-label="Follow AJ Home Staging" className="flex items-center gap-2">
              <a aria-label="Follow AJ Home Staging on Facebook" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c9b58a] text-[#665021] transition hover:bg-[#efe7d5]" href="https://www.facebook.com/profile.php?id=100077989118996" rel="noreferrer" target="_blank">
                <svg aria-hidden="true" className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M13.7 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2H8v3h2.5v8h3.2Z" /></svg>
              </a>
              <a aria-label="Follow AJ Home Staging on Instagram" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c9b58a] text-[#665021] transition hover:bg-[#efe7d5]" href="https://www.instagram.com/aj.homestaging/" rel="noreferrer" target="_blank">
                <svg aria-hidden="true" className="h-[1.05rem] w-[1.05rem] fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><rect height="16" rx="4" width="16" x="4" y="4" /><circle cx="12" cy="12" r="3.5" /><circle className="fill-current stroke-none" cx="17.3" cy="6.8" r="1" /></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="relative min-h-96 overflow-hidden rounded-[2rem] bg-[#d8d1c2] p-7 shadow-[0_24px_60px_rgba(48,42,29,0.16)]">
          <HeroPortfolioRotator images={imageUrls} />
          <div className="relative flex h-full min-h-96 flex-col justify-end rounded-[1.4rem] border border-white/45 bg-[#f8f6f1]/40 p-7 shadow-[inset_0_1px_rgba(255,255,255,0.35)] backdrop-blur-[3px]">
            <p className="max-w-xs font-serif text-3xl leading-tight text-[#25342b]">A home’s best first impression starts before the front door opens.</p>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-[#536158]">AJ Home Staging</p>
          </div>
        </div>
      </section>

      <section className="scroll-mt-20 border-y border-[#e1d9c9] bg-[#fffdf8]" id="services">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">How we help</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div><h2 className="font-serif text-4xl leading-tight text-[#26332c]">Every home has a story worth showing well.</h2><p className="mt-5 max-w-md text-base leading-7 text-[#657067]">Whether you want a hands-on transformation or a clear plan to tackle yourself, we shape each service around the home, timeline, and seller.</p></div>
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {services.map(([title, description]) => <article key={title} className="border-l border-[#c8ad75] pl-5"><h3 className="font-serif text-xl text-[#26332c]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#657067]">{description}</p></article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="scroll-mt-20 bg-[#f1ede4] px-6 py-20 lg:px-10" id="about">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_0.9fr_1.1fr] lg:items-start">
          <div className="overflow-hidden rounded-[1.75rem] bg-[#d8d1c2] shadow-[0_18px_45px_rgba(39,55,45,0.12)]"><img alt="The AJ Home Staging family" className="h-full min-h-80 w-full object-cover" src="/aj-family-montana.jpg" /></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">About AJ Home Staging</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#26332c]">A family business with a practical eye for what makes a home sell.</h2></div>
          <div className="space-y-6 text-lg leading-8 text-[#59635c]"><p>AJ Home Staging was established in 2022, built on years of hands-on real estate and home-staging experience. Angela leads each staging plan with an eye for how buyers will experience a space.</p><p>As a family-owned business, we bring a personal, grounded approach to every project. Brian helps make the plan happen—moving, hanging, and handling the practical details that let each room come together.</p><p>We believe the best staging helps buyers see possibility quickly: a home that photographs beautifully, feels welcoming in person, and lets its strongest features do the talking.</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20 lg:px-10" id="portfolio">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Selected work</p><h2 className="mt-3 font-serif text-4xl text-[#26332c]">Finished homes, thoughtfully remembered.</h2></div><p className="max-w-md text-sm leading-6 text-[#657067]">Our portfolio is growing from homeowner-approved finished walkthroughs. Each project will share the finished space while protecting the privacy of the people who lived there.</p></div>
        {imageUrls.length > 0 ? <SelectedWorkRotator images={imageUrls} /> : <div className="mt-10 rounded-[1.5rem] border border-[#e1d9c9] bg-white px-6 py-10 text-center"><p className="font-serif text-3xl text-[#26332c]">New transformations are on the way.</p><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#657067]">We&apos;re collecting public-ready and homeowner-approved finished images to share here.</p><Link className="mt-5 inline-flex rounded-full border border-[#c9b58a] px-5 py-2.5 text-sm font-semibold text-[#665021] transition hover:bg-[#efe7d5]" href="/work">Explore our coverage</Link></div>}
      </section>

      <section className="scroll-mt-20 border-y border-[#e1d9c9] bg-[#fffdf8] px-6 py-20 lg:px-10" id="coverage">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Where we work</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#26332c]">Rooted in the Twin Cities.</h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-[#59635c]">From the west metro to St. Paul and beyond, we have helped homes across the Twin Cities make a stronger first impression.</p>
            {coverage.mappedProjectCount > 0 ? <div className="mt-8 flex flex-wrap gap-3"><div className="rounded-2xl border border-[#dfd4bc] bg-[#f8f3e8] px-5 py-4"><strong className="block font-serif text-3xl text-[#26332c]">{coverage.mappedProjectCount}+</strong><span className="text-sm text-[#657067]">mapped projects</span></div><div className="rounded-2xl border border-[#d5dfd3] bg-[#eff4ee] px-5 py-4"><strong className="block font-serif text-3xl text-[#26332c]">{coverage.communityCount}+</strong><span className="text-sm text-[#657067]">communities served</span></div></div> : null}
            <Link className="mt-5 inline-flex text-sm font-medium text-[#665021] underline decoration-[#c9b58a] underline-offset-4 transition hover:text-[#26332c]" href="/work">Take a closer look at our coverage</Link>
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
