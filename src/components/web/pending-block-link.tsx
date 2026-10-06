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
    <Link {...props} aria-busy={isPending} className={className} href={href} onClick={handleClick}>
      <span className="inline-flex items-center justify-center gap-2">
        {isPending ? <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
        <span>{isPending ? pendingLabel : children}</span>
      </span>
    </Link>
  );
}
