"use client";

import { useEffect, useState } from "react";

type RoomReferenceMedia = {
  id: string;
  file_name: string;
  url: string | null;
};

export function RoomReferenceGallery({ media, roomLabel }: { media: RoomReferenceMedia[]; roomLabel: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeMedia = activeIndex === null ? null : media[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((current) => current === null ? null : (current + 1) % media.length);
      if (event.key === "ArrowLeft") setActiveIndex((current) => current === null ? null : (current - 1 + media.length) % media.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, media.length]);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto rounded-2xl border border-[#d8e6dd] bg-[#f7fbf8] p-3">
        {media.map((item, index) => (
          <button aria-label={`View ${roomLabel} reference photo ${index + 1}`} className="relative block h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-[#cfe0d4] bg-[#20322a] text-left" key={item.id} onClick={() => setActiveIndex(index)} type="button">
            {item.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={`${roomLabel} reference: ${item.file_name}`} className="h-full w-full object-cover transition hover:scale-[1.03]" loading="lazy" src={item.url} />
            ) : <span className="flex h-full items-center justify-center p-2 text-center text-xs text-white">Preview unavailable</span>}
            <span className="absolute bottom-1 right-1 rounded-full bg-[#16382d]/85 px-2 py-1 text-[10px] font-semibold text-white">View</span>
          </button>
        ))}
        <p className="min-w-36 self-center text-sm leading-5 text-[#4e584f]">{roomLabel} reference photos<br /><span className="text-xs text-[#6f756c]">Click to browse</span></p>
      </div>

      {activeMedia?.url ? (
        <div aria-label={`${activeMedia.file_name} preview`} className="fixed inset-0 z-50 flex items-center justify-center bg-[#102a22]/90 p-5" role="dialog">
          <button aria-label="Close preview" className="absolute inset-0 cursor-default" onClick={() => setActiveIndex(null)} type="button" />
          <div className="relative z-10 flex max-h-full w-full max-w-6xl flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between gap-3 text-white"><p className="truncate text-sm font-medium">{activeMedia.file_name}</p><button className="rounded-lg border border-white/40 px-3 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => setActiveIndex(null)} type="button">Close</button></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={`${roomLabel} reference: ${activeMedia.file_name}`} className="max-h-[78vh] max-w-full rounded-xl object-contain" src={activeMedia.url} />
            {media.length > 1 ? <div className="flex gap-3"><button className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" onClick={() => setActiveIndex((current) => current === null ? null : (current - 1 + media.length) % media.length)} type="button">Previous</button><button className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" onClick={() => setActiveIndex((current) => current === null ? null : (current + 1) % media.length)} type="button">Next</button></div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
