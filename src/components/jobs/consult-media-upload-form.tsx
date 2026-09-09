"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useFormStatus } from "react-dom";

type ConsultMediaUploadFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  consultId: string;
  jobId: string;
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
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const syncFiles = (files: FileList | null) => {
    const media = Array.from(files ?? []).filter(isConsultMedia);
    setSelectedFiles(media.map((file) => file.name));
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
        {selectedFiles.length > 0 ? <span className="mt-2 text-xs text-[#4e584f]">{selectedFiles.length === 1 ? selectedFiles[0] : `${selectedFiles.length} files selected`}</span> : null}
      </label>
      <div className="mt-3"><UploadButton /></div>
    </form>
  );
}
