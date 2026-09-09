"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useFormStatus } from "react-dom";

type ConsultMediaUploadFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  consultId: string;
  jobId: string;
};

type SelectedMedia = {
  isVideo: boolean;
  name: string;
  url: string;
};

function isConsultMedia(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/") || /\.(avif|gif|heic|heif|jpe?g|mov|mp4|m4v|png|webm)$/i.test(file.name);
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button className="rounded-xl border border-[#e3d0ba] bg-white px-3 py-2 text-sm font-semibold text-[#33413b] transition hover:bg-[#fffaf4] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
      {pending ? "Uploading…" : "Add media"}
    </button>
  );
}

export function ConsultMediaUploadForm({ action, consultId, jobId }: ConsultMediaUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);

  useEffect(() => {
    return () => selectedMedia.forEach((media) => URL.revokeObjectURL(media.url));
  }, [selectedMedia]);

  const syncFiles = (files: FileList | null) => {
    const media = Array.from(files ?? []).filter(isConsultMedia);
    setSelectedMedia(media.map((file) => ({
      isVideo: file.type.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(file.name),
      name: file.name,
      url: URL.createObjectURL(file),
    })));
    return media;
  };

  const assignFiles = (files: File[]) => {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const files = syncFiles(event.dataTransfer.files);
    if (files.length === 0) return;
    assignFiles(files);
    formRef.current?.requestSubmit();
  };

  return (
    <form action={action} className="mt-4" ref={formRef}>
      <input name="job_id" type="hidden" value={jobId} />
      <input name="consult_id" type="hidden" value={consultId} />
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
          isDragActive ? "border-[#c96f3d] bg-[#fff3e7]" : "border-[#ecdcc7] bg-[#fffaf4] hover:border-[#c96f3d]"
        }`}
        htmlFor={`consult-media-${consultId}`}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragActive(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDrop={handleDrop}
      >
        <input
          accept="image/*,video/*,.heic,.heif"
          className="sr-only"
          id={`consult-media-${consultId}`}
          multiple
          name="media"
          onChange={(event: ChangeEvent<HTMLInputElement>) => syncFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />
        <span className="text-sm font-semibold text-[#33413b]">Drop photos or video here, or choose files</span>
        <span className="mt-1 text-xs text-[#6f756c]">Photos and video up to 50MB each. Dropped files upload right away.</span>
        {selectedMedia.length > 0 ? <span className="mt-2 text-xs text-[#4e584f]">{selectedMedia.length === 1 ? selectedMedia[0].name : `${selectedMedia.length} files selected`}</span> : null}
      </label>
      {selectedMedia.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {selectedMedia.map((media) => (
            <a key={media.url} className="group relative h-28 overflow-hidden rounded-xl border border-[#ecdcc7] bg-[#20322a]" href={media.url} rel="noreferrer" target="_blank">
              {media.isVideo ? (
                <video className="h-full w-full object-cover" muted preload="metadata" src={media.url} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={media.name} className="h-full w-full object-cover transition group-hover:scale-[1.03]" src={media.url} />
              )}
              <span className="absolute bottom-1 right-1 rounded bg-[#16382d]/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">Preview</span>
            </a>
          ))}
        </div>
      ) : null}
      <div className="mt-3"><UploadButton /></div>
    </form>
  );
}
