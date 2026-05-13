"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";

interface EventFields {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_free: boolean;
  price_range: string | null;
  external_url: string | null;
  banner_url: string | null;
  organizer_name: string | null;
  organizer_email: string | null;
  status: string;
}

interface Props {
  event: EventFields;
  action: (formData: FormData) => Promise<void>;
}

// Convert an ISO date string to the value format datetime-local inputs expect
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // Trim milliseconds and Z so browsers accept it: "2025-06-01T14:00"
  return iso.slice(0, 16);
}

export function OrganizerEditForm({ event, action }: Props) {
  const [isFree, setIsFree] = useState(event.is_free);
  const [bannerUrl, setBannerUrl] = useState(event.banner_url ?? "");

  return (
    <form action={action} className="space-y-6">
      {/* Banner */}
      <div>
        <label className="block text-sm font-medium text-navy-800 mb-1">
          Event banner image
        </label>
        <ImageUpload
          name="banner_url"
          initialUrl={event.banner_url}
          onUrlChange={setBannerUrl}
          showUrlFallback
          label="Upload a banner image (recommended: 1200×630 px)"
        />
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-navy-800 mb-1">
          Event title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={event.title}
          className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
        />
      </div>

      {/* Short description */}
      <div>
        <label htmlFor="short_description" className="block text-sm font-medium text-navy-800 mb-1">
          Short description{" "}
          <span className="text-walnut/50 font-normal">(shown in event cards)</span>
        </label>
        <input
          id="short_description"
          name="short_description"
          type="text"
          maxLength={160}
          defaultValue={event.short_description ?? ""}
          placeholder="One-line summary…"
          className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
        />
      </div>

      {/* Full description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-navy-800 mb-1">
          Full description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={event.description ?? ""}
          placeholder="Tell people what to expect…"
          className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-navy-800 focus:border-navy-800 focus:outline-none resize-y"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-navy-800 mb-1">
            Start date &amp; time <span className="text-red-500">*</span>
          </label>
          <input
            id="start_date"
            name="start_date"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocal(event.start_date)}
            className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-navy-800 mb-1">
            End date &amp; time
          </label>
          <input
            id="end_date"
            name="end_date"
            type="datetime-local"
            defaultValue={toDatetimeLocal(event.end_date)}
            className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="is_free"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="accent-navy-800"
          />
          <span className="text-sm text-navy-800 font-medium">This is a free event</span>
        </label>

        {!isFree && (
          <div>
            <label htmlFor="price_range" className="block text-sm font-medium text-navy-800 mb-1">
              Price / ticket range
            </label>
            <input
              id="price_range"
              name="price_range"
              type="text"
              defaultValue={event.price_range ?? ""}
              placeholder="e.g. $10–$25, Free with RSVP"
              className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Tickets / event URL */}
      <div>
        <label htmlFor="external_url" className="block text-sm font-medium text-navy-800 mb-1">
          Tickets / RSVP / event website URL
        </label>
        <input
          id="external_url"
          name="external_url"
          type="url"
          defaultValue={event.external_url ?? ""}
          placeholder="https://…"
          className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
        />
      </div>

      {/* Organizer */}
      <fieldset className="rounded-xl border border-cream-200 bg-white p-4 space-y-4">
        <legend className="px-1 text-sm font-semibold text-navy-800">Organizer contact</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="organizer_name" className="block text-sm font-medium text-navy-800 mb-1">
              Name
            </label>
            <input
              id="organizer_name"
              name="organizer_name"
              type="text"
              defaultValue={event.organizer_name ?? ""}
              className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="organizer_email" className="block text-sm font-medium text-navy-800 mb-1">
              Email
            </label>
            <input
              id="organizer_email"
              name="organizer_email"
              type="email"
              defaultValue={event.organizer_email ?? ""}
              className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          className="rounded-xl bg-navy-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors"
        >
          Save changes
        </button>
        <a
          href={`/events/${event.slug}`}
          className="text-sm text-walnut/60 hover:text-walnut hover:underline"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
