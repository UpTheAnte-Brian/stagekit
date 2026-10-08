"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOutAction } from "@/app/actions/auth";
import { PendingSubmitButton } from "@/components/web/pending-submit-button";
import { PendingBlockLink } from "@/components/web/pending-block-link";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const navItems: NavItem[] = [
  {
    href: "/inventory",
    label: "Inventory",
    description: "Items, photos, and status",
  },
  {
    href: "/jobs",
    label: "Jobs",
    description: "Projects and assignments",
  },
  {
    href: "/projects/map",
    label: "Map",
    description: "Project locations",
  },
  {
    href: "/pictures",
    label: "Pictures",
    description: "Public-ready image library",
  },
  {
    href: "/team",
    label: "Team",
    description: "Access and invitations",
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isPublicPage = pathname === "/" || pathname === "/work";

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (pathname === "/login") {
    return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">{children}</main>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link className="flex items-center gap-3 rounded-2xl pr-2" href="/inventory">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-border/80 shadow-sm">
                <Image alt="" aria-hidden height={32} priority src="/aj-home-favicon.png" width={32} />
              </span>
              <span>
                <span className="block text-lg font-semibold tracking-tight text-foreground">StageKit</span>
                <span className="block text-sm text-muted">Web workspace for inventory and job operations.</span>
              </span>
            </Link>
          </div>
          <details className="relative" onToggle={(event) => setIsMenuOpen(event.currentTarget.open)} open={isMenuOpen}><summary className="cursor-pointer list-none rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Menu <span aria-hidden>☰</span></summary><div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-border bg-white p-2 shadow-xl"><nav aria-label="Primary" className="space-y-1">{navItems.map((item) => { const active = isActivePath(pathname, item.href); return <PendingBlockLink key={item.href} className={`block rounded-xl px-3 py-2.5 ${active ? "bg-[#173f97] text-white" : "hover:bg-slate-50"}`} href={item.href} onClick={() => setIsMenuOpen(false)} pendingLabel={`Loading ${item.label}…`}><span className="block text-sm font-semibold">{item.label}</span><span className={`block text-xs ${active ? "text-blue-100" : "text-muted"}`}>{item.description}</span></PendingBlockLink>; })}</nav><div className="mt-2 flex gap-2 border-t border-border pt-2"><PendingBlockLink className="rounded-lg border border-[#c9b58a] px-3 py-2 text-sm font-semibold text-[#665021]" href="/" onClick={() => setIsMenuOpen(false)} pendingLabel="Opening site…">View AJ site</PendingBlockLink><form action={signOutAction}><PendingSubmitButton className="rounded-lg border border-border px-3 py-2 text-sm font-medium" pendingLabel="Signing out…">Sign out</PendingSubmitButton></form></div></div></details>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>

    </div>
  );
}
