"use client";

import { ImageUpload } from "@/components/ImageUpload";

interface NeighborhoodFormData {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  description: string | null;
  hero_url: string | null;
}

interface Props {
  nb: NeighborhoodFormData;
  action: (formData: FormData) => Promise<void>;
}

export function NeighborhoodEditForm({ nb, action }: Props) {
  return (
    <form action={action} className="space-y-5">
      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Description
        </label>
        <textarea
          name="description"
          rows={4}
          defaultValue={nb.description ?? ""}
          placeholder="A short description shown on the neighborhood's public page — what makes this area unique, what kind of events happen here…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-navy-800 focus:outline-none"
        />
      </div>

      {/* Hero image */}
      <ImageUpload
        name="hero_url"
        initialUrl={nb.hero_url}
        showUrlFallback={true}
        label="Hero image"
      />
      <p className="mt-1 text-xs text-gray-400">
        Use a wide landscape image (1200×400px or similar). Upload or paste a direct URL.
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-5">
        <a
          href={`/neighborhoods/${nb.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent-orange hover:underline"
        >
          View public page →
        </a>
        <div className="flex gap-3">
          <a
            href="/admin/neighborhoods"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="rounded-lg bg-navy-800 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-900"
          >
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
}
