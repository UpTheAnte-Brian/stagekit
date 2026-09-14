"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

export function PendingSubmitButton({ children, className, disabled, name, pendingLabel = "Saving…", value, ...props }: ComponentProps<"button"> & { pendingLabel?: string }) {
  const { data, pending } = useFormStatus();
  const isPendingSubmitter = pending && (!name || value === undefined || data?.get(name) === String(value));

  return <button {...props} className={className} name={name} type="submit" value={value} disabled={disabled || pending} aria-busy={isPendingSubmitter}>
    <span className="inline-flex items-center justify-center gap-2">
      {isPendingSubmitter ? (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      <span>{isPendingSubmitter ? pendingLabel : children}</span>
    </span>
  </button>;
}
