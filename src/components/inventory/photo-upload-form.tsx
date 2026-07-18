"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useFormStatus } from "react-dom";

type PhotoUploadFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  itemId: string;
  returnTo: string;
};

function isLikelyImageFile(file: File) {
  if (file.type.startsWith("image/")) {
    return true;
  }

  return /\.(avif|gif|heic|heif|jpeg|jpg|png|webp)$/i.test(file.name);
}

function UploadButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Uploading..." : "Upload"}
    </button>
  );
}

export function PhotoUploadForm({ action, itemId, returnTo }: PhotoUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const syncFiles = (files: FileList | null) => {
    const nextFiles = Array.from(files ?? []).filter(isLikelyImageFile);
    setSelectedFiles(nextFiles.map((file) => file.name));
    return nextFiles;
  };

  const assignFilesToInput = (files: File[]) => {
    if (!inputRef.current) {
      return;
    }

    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    syncFiles(event.target.files);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);

    const files = syncFiles(event.dataTransfer.files);
    if (files.length === 0) {
      return;
    }

    assignFilesToInput(files);
    formRef.current?.requestSubmit();
  };

  return (
    <form action={action} className="mt-3 space-y-3" ref={formRef}>
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <label
        className={[
          "flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
          isDragActive ? "border-accent bg-blue-50" : "border-border bg-slate-50 hover:border-accent/60 hover:bg-blue-50/60",
        ].join(" ")}
        htmlFor="photo-upload-input"
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          accept="image/*"
          className="sr-only"
          id="photo-upload-input"
          multiple
          name="photo"
          onChange={handleFileChange}
          ref={inputRef}
          type="file"
        />
        <span className="text-sm font-medium text-slate-900">Drag photos here from Photos or click to browse</span>
        <span className="mt-1 text-xs text-muted">Shared album drags bypass the macOS picker. You can drop one or multiple images.</span>
        {selectedFiles.length > 0 ? (
          <span className="mt-3 text-xs text-slate-700">
            {selectedFiles.length === 1 ? selectedFiles[0] : `${selectedFiles.length} files selected`}
          </span>
        ) : null}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <UploadButton />
        <p className="text-xs text-muted">Dropped files start uploading immediately. Button upload still works after manual selection.</p>
      </div>
    </form>
  );
}
