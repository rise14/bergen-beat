"use client";

/**
 * ImageUpload
 *
 * Reusable drag-and-drop / click-to-upload image widget.
 * Uploads to /api/upload and calls onUrlChange with the resulting public URL.
 * Also allows admins to paste an external URL directly.
 *
 * Props:
 *   name        — hidden input name submitted with the form (e.g. "banner_url")
 *   initialUrl  — pre-fill with an existing image URL (edit mode)
 *   onUrlChange — called whenever the URL changes (upload or paste)
 *   showUrlFallback — show the "or paste a URL" input (default true for admin)
 */

import { useState, useRef } from "react";

interface Props {
  name: string;
  initialUrl?: string | null;
  onUrlChange?: (url: string) => void;
  showUrlFallback?: boolean;
  label?: string;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-navy-700" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function ImageUpload({
  name,
  initialUrl,
  onUrlChange,
  showUrlFallback = true,
  label = "Banner image",
}: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">(
    initialUrl ? "done" : "idle"
  );
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [urlError, setUrlError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function setFinalUrl(newUrl: string) {
    setUrl(newUrl);
    onUrlChange?.(newUrl);
  }

  async function uploadFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      setUploadError("Only JPEG, PNG, or WebP images are allowed.");
      setUploadState("error");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Image must be 5 MB or smaller.");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setUploadError("");

    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
        setUploadState("error");
      } else {
        setFinalUrl(data.url);
        setUploadState("done");
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
      setUploadState("error");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleRemove() {
    setFinalUrl("");
    setUploadState("idle");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <p className="block text-sm font-medium text-gray-700">
        {label} <span className="font-normal text-gray-400">(optional)</span>
      </p>

      {/* Hidden form input carries the URL on submit */}
      <input type="hidden" name={name} value={url} />

      {/* ── Preview ── */}
      {uploadState === "done" && url ? (
        <div className="relative overflow-hidden rounded-xl border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Banner preview"
            className="h-48 w-full object-cover"
            onError={() => setUrlError(true)}
          />
          {urlError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-xs text-red-500">
              Image failed to load — try a different URL.
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/70 transition-colors"
          >
            Remove
          </button>
        </div>
      ) : (
        /* ── Upload zone ── */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-sm transition-colors ${
            dragOver
              ? "border-navy-600 bg-cream-50"
              : "border-gray-200 hover:border-navy-600 hover:bg-gray-50"
          }`}
        >
          {uploadState === "uploading" ? (
            <>
              <Spinner />
              <p className="text-gray-500">Uploading…</p>
            </>
          ) : uploadState === "error" ? (
            <>
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-red-500">{uploadError}</p>
              <p className="text-xs text-gray-400">Click to try again</p>
            </>
          ) : (
            <>
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-gray-500">
                <span className="font-semibold text-navy-700">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400">JPEG, PNG, or WebP — max 5 MB</p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── URL fallback (admin only) ── */}
      {showUrlFallback && uploadState !== "done" && (
        <div>
          <p className="mb-1 text-xs text-gray-400">
            Or paste an external image URL:
          </p>
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={url}
            onChange={(e) => {
              setFinalUrl(e.target.value);
              setUrlError(false);
              if (e.target.value) setUploadState("done");
              else setUploadState("idle");
            }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
