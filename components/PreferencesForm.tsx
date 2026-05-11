"use client";

import { useState } from "react";

interface Prefs {
  neighborhoods?: string[];
  categories?: string[];
  frequency?: string;
}

interface Props {
  token: string;
  subscriberId: string;
  currentPrefs: Prefs;
  neighborhoods: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string; slug: string; icon: string | null }[];
}

export function PreferencesForm({
  token,
  currentPrefs,
  neighborhoods,
  categories,
}: Props) {
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(
    currentPrefs.neighborhoods ?? []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentPrefs.categories ?? []
  );
  const [frequency, setFrequency] = useState<string>(
    currentPrefs.frequency ?? "weekly"
  );
  const [saving, setSaving] = useState(false);
  const [unsubscribeConfirm, setUnsubscribeConfirm] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, slug: string) {
    setList(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          preferences: {
            neighborhoods: selectedNeighborhoods,
            categories: selectedCategories,
            frequency,
          },
        }),
      });
      window.location.href = `/preferences?token=${encodeURIComponent(token)}&saved=1`;
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsubscribe() {
    await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    window.location.href = `/preferences?token=${encodeURIComponent(token)}&unsubscribed=1`;
  }

  return (
    <form onSubmit={handleSave} className="space-y-7">

      {/* Digest frequency */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-navy-800">Digest frequency</h2>
        <div className="space-y-2">
          {[
            { value: "weekly",  label: "Weekly digest",              desc: "Every Thursday — best events for the next two weeks" },
            { value: "weekend", label: "This weekend only",          desc: "Every Friday — events happening this Fri–Sun" },
            { value: "both",    label: "Both weekly + this weekend",  desc: "Thursday weekly + Friday weekend preview" },
          ].map(({ value, label, desc }) => (
            <label key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition
                ${frequency === value
                  ? "border-navy-800 bg-navy-800/5"
                  : "border-cream-200 hover:border-navy-300"}`}
            >
              <input
                type="radio"
                name="frequency"
                value={value}
                checked={frequency === value}
                onChange={() => setFrequency(value)}
                className="mt-0.5 accent-navy-800"
              />
              <div>
                <p className="text-sm font-medium text-navy-800">{label}</p>
                <p className="text-xs text-walnut">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Neighborhoods */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-navy-800">
          Neighborhoods
        </h2>
        <p className="mb-3 text-xs text-walnut">
          Leave all unchecked to receive events from every neighborhood.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {neighborhoods.map((n) => (
            <label key={n.slug}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition
                ${selectedNeighborhoods.includes(n.slug)
                  ? "border-navy-800 bg-navy-800/5 font-medium text-navy-800"
                  : "border-cream-200 text-walnut hover:border-navy-300"}`}
            >
              <input
                type="checkbox"
                checked={selectedNeighborhoods.includes(n.slug)}
                onChange={() => toggle(selectedNeighborhoods, setSelectedNeighborhoods, n.slug)}
                className="accent-navy-800"
              />
              {n.name}
            </label>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-navy-800">
          Categories
        </h2>
        <p className="mb-3 text-xs text-walnut">
          Leave all unchecked to receive all types of events.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {categories.map((c) => (
            <label key={c.slug}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition
                ${selectedCategories.includes(c.slug)
                  ? "border-navy-800 bg-navy-800/5 font-medium text-navy-800"
                  : "border-cream-200 text-walnut hover:border-navy-300"}`}
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(c.slug)}
                onChange={() => toggle(selectedCategories, setSelectedCategories, c.slug)}
                className="accent-navy-800"
              />
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </label>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-cream-200 pt-5">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-navy-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>

        {!unsubscribeConfirm ? (
          <button
            type="button"
            onClick={() => setUnsubscribeConfirm(true)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Unsubscribe
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Are you sure?</span>
            <button
              type="button"
              onClick={handleUnsubscribe}
              className="text-xs font-medium text-red-500 hover:underline"
            >
              Yes, unsubscribe
            </button>
            <button
              type="button"
              onClick={() => setUnsubscribeConfirm(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
