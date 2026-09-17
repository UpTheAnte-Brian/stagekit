"use client";

import type { ComponentProps } from "react";

export function CloseDetailsButton({ children, onClick, ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        const details = event.currentTarget.closest("details");
        if (details) {
          details.open = false;
          details.dispatchEvent(new Event("toggle", { bubbles: true }));
        }
      }}
    >
      {children}
    </button>
  );
}
