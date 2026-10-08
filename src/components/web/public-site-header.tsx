"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";

const navigation = [
  { href: "#services", label: "Services", sectionId: "services" },
  { href: "#about", label: "About AJ", sectionId: "about" },
  { href: "#approach", label: "Our approach", sectionId: "approach" },
  { href: "#coverage", label: "Our work", sectionId: "coverage" },
];

export function PublicSiteHeader() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  function scrollToSection(sectionId: string, behavior: ScrollBehavior = "smooth") {
    document.getElementById(sectionId)?.scrollIntoView({ behavior, block: "start" });
  }

  useEffect(() => {
    const sections = navigation.map(({ sectionId }) => document.getElementById(sectionId)).filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver((entries) => {
      const visibleSection = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visibleSection) setActiveSection(visibleSection.target.id);
    }, { rootMargin: "-20% 0px -65%", threshold: [0, 0.1, 0.25] });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleHashChange() {
      const sectionId = window.location.hash.slice(1);
      if (!navigation.some((item) => item.sectionId === sectionId)) return;
      setActiveSection(sectionId);
      requestAnimationFrame(() => scrollToSection(sectionId, "auto"));
    }

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function handleNavigation(event: MouseEvent<HTMLAnchorElement>, sectionId: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    window.history.pushState(null, "", `#${sectionId}`);
    setActiveSection(sectionId);
    scrollToSection(sectionId);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#e1d9c9]/80 bg-[#f8f6f1]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link aria-label="AJ Home Staging home" className="group flex items-center gap-3" href="/">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-[#d8d0bd]"><img alt="" className="h-full w-full object-contain" src="/aj-home-favicon.png" /></span>
          <span><span className="block font-serif text-2xl tracking-[0.12em] text-[#1f2924]">AJ</span><span className="block text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[#9e7b39]">Home Staging</span></span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-3 text-sm font-medium md:flex">
          {navigation.map((item) => <a className={`rounded-full px-4 py-2 transition ${activeSection === item.sectionId ? "bg-[#efe7d5] text-[#665021]" : "text-[#48524c] hover:bg-[#efe7d5]/70 hover:text-[#1f2924]"}`} href={item.href} key={item.sectionId} onClick={(event) => handleNavigation(event, item.sectionId)}>{item.label}</a>)}
        </nav>
      </div>
    </header>
  );
}
