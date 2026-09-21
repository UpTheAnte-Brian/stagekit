"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";

type Props = ComponentProps<"details"> & { storageKey: string; resetToken?: string; forceOpen?: boolean; lazyRender?: boolean };

// Session storage survives server-action redirects and refreshes in this tab.
export function PersistentDetails({ storageKey, resetToken, forceOpen = false, open = false, lazyRender = false, children, ...props }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [hasRenderedChildren, setHasRenderedChildren] = useState(open || forceOpen || !lazyRender);

  useEffect(() => {
    if (ref.current && (resetToken || forceOpen)) {
      ref.current.open = forceOpen;
      if (forceOpen) setHasRenderedChildren(true);
      try { sessionStorage.setItem(storageKey, String(forceOpen)); } catch {}
      return;
    }
    try {
      const saved = sessionStorage.getItem(storageKey);
      const nextOpen = saved === null ? open : saved === "true";
      if (ref.current) ref.current.open = nextOpen;
      if (nextOpen) setHasRenderedChildren(true);
    } catch {
      // Keep native accordion behavior when storage is unavailable.
    }
  }, [storageKey, open, resetToken, forceOpen]);

  return (
    <details {...props} ref={ref} open={open} onToggle={(event) => {
      if (event.currentTarget.open) setHasRenderedChildren(true);
      try { sessionStorage.setItem(storageKey, String(event.currentTarget.open)); } catch {}
    }}>
      {hasRenderedChildren ? children : null}
    </details>
  );
}
