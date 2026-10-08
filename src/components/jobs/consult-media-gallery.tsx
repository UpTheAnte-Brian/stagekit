"use client";

import { useEffect, useState } from "react";

import { PendingSubmitButton } from "@/components/web/pending-submit-button";

type ConsultMedia = {
  id: string;
  file_name: string;
  is_video: boolean;
  portfolio_candidate: boolean;
  portfolio_cover: boolean;
  room_label: string | null;
  url: string | null;
};

type ConsultMediaGalleryProps = {
  action: (formData: FormData) => void | Promise<void>;
  candidateAction?: (formData: FormData) => void | Promise<void>;
  coverAction?: (formData: FormData) => void | Promise<void>;
  isPublicEligible?: boolean;
  jobId: string;
  media: ConsultMedia[];
  roomOptions?: string[];
  roomAction?: (formData: FormData) => void | Promise<void>;
};

export function ConsultMediaGallery({ action, candidateAction, coverAction, isPublicEligible = false, jobId, media, roomOptions = [], roomAction }: ConsultMediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeMedia = activeIndex === null ? null : media[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((current) => (current === null ? null : (current + 1) % media.length));
      if (event.key === "ArrowLeft") setActiveIndex((current) => (current === null ? null : (current - 1 + media.length) % media.length));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, media.length]);

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {media.map((item, index) => (
          <div className="scroll-mt-6 overflow-hidden rounded-xl border border-[#ecdcc7] bg-[#fffaf4]" id={`media-${item.id}`} key={item.id}>
            <button className="relative block h-44 w-full overflow-hidden bg-[#20322a] text-left" onClick={() => setActiveIndex(index)} type="button">
              {item.url ? (
                item.is_video ? (
                  <video className="h-full w-full object-cover" muted preload="metadata" src={item.url} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={item.file_name} className="h-full w-full object-cover transition hover:scale-[1.02]" loading="lazy" src={item.url} />
                )
              ) : (
                <span className="flex h-full items-center justify-center text-sm text-[#d8e6dd]">Preview unavailable</span>
              )}
              <span className="absolute bottom-2 right-2 rounded-full bg-[#16382d]/85 px-2 py-1 text-xs font-semibold text-white">{item.is_video ? "Play" : "View"}</span>
            </button>
            <div className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#33413b]">{item.file_name}</p>
                {roomAction ? (
                  <form action={roomAction} className="mt-3">
                    <input name="job_id" type="hidden" value={jobId} />
                    <input name="media_id" type="hidden" value={item.id} />
                    <label className="block text-xs font-semibold text-[#526158]" htmlFor={`room-${item.id}`}>Room</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input aria-label={`Room for ${item.file_name}`} className="min-w-0 flex-1 rounded-md border border-[#c9b58a] bg-white px-2 py-1.5 text-xs" defaultValue={item.room_label ?? ""} id={`room-${item.id}`} list={`project-rooms-${item.id}`} name="room_label" placeholder="Choose or type a room" />
                      <datalist id={`project-rooms-${item.id}`}>
                        {roomOptions.map((room) => <option key={room} value={room} />)}
                      </datalist>
                      <PendingSubmitButton className="shrink-0 rounded-md bg-[#254238] px-2 py-1.5 text-xs font-semibold text-white hover:bg-[#16382d]" pendingLabel="Saving…">Save</PendingSubmitButton>
                    </div>
                  </form>
                ) : item.room_label ? <p className="mt-1 text-xs font-medium text-[#60766a]">{item.room_label}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                {isPublicEligible && candidateAction ? (
                  <form action={candidateAction}>
                    <input name="job_id" type="hidden" value={jobId} />
                    <input name="media_id" type="hidden" value={item.id} />
                    <input name="selected" type="hidden" value={item.portfolio_candidate ? "false" : "true"} />
                    <PendingSubmitButton className={item.portfolio_candidate ? "text-xs font-semibold text-[#76531e] hover:underline" : "text-xs font-semibold text-[#254238] hover:underline"} pendingLabel="Saving…">
                      {item.portfolio_candidate ? "Shortlisted" : "Shortlist"}
                    </PendingSubmitButton>
                  </form>
                ) : null}
                {isPublicEligible && !item.is_video && coverAction ? (
                  <form action={coverAction}>
                    <input name="job_id" type="hidden" value={jobId} />
                    <input name="media_id" type="hidden" value={item.id} />
                    <PendingSubmitButton className={item.portfolio_cover ? "text-xs font-semibold text-[#a7502d] hover:underline" : "text-xs font-semibold text-[#254238] hover:underline"} pendingLabel="Saving…">
                      {item.portfolio_cover ? "Portfolio cover" : "Set cover"}
                    </PendingSubmitButton>
                  </form>
                ) : null}
                <form action={action}>
                  <input name="job_id" type="hidden" value={jobId} />
                  <input name="media_id" type="hidden" value={item.id} />
                  <PendingSubmitButton className="text-xs font-semibold text-[#a7502d] hover:underline" pendingLabel="Removing…">Remove</PendingSubmitButton>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeMedia?.url ? (
        <div aria-label={`${activeMedia.file_name} preview`} className="fixed inset-0 z-50 flex items-center justify-center bg-[#102a22]/90 p-5" role="dialog">
          <button aria-label="Close preview" className="absolute inset-0 cursor-default" onClick={() => setActiveIndex(null)} type="button" />
          <div className="relative z-10 flex max-h-full w-full max-w-6xl flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between gap-3 text-white">
              <p className="truncate text-sm font-medium">{activeMedia.file_name}</p>
              <button className="rounded-lg border border-white/40 px-3 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => setActiveIndex(null)} type="button">Close</button>
            </div>
            {activeMedia.is_video ? (
              <video className="max-h-[78vh] max-w-full rounded-xl bg-black" controls autoPlay src={activeMedia.url} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={activeMedia.file_name} className="max-h-[78vh] max-w-full rounded-xl object-contain" src={activeMedia.url} />
            )}
            {media.length > 1 ? (
              <div className="flex gap-3">
                <button className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" onClick={() => setActiveIndex((current) => current === null ? null : (current - 1 + media.length) % media.length)} type="button">Previous</button>
                <button className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" onClick={() => setActiveIndex((current) => current === null ? null : (current + 1) % media.length)} type="button">Next</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
