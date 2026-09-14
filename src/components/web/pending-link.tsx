"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ComponentProps, type MouseEvent } from "react";

type PendingLinkProps = ComponentProps<typeof Link> & {
  pendingLabel?: string;
};

function hrefToString(href: PendingLinkProps["href"]) {
  return typeof href === "string" ? href : href.toString();
}

export function PendingLink({ children, href, onClick, pendingLabel, ...props }: PendingLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const label = pendingLabel ?? "Loading…";
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
    <Link {...props} aria-busy={isPending} href={href} onClick={handleClick}>
      <span className="inline-flex items-center justify-center gap-2">
        {isPending ? (
          <span
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        <span>{isPending ? label : children}</span>
      </span>
    </Link>
  );
}
