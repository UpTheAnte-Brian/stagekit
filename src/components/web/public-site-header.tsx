import Link from "next/link";

export function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e1d9c9]/80 bg-[#f8f6f1]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <Link aria-label="AJ Home Staging home" className="group flex items-center gap-3" href="/">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-[#d8d0bd]"><img alt="" className="h-full w-full object-contain" src="/aj-home-favicon.png" /></span>
          <span><span className="block font-serif text-2xl tracking-[0.12em] text-[#1f2924]">AJ</span><span className="block text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[#9e7b39]">Home Staging</span></span>
        </Link>
        <a className="rounded-full bg-[#283a31] px-5 py-2.5 text-sm font-semibold text-[#fffdf8] shadow-sm transition hover:bg-[#1d2c25]" href="#contact">Start a conversation</a>
      </div>
    </header>
  );
}
