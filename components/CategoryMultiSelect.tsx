"use client";

import { useRef, useState, useEffect } from "react";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
  selected: string[]; // array of slugs
  onChange: (slugs: string[]) => void;
}

export function CategoryMultiSelect({ categories, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function toggle(slug: string) {
    onChange(
      selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug]
    );
  }

  const label =
    selected.length === 0
      ? "All categories"
      : selected.length === 1
      ? (categories.find((c) => c.slug === selected[0])?.name ?? "1 category")
      : `${selected.length} categories`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
          selected.length > 0
            ? "border-navy-800 bg-navy-800 text-white"
            : "border-cream-200 bg-white text-navy-800 hover:border-navy-800"
        }`}
      >
        {label}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-cream-200 bg-white shadow-lg">
          {/* Clear all */}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => { onChange([]); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-accent-orange hover:bg-cream-50 border-b border-cream-100"
            >
              Clear selection
            </button>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {categories.map((cat) => {
              const checked = selected.includes(cat.slug);
              return (
                <label
                  key={cat.slug}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-cream-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(cat.slug)}
                    className="accent-navy-800"
                  />
                  <span className="text-sm text-gray-700">
                    {cat.icon && <span className="mr-1">{cat.icon}</span>}
                    {cat.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
