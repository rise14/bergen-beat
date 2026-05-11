"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { Category, Neighborhood, Event } from "@/types";
import { ImageUpload } from "@/components/ImageUpload";

interface Props {
  categories: Category[];
  neighborhoods: Neighborhood[];
  initialValues?: Partial<Event> & {
    venue_name?: string;
    venue_address?: string;
    venue_city?: string;
  };
  action: (formData: FormData) => Promise<void>;
  saved?: boolean;
  created?: boolean;
}

interface DuplicateHit {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  status: string;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none";

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

export function EventForm({
  categories,
  neighborhoods,
  initialValues = {},
  action,
  saved,
  created,
}: Props) {
  const isEdit = Boolean(initialValues.id);
  const formRef = useRef<HTMLFormElement>(null);

  // ── Duplicate detection state ──────────────────────────────────────────────
  const [title, setTitle] = useState(initialValues.title ?? "");
  const [startDate, setStartDate] = useState(initialValues.start_date?.slice(0, 16) ?? "");

  const [duplicates, setDuplicates] = useState<DuplicateHit[]>([]);
  const [dismissedDupes, setDismissedDupes] = useState(false);

  const checkDuplicates = useCallback(async (t: string, d: string) => {
    if (t.trim().length < 4) {
      setDuplicates([]);
      return;
    }
    const params = new URLSearchParams({ title: t, date: d });
    if (initialValues.id) params.set("excludeId", initialValues.id);
    try {
      const res = await fetch(`/api/admin/check-duplicate?${params.toString()}`);
      const json = await res.json();
      setDuplicates(json.duplicates ?? []);
    } catch {
      // silently ignore — duplicate check is advisory only
    }
  }, [initialValues.id]);

  // Debounce: wait 600 ms after the last keystroke before hitting the API
  useEffect(() => {
    setDismissedDupes(false);
    const timer = setTimeout(() => checkDuplicates(title, startDate), 600);
    return () => clearTimeout(timer);
  }, [title, startDate, checkDuplicates]);

  const showDupeWarning = duplicates.length > 0 && !dismissedDupes;

  return (
    <form ref={formRef} action={action} className="space-y-8 max-w-2xl">

      {/* Success banner */}
      {(saved || created) && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {created ? "Event created successfully." : "Changes saved."}
        </div>
      )}

      {/* Duplicate warning */}
      {showDupeWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">Possible duplicate{duplicates.length > 1 ? "s" : ""} detected</p>
              <ul className="mt-1.5 space-y-1">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <a
                      href={`/admin/events/${d.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-amber-900"
                    >
                      {d.title}
                    </a>
                    {" — "}
                    {new Date(d.start_date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                    {" "}
                    <span className="text-amber-600">({d.status})</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setDismissedDupes(true)}
              className="shrink-0 text-amber-500 hover:text-amber-700"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Basic info ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Basic info
        </h2>

        <Field label="Title *" htmlFor="title">
          <input
            id="title" name="title" type="text" required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Slug *" htmlFor="slug"
          hint="Auto-generated from title + date. Edit only if needed.">
          <input id="slug" name="slug" type="text" required
            defaultValue={initialValues.slug}
            className={inputClass} />
        </Field>

        <Field label="Short description" htmlFor="short_description"
          hint="1–2 sentences shown on event cards and in Google previews.">
          <input id="short_description" name="short_description" type="text"
            defaultValue={initialValues.short_description ?? ""}
            className={inputClass} />
        </Field>

        <Field label="Full description" htmlFor="description">
          <textarea id="description" name="description" rows={6}
            defaultValue={initialValues.description ?? ""}
            className={inputClass} />
        </Field>

        <Field label="Link to event / tickets *" htmlFor="external_url"
          hint="The organizer's own page. Bergen Beat links out — no ticketing here.">
          <input id="external_url" name="external_url" type="url"
            defaultValue={initialValues.external_url ?? ""}
            className={inputClass} />
        </Field>

        <ImageUpload
          name="banner_url"
          initialUrl={initialValues.banner_url}
          onUrlChange={() => {}}
          showUrlFallback={true}
        />
      </section>

      {/* ── Classification ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Classification
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" htmlFor="category_id">
            <select id="category_id" name="category_id" className={inputClass}
              defaultValue={initialValues.category_id ?? ""}>
              <option value="">— None —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Neighborhood" htmlFor="neighborhood_id">
            <select id="neighborhood_id" name="neighborhood_id" className={inputClass}
              defaultValue={initialValues.neighborhood_id ?? ""}>
              <option value="">— None —</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* ── Date & time ────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Date & time
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start *" htmlFor="start_date">
            <input
              id="start_date" name="start_date" type="datetime-local" required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="End" htmlFor="end_date">
            <input id="end_date" name="end_date" type="datetime-local"
              defaultValue={initialValues.end_date?.slice(0, 16)}
              className={inputClass} />
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_recurring" name="is_recurring"
            defaultChecked={initialValues.is_recurring}
            className="accent-navy-800" />
          <label htmlFor="is_recurring" className="text-sm text-gray-700">
            Recurring event
          </label>
        </div>

        <Field label="Recurrence note" htmlFor="recurrence_note"
          hint='e.g. "Every Sunday through June"'>
          <input id="recurrence_note" name="recurrence_note" type="text"
            defaultValue={initialValues.recurrence_note ?? ""}
            className={inputClass} />
        </Field>
      </section>

      {/* ── Venue ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Venue
        </h2>
        <Field label="Venue name" htmlFor="venue_name"
          hint="If the venue already exists it will be matched automatically.">
          <input id="venue_name" name="venue_name" type="text"
            defaultValue={initialValues.venue_name ?? ""}
            className={inputClass} placeholder="Hackensack Public Library" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Address" htmlFor="venue_address">
            <input id="venue_address" name="venue_address" type="text"
              defaultValue={initialValues.venue_address ?? ""}
              className={inputClass} placeholder="574 Main St" />
          </Field>
          <Field label="City" htmlFor="venue_city">
            <input id="venue_city" name="venue_city" type="text"
              defaultValue={initialValues.venue_city ?? ""}
              className={inputClass} placeholder="Hackensack" />
          </Field>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Pricing
        </h2>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_free" name="is_free"
            defaultChecked={initialValues.is_free}
            className="accent-navy-800" />
          <label htmlFor="is_free" className="text-sm text-gray-700">Free event</label>
        </div>
        <Field label="Price range" htmlFor="price_range">
          <input id="price_range" name="price_range" type="text"
            defaultValue={initialValues.price_range ?? ""}
            className={inputClass} placeholder="e.g. $10–$25" />
        </Field>
      </section>

      {/* ── Organizer ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Organizer
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="organizer_name">
            <input id="organizer_name" name="organizer_name" type="text"
              defaultValue={initialValues.organizer_name ?? ""}
              className={inputClass} />
          </Field>
          <Field label="Email" htmlFor="organizer_email">
            <input id="organizer_email" name="organizer_email" type="email"
              defaultValue={initialValues.organizer_email ?? ""}
              className={inputClass} />
          </Field>
        </div>
      </section>

      {/* ── Publishing ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Publishing
        </h2>
        <div className="flex items-end gap-6">
          <Field label="Status" htmlFor="status">
            <select id="status" name="status" className={inputClass}
              defaultValue={initialValues.status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>

          <div className="flex flex-col gap-2 pb-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="featured" name="featured"
                defaultChecked={initialValues.featured}
                className="accent-navy-800" />
              <label htmlFor="featured" className="text-sm text-gray-700">
                ⭐ Featured on homepage
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_outside_bergen" name="is_outside_bergen"
                defaultChecked={initialValues.is_outside_bergen}
                className="accent-navy-800" />
              <label htmlFor="is_outside_bergen" className="text-sm text-gray-700">
                📍 Outside Bergen County
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="flex gap-3 border-t border-gray-100 pt-6">
        <button
          type="submit"
          className="rounded-lg bg-navy-800 px-6 py-2 text-sm font-semibold text-white hover:bg-navy-900"
        >
          {isEdit ? "Save changes" : "Create event"}
        </button>
        <a
          href="/admin/events"
          className="rounded-lg border border-gray-200 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
