"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/types";
import { ImageUpload } from "@/components/ImageUpload";

interface Props {
  categories: Category[];
}

const inputClass =
  "w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-navy-800 placeholder-walnut/40 focus:border-navy-800 focus:outline-none";

const legendClass =
  "text-xs font-semibold uppercase tracking-wider text-walnut/60";

function Field({
  label,
  htmlFor,
  children,
  hint,
  required,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-navy-800">
        {label}
        {required && <span className="ml-0.5 text-accent-orange">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-walnut/50">{hint}</p>}
    </div>
  );
}

export function SubmitForm({ categories }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      title:          data.get("title") as string,
      description:    (data.get("description") as string) || undefined,
      is_free:        data.get("is_free") === "true",
      price_range:    (data.get("price_range") as string) || undefined,
      external_url:   data.get("external_url") as string,
      category_id:    (data.get("category_id") as string) || undefined,
      venue_name:     data.get("venue_name") as string,
      venue_address:  (data.get("venue_address") as string) || undefined,
      start_date:     new Date(data.get("start_date") as string).toISOString(),
      end_date:       data.get("end_date")
                        ? new Date(data.get("end_date") as string).toISOString()
                        : undefined,
      organizer_name:  data.get("organizer_name") as string,
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
        router.push("/submit/success");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Event details ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-cream-200 bg-white p-5 space-y-4">
        <p className={legendClass}>Event details</p>

        <Field label="Event title" htmlFor="title" required>
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

        <Field label="Link to event / tickets" htmlFor="external_url" required>
          <input id="external_url" name="external_url" type="url" required
            className={inputClass} placeholder="https://…" />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-navy-800">Event banner image</p>
          <ImageUpload
            name="_banner_upload"
            onUrlChange={(url) => setImageUrl(url || null)}
            showUrlFallback={false}
            label="Upload a photo (optional — 1200×630 px recommended)"
          />
        </div>
      </section>

      {/* ── Date & time ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-cream-200 bg-white p-5 space-y-4">
        <p className={legendClass}>Date &amp; time</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start" htmlFor="start_date" required>
            <input id="start_date" name="start_date" type="datetime-local" required
              className={inputClass} />
          </Field>
          <Field label="End" htmlFor="end_date">
            <input id="end_date" name="end_date" type="datetime-local"
              className={inputClass} />
          </Field>
        </div>
      </section>

      {/* ── Location ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-cream-200 bg-white p-5 space-y-4">
        <p className={legendClass}>Location</p>
        <Field label="Venue name" htmlFor="venue_name" required>
          <input id="venue_name" name="venue_name" type="text" required
            className={inputClass} placeholder="Hackensack Public Library" />
        </Field>
        <Field label="Address" htmlFor="venue_address">
          <input id="venue_address" name="venue_address" type="text"
            className={inputClass} placeholder="574 Main St, Hackensack, NJ 07601" />
        </Field>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-cream-200 bg-white p-5 space-y-4">
        <p className={legendClass}>Pricing</p>
        <div className="flex gap-5">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-navy-800">
            <input type="radio" name="is_free" value="true" defaultChecked
              onChange={() => setIsFree(true)}
              className="accent-navy-800" />
            Free
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-navy-800">
            <input type="radio" name="is_free" value="false"
              onChange={() => setIsFree(false)}
              className="accent-navy-800" />
            Paid
          </label>
        </div>
        {!isFree && (
          <Field label="Price range" htmlFor="price_range">
            <input id="price_range" name="price_range" type="text"
              className={inputClass} placeholder="e.g. $10–$25" />
          </Field>
        )}
      </section>

      {/* ── About you ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-cream-200 bg-white p-5 space-y-4">
        <p className={legendClass}>About you</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Your name" htmlFor="organizer_name" required>
            <input id="organizer_name" name="organizer_name" type="text" required
              className={inputClass} placeholder="Jane Smith" />
          </Field>
          <Field label="Your email" htmlFor="organizer_email" required>
            <input id="organizer_email" name="organizer_email" type="email" required
              className={inputClass} placeholder="jane@example.com" />
          </Field>
        </div>
        <p className="text-xs text-walnut/50">
          We&apos;ll send confirmation here. Your email is never shared publicly.
        </p>
      </section>

      {/* Error */}
      {status === "error" && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-navy-800 py-3.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors disabled:opacity-60"
      >
        {status === "loading" ? "Submitting…" : "Submit event →"}
      </button>

      <p className="text-center text-xs text-walnut/50">
        By submitting you confirm this is a real, public event in or near Bergen County, NJ.
      </p>
    </form>
  );
}
