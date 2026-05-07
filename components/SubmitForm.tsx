"use client";

import { useState, useRef } from "react";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
}

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function SubmitForm({ categories }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Image upload state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [imageError, setImageError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    const MAX = 5 * 1024 * 1024;

    if (!ALLOWED.includes(file.type)) {
      setImageError("Only JPEG, PNG, or WebP images are allowed.");
      setImageStatus("error");
      return;
    }
    if (file.size > MAX) {
      setImageError("Image must be 5 MB or smaller.");
      setImageStatus("error");
      return;
    }

    setImageStatus("uploading");
    setImageError("");

    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setImageError(data.error ?? "Upload failed.");
        setImageStatus("error");
      } else {
        setImageUrl(data.url);
        setImageStatus("done");
      }
    } catch {
      setImageError("Upload failed. Please try again.");
      setImageStatus("error");
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      title: data.get("title") as string,
      description: data.get("description") as string || undefined,
      is_free: data.get("is_free") === "true",
      price_range: data.get("price_range") as string || undefined,
      external_url: data.get("external_url") as string,
      category_id: data.get("category_id") as string || undefined,
      venue_name: data.get("venue_name") as string,
      venue_address: data.get("venue_address") as string || undefined,
      start_date: new Date(data.get("start_date") as string).toISOString(),
      end_date: data.get("end_date")
        ? new Date(data.get("end_date") as string).toISOString()
        : undefined,
      organizer_name: data.get("organizer_name") as string,
      organizer_email: data.get("organizer_email") as string,
      ...(imageUrl ? { banner_url: imageUrl } : {}),
    };

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(result.error ?? "Something went wrong. Please try again.");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl bg-green-50 p-8 text-center">
        <p className="text-2xl">🎉</p>
        <h2 className="mt-2 text-xl font-bold text-gray-900">Submission received!</h2>
        <p className="mt-2 text-gray-500">
          Thanks! We&apos;ll review your event and be in touch within 2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Event details */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Event details
        </legend>

        <Field label="Event title *" htmlFor="title">
          <input id="title" name="title" type="text" required maxLength={200}
            className={inputClass} placeholder="Jazz Night at the Library" />
        </Field>

        <Field label="Description" htmlFor="description">
          <textarea id="description" name="description" rows={4} maxLength={2000}
            className={inputClass} placeholder="Tell people what this event is about…" />
        </Field>

        <Field label="Category" htmlFor="category_id">
          <select id="category_id" name="category_id" className={inputClass}>
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Link to event / tickets *" htmlFor="external_url">
          <input id="external_url" name="external_url" type="url" required
            className={inputClass} placeholder="https://…" />
        </Field>

        {/* Banner image upload */}
        <div>
          <p className="mb-1 block text-sm font-medium text-gray-700">
            Event photo <span className="font-normal text-gray-400">(optional)</span>
          </p>

          {imageStatus === "done" && imageUrl ? (
            /* Preview */
            <div className="relative overflow-hidden rounded-xl border border-gray-200">
              <img
                src={imageUrl}
                alt="Event banner preview"
                className="h-48 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setImageUrl(null);
                  setImageStatus("idle");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
              >
                Remove
              </button>
            </div>
          ) : (
            /* Drop zone */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-sm transition-colors ${
                dragOver
                  ? "border-brand-400 bg-brand-50"
                  : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
              }`}
            >
              {imageStatus === "uploading" ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-gray-500">Uploading…</span>
                </>
              ) : (
                <>
                  <svg className="h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="font-medium text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-400">JPEG, PNG or WebP · max 5 MB</span>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {imageStatus === "error" && (
            <p className="mt-1 text-xs text-red-600">{imageError}</p>
          )}
        </div>
      </fieldset>

      {/* Date & time */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Date & time
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start *" htmlFor="start_date">
            <input id="start_date" name="start_date" type="datetime-local" required
              className={inputClass} />
          </Field>
          <Field label="End" htmlFor="end_date">
            <input id="end_date" name="end_date" type="datetime-local"
              className={inputClass} />
          </Field>
        </div>
      </fieldset>

      {/* Venue */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Location
        </legend>
        <Field label="Venue name *" htmlFor="venue_name">
          <input id="venue_name" name="venue_name" type="text" required
            className={inputClass} placeholder="Hackensack Public Library" />
        </Field>
        <Field label="Address" htmlFor="venue_address">
          <input id="venue_address" name="venue_address" type="text"
            className={inputClass} placeholder="574 Main St, Hackensack, NJ 07601" />
        </Field>
      </fieldset>

      {/* Pricing */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Pricing
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="radio" name="is_free" value="true" defaultChecked className="accent-brand-600" />
            Free
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="radio" name="is_free" value="false" className="accent-brand-600" />
            Paid
          </label>
        </div>
        <Field label="Price range (if paid)" htmlFor="price_range">
          <input id="price_range" name="price_range" type="text"
            className={inputClass} placeholder="e.g. $10–$25" />
        </Field>
      </fieldset>

      {/* Organizer */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          About you
        </legend>
        <Field label="Your name *" htmlFor="organizer_name">
          <input id="organizer_name" name="organizer_name" type="text" required
            className={inputClass} placeholder="Jane Smith" />
        </Field>
        <Field label="Your email *" htmlFor="organizer_email">
          <input id="organizer_email" name="organizer_email" type="email" required
            className={inputClass} placeholder="jane@example.com" />
          <p className="mt-1 text-xs text-gray-400">
            We&apos;ll send confirmation and status updates here.
          </p>
        </Field>
      </fieldset>

      {status === "error" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading" || imageStatus === "uploading"}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {status === "loading" ? "Submitting…" : "Submit event"}
      </button>

      <p className="text-center text-xs text-gray-400">
        By submitting you agree that the event is real, public, and taking place in Bergen County, NJ.
      </p>
    </form>
  );
}
