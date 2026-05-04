"use client";

import { useRef } from "react";
import type { Category, Neighborhood, Event } from "@/types";

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

  return (
    <form ref={formRef} action={action} className="space-y-8 max-w-2xl">

      {/* Success banner */}
      {(saved || created) && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {created ? "Event created successfully." : "Changes saved."}
        </div>
      )}

      {/* ── Basic info ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Basic info
        </h2>

        <Field label="Title *" htmlFor="title">
          <input id="title" name="title" type="text" required
            defaultValue={initialValues.title}
            className={inputClass} />
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
            <input id="start_date" name="start_date" type="datetime-local" required
              defaultValue={initialValues.start_date?.slice(0, 16)}
              className={inputClass} />
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
            className="accent-brand-600" />
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
            className="accent-brand-600" />
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

          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" id="featured" name="featured"
              defaultChecked={initialValues.featured}
              className="accent-brand-600" />
            <label htmlFor="featured" className="text-sm text-gray-700">
              ⭐ Featured on homepage
            </label>
          </div>
        </div>
      </section>

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="flex gap-3 border-t border-gray-100 pt-6">
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700"
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
