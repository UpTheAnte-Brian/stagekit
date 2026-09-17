"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ComponentProps, type MouseEvent } from "react";

type PendingBlockLinkProps = ComponentProps<typeof Link> & {
  pendingLabel?: string;
};

function hrefToString(href: PendingBlockLinkProps["href"]) {
  return typeof href === "string" ? href : href.toString();
}

export function PendingBlockLink({ children, className, href, onClick, pendingLabel = "Opening…", ...props }: PendingBlockLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const currentSearch = searchParams.toString();
  const currentDestination = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
  const isPending = pendingDestination !== null && pendingDestination !== currentDestination;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    const target = event.currentTarget.getAttribute("target");
    if (target && target !== "_self") {
      return;
    }

    const destination = new URL(hrefToString(href), window.location.href);
    if (destination.href !== window.location.href) {
      setPendingDestination(`${destination.pathname}${destination.search}`);
    }
  }

  return (
    <Link {...props} aria-busy={isPending} className={`${className ?? ""} relative`} href={href} onClick={handleClick}>
      {children}
      {isPending ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-white/75 text-sm font-semibold text-foreground backdrop-blur-[1px]">
          <span className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-sm">
            <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>{pendingLabel}</span>
          </span>
        </span>
      ) : null}
    </Link>
  );
}
