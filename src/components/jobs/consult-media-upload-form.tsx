"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const MAX_CONSULT_MEDIA_BYTES = 1024 * 1024 * 1024;

type ConsultMediaUploadFormProps = {
  createUploadUrl: (formData: FormData) => Promise<{ storagePath: string; token: string }>;
  registerMedia: (formData: FormData) => void | Promise<void>;
  consultId: string;
  jobId: string;
};

type SelectedMedia = {
  file: File;
  isVideo: boolean;
  name: string;
  url: string;
};

function isConsultMedia(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/") || /\.(avif|gif|heic|heif|jpe?g|mov|mp4|m4v|png|webm)$/i.test(file.name);
}

function mediaContentType(file: File) {
  if (file.type) return file.type;
  if (/\.(mov|mp4|m4v)$/i.test(file.name)) return "video/mp4";
  if (/\.webm$/i.test(file.name)) return "video/webm";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.gif$/i.test(file.name)) return "image/gif";
  return "image/jpeg";
}

export function ConsultMediaUploadForm({ createUploadUrl, registerMedia, consultId, jobId }: ConsultMediaUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);

  useEffect(() => () => selectedMedia.forEach((media) => URL.revokeObjectURL(media.url)), [selectedMedia]);

  const syncFiles = (files: FileList | null) => {
    const media = Array.from(files ?? []).filter(isConsultMedia);
    const oversizedFile = media.find((file) => file.size > MAX_CONSULT_MEDIA_BYTES);
    if (oversizedFile) {
      setMessage(`${oversizedFile.name} is larger than 1GB.`);
      return [];
    }
    setMessage(null);
    setSelectedMedia(media.map((file) => ({
      file,
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
    if (files.length > 0) assignFiles(files);
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedMedia.length === 0 || isUploading) return;

    setIsUploading(true);
    setMessage(null);
    setUploadStatus("Preparing upload…");
    const supabase = createBrowserSupabaseClient();

    try {
      for (const [index, media] of selectedMedia.entries()) {
        const contentType = mediaContentType(media.file);
        const metadata = new FormData();
        metadata.set("job_id", jobId);
        metadata.set("consult_id", consultId);
        metadata.set("file_name", media.name);
        metadata.set("content_type", contentType);
        metadata.set("file_size_bytes", String(media.file.size));
        const { storagePath, token } = await createUploadUrl(metadata);

        setUploadStatus(`Uploading ${index + 1} of ${selectedMedia.length}: ${media.name}`);
        const { error: uploadError } = await supabase.storage.from("job-consults").uploadToSignedUrl(storagePath, token, media.file, {
          cacheControl: "31536000",
          contentType,
        });
        if (uploadError) throw new Error(uploadError.message);

        setUploadStatus(`Saving ${index + 1} of ${selectedMedia.length}: ${media.name}`);
        metadata.set("storage_path", storagePath);
        await registerMedia(metadata);
      }

      setSelectedMedia([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
    }
  };

  const buttonLabel = isUploading ? "Uploading…" : selectedMedia.length === 0 ? "Choose media to upload" : selectedMedia.length === 1 ? "Upload 1 file" : `Upload ${selectedMedia.length} files`;

  return (
    <form className="mt-4" onSubmit={handleUpload} ref={formRef}>
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
          onChange={(event: ChangeEvent<HTMLInputElement>) => syncFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />
        <span className="text-sm font-semibold text-[#33413b]">Drop photos or video here, or choose files</span>
        <span className="mt-1 text-xs text-[#6f756c]">Photos and videos up to 1GB each upload directly from this browser.</span>
        {selectedMedia.length > 0 ? <span className="mt-2 text-xs text-[#4e584f]">{selectedMedia.length === 1 ? selectedMedia[0].name : `${selectedMedia.length} files selected`}</span> : null}
      </label>
      {selectedMedia.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {selectedMedia.map((media) => (
            <a key={media.url} className="group relative h-28 overflow-hidden rounded-xl border border-[#ecdcc7] bg-[#20322a]" href={media.url} rel="noreferrer" target="_blank">
              {media.isVideo ? <video className="h-full w-full object-cover" muted preload="metadata" src={media.url} /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={media.name} className="h-full w-full object-cover transition group-hover:scale-[1.03]" src={media.url} />
              )}
              <span className="absolute bottom-1 right-1 rounded bg-[#16382d]/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">Preview</span>
            </a>
          ))}
        </div>
      ) : null}
      {message ? <p className="mt-3 text-sm font-medium text-[#a7502d]">{message}</p> : null}
      {uploadStatus ? <p aria-live="polite" className="mt-3 text-sm font-medium text-[#4e584f]">{uploadStatus}</p> : null}
      <div className="mt-3">
        <button className="rounded-xl border border-[#e3d0ba] bg-white px-3 py-2 text-sm font-semibold text-[#33413b] transition hover:bg-[#fffaf4] disabled:cursor-not-allowed disabled:opacity-50" disabled={isUploading || selectedMedia.length === 0} type="submit">{buttonLabel}</button>
      </div>
    </form>
  );
}
