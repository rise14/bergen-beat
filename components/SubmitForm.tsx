"use client";

import { useState } from "react";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
}

export function SubmitForm({ categories }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      title: data.get("title") as string,
      description: data.get("description") as string,
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
        disabled={status === "loading"}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}
