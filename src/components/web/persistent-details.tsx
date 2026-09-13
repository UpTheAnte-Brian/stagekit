"use client";

import { useEffect, useRef, type ComponentProps } from "react";

type Props = ComponentProps<"details"> & { storageKey: string; resetToken?: string; forceOpen?: boolean };

// Session storage survives server-action redirects and refreshes in this tab.
export function PersistentDetails({ storageKey, resetToken, forceOpen = false, open = false, children, ...props }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current && (resetToken || forceOpen)) {
      ref.current.open = forceOpen;
      try { sessionStorage.setItem(storageKey, String(forceOpen)); } catch {}
      return;
    }
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (ref.current) ref.current.open = saved === null ? open : saved === "true";
    } catch {
      // Keep native accordion behavior when storage is unavailable.
    }
  }, [storageKey, open, resetToken, forceOpen]);

  return (
    <details {...props} ref={ref} open={open} onToggle={(event) => {
      try { sessionStorage.setItem(storageKey, String(event.currentTarget.open)); } catch {}
    }}>
      {children}
    </details>
  );
}
