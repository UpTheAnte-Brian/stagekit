"use client";

import { useEffect, useState } from "react";

export type InventoryViewerPhoto = {
  id: string;
  alt: string;
  label?: string | null;
  src: string;
};

type InventoryPhotoViewerProps = {
  buttonClassName?: string;
  imageClassName: string;
  initialIndex?: number;
  photos: InventoryViewerPhoto[];
};

export function InventoryPhotoViewer({ buttonClassName, imageClassName, initialIndex = 0, photos }: InventoryPhotoViewerProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePhoto = activeIndex === null ? null : photos[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((current) => (current === null ? null : (current + 1) % photos.length));
      if (event.key === "ArrowLeft") setActiveIndex((current) => (current === null ? null : (current - 1 + photos.length) % photos.length));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, photos.length]);

  if (photos.length === 0) {
    return null;
  }

  const displayPhoto = photos[initialIndex] ?? photos[0];

  return (
    <>
      <button
        aria-label={`View ${displayPhoto.alt} larger`}
        className={buttonClassName ?? "block text-left"}
        onClick={() => setActiveIndex(initialIndex)}
        type="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={displayPhoto.alt} className={imageClassName} src={displayPhoto.src} suppressHydrationWarning />
      </button>

      {activePhoto ? (
        <div aria-label={`${activePhoto.alt} preview`} className="fixed inset-0 z-50 flex items-center justify-center bg-[#102a22]/90 p-5" role="dialog">
          <button aria-label="Close preview" className="absolute inset-0 cursor-default" onClick={() => setActiveIndex(null)} type="button" />
          <div className="relative z-10 flex max-h-full w-full max-w-6xl flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between gap-3 text-white">
              <p className="truncate text-sm font-medium">{activePhoto.label ?? activePhoto.alt}</p>
              <button className="rounded-lg border border-white/40 px-3 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => setActiveIndex(null)} type="button">
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={activePhoto.alt} className="max-h-[78vh] max-w-full rounded-xl bg-black object-contain" src={activePhoto.src} />
            {photos.length > 1 ? (
              <div className="flex gap-3">
                <button className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" onClick={() => setActiveIndex((current) => current === null ? null : (current - 1 + photos.length) % photos.length)} type="button">
                  Previous
                </button>
                <button className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" onClick={() => setActiveIndex((current) => current === null ? null : (current + 1) % photos.length)} type="button">
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
