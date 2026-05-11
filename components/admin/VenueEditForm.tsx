"use client";

import { ImageUpload } from "@/components/ImageUpload";

interface Neighborhood {
  id: string;
  name: string;
}

interface VenueFormData {
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  description: string | null;
  hero_url: string | null;
  neighborhood_id: string | null;
}

interface Props {
  venue: VenueFormData & { id: string; totalEvents: number; upcomingEvents: number };
  neighborhoods: Neighborhood[];
  action: (formData: FormData) => Promise<void>;
}

export function VenueEditForm({ venue, neighborhoods, action }: Props) {
  return (
    <form action={action} className="space-y-5">
      {/* Name + Slug */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Name *
          </label>
          <input
            name="name"
            required
            defaultValue={venue.name}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Slug *
          </label>
          <input
            name="slug"
            required
            defaultValue={venue.slug}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Address
        </label>
        <input
          name="address"
          defaultValue={venue.address ?? ""}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
        />
      </div>

      {/* City / State / Zip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            City
          </label>
          <input
            name="city"
            defaultValue={venue.city ?? ""}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            State
          </label>
          <input
            name="state"
            defaultValue={venue.state ?? "NJ"}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            ZIP
          </label>
          <input
            name="zip"
            defaultValue={venue.zip ?? ""}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Lat / Lng */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Latitude
          </label>
          <input
            name="lat"
            type="number"
            step="any"
            defaultValue={venue.lat ?? ""}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Longitude
          </label>
          <input
            name="lng"
            type="number"
            step="any"
            defaultValue={venue.lng ?? ""}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Website
        </label>
        <input
          name="website"
          type="url"
          defaultValue={venue.website ?? ""}
          placeholder="https://"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={venue.description ?? ""}
          placeholder="A short description of this venue shown on its public page…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
        />
      </div>

      {/* Hero image */}
      <ImageUpload
        name="hero_url"
        initialUrl={venue.hero_url}
        showUrlFallback={true}
        label="Hero image"
      />

      {/* Neighborhood */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Neighborhood
        </label>
        <select
          name="neighborhood_id"
          defaultValue={venue.neighborhood_id ?? ""}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
        >
          <option value="">— None —</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-5">
        <div className="text-xs text-gray-400">
          <span className="font-mono">{venue.id}</span>
          <span className="mx-2">·</span>
          <span>{venue.totalEvents} event{venue.totalEvents !== 1 ? "s" : ""} total</span>
          {venue.upcomingEvents > 0 && (
            <>
              <span className="mx-2">·</span>
              <span className="text-green-600">{venue.upcomingEvents} upcoming</span>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <a
            href="/admin/venues"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="rounded-lg bg-navy-800 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          >
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
}
