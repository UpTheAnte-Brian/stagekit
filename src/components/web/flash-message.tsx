"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type FlashMessageTone = "success" | "warning" | "error" | "info";

const toneClasses: Record<FlashMessageTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  error: "border-rose-200 bg-rose-50 text-rose-950",
  info: "border-blue-200 bg-blue-50 text-blue-950",
};

const toneLabels: Record<FlashMessageTone, string> = {
  success: "Success",
  warning: "Notice",
  error: "Something needs attention",
  info: "Update",
};

export function FlashMessage({
  message,
  tone = "success",
  durationMs,
  clearSearchParams = [],
}: {
  message: string;
  tone?: FlashMessageTone;
  durationMs?: number;
  clearSearchParams?: string[];
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const clearTimer = useRef<number | null>(null);
  const dismissTimer = useRef<number | null>(null);
  const isDismissing = useRef(false);
  const duration = durationMs ?? (tone === "error" ? 8000 : 4500);
  const clearSearchParamsKey = clearSearchParams.join(",");

  const dismiss = useCallback(() => {
    if (isDismissing.current) {
      return;
    }

    isDismissing.current = true;
    setVisible(false);
    if (dismissTimer.current !== null) {
      window.clearTimeout(dismissTimer.current);
    }

    clearTimer.current = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete("message");
      clearSearchParamsKey
        .split(",")
        .filter(Boolean)
        .forEach((param) => searchParams.delete(param));
      const search = searchParams.toString();
      router.replace(`${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`, { scroll: false });
    }, 220);
  }, [clearSearchParamsKey, router]);

  useEffect(() => {
    dismissTimer.current = window.setTimeout(dismiss, duration);

    return () => {
      if (dismissTimer.current !== null) {
        window.clearTimeout(dismissTimer.current);
      }
      if (clearTimer.current !== null) {
        window.clearTimeout(clearTimer.current);
      }
    };
  }, [dismiss, duration]);

  return (
    <div
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm transition-all duration-200 ease-out ${toneClasses[tone]} ${visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{toneLabels[tone]}</p>
        <p className="mt-0.5">{message}</p>
      </div>
      <button aria-label="Dismiss message" className="-mr-1 -mt-1 rounded-md px-2 py-1 text-lg leading-none opacity-70 transition hover:bg-black/5 hover:opacity-100" onClick={dismiss} type="button">
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
