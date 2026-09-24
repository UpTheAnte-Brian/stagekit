import Link from "next/link";

const services = [
  ["Vacant Staging", "A tailored furniture and accessory plan that helps every room make an immediate impression."],
  ["Occupied Staging", "Thoughtful editing and strategic additions that make a lived-in home feel market-ready."],
  ["In-Home Consultations", "A practical room-by-room plan for sellers who want expert direction and a clear next step."],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#1e2622]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link aria-label="AJ Home Staging home" className="group" href="/">
          <span className="block font-serif text-2xl tracking-[0.18em] text-[#1f2924]">AJ</span>
          <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[#9e7b39]">Home Staging</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-medium text-[#48524c] md:flex">
          <a href="#services">Services</a>
          <a href="#approach">Our approach</a>
          <a href="#portfolio">Our work</a>
          <Link className="rounded-full border border-[#aa8644] px-4 py-2 text-[#735722] transition hover:bg-[#aa8644] hover:text-white" href="/login">Client & team login</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Thoughtful staging for a confident sale</p>
          <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[1.04] tracking-tight text-[#26332c] sm:text-6xl">Staging that lets buyers feel at home.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#59635c]">AJ Home Staging creates welcoming, considered spaces that help a home stand out—and help buyers imagine the life waiting inside.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="rounded-full bg-[#283a31] px-6 py-3 text-sm font-semibold !text-[#fffdf8] shadow-sm transition hover:bg-[#1d2c25]" href="#contact">Start a conversation</a>
            <a className="rounded-full border border-[#c9b58a] px-6 py-3 text-sm font-semibold text-[#665021] transition hover:bg-[#efe7d5]" href="#portfolio">See our work</a>
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

      <section className="border-y border-[#e1d9c9] bg-[#fffdf8]" id="services">
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

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10" id="portfolio">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9e7b39]">Selected work</p><h2 className="mt-3 font-serif text-4xl text-[#26332c]">Finished homes, thoughtfully remembered.</h2></div><p className="max-w-md text-sm leading-6 text-[#657067]">Our portfolio is growing from homeowner-approved finished walkthroughs. Each project will share the finished space while protecting the privacy of the people who lived there.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3"><div className="aspect-[4/5] rounded-[1.5rem] bg-[#d9d4ca]" /><div className="aspect-[4/5] rounded-[1.5rem] bg-[#bfcbbd] md:mt-10" /><div className="aspect-[4/5] rounded-[1.5rem] bg-[#cbbba6]" /></div>
      </section>

      <section className="bg-[#283a31] px-6 py-16 text-white lg:px-10" id="approach"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2"><h2 className="font-serif text-4xl leading-tight">Beautifully staged. Carefully managed.</h2><p className="max-w-xl text-lg leading-8 text-[#d9e3d8]">Behind every finished room is an intentional process—from the first visit to the final walkthrough. Our client experience and project records are designed to make every detail feel considered.</p></div></section>

      <footer className="bg-[#1d2c25] px-6 py-10 text-[#e9eee6] lg:px-10" id="contact"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5"><div><p className="font-serif text-2xl">Ready to make your home memorable?</p><p className="mt-2 text-sm text-[#bac8bb]">Let’s talk about your sale and the space you want buyers to see.</p></div><a className="rounded-full bg-[#c9a662] px-6 py-3 text-sm font-semibold text-[#25342b]" href="tel:6123886499">Call 612.388.6499</a></div></footer>
    </main>
  );
}
