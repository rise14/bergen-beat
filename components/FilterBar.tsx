"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Category, Neighborhood } from "@/types";

interface Props {
  categories: Category[];
  neighborhoods: Neighborhood[];
  currentFilters: {
    category?: string;
    neighborhood?: string;
    date?: string;
    free?: string;
  };
}

const DATE_OPTIONS = [
  { value: "", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "this-weekend", label: "This weekend" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
];

export function FilterBar({ categories, neighborhoods, currentFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters =
    currentFilters.category ||
    currentFilters.neighborhood ||
    currentFilters.date ||
    currentFilters.free;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Category */}
      <select
        value={currentFilters.category ?? ""}
        onChange={(e) => updateFilter("category", e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
      >
        <option value="">All categories</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.slug}>
            {cat.icon} {cat.name}
          </option>
        ))}
      </select>

      {/* Date */}
      <select
        value={currentFilters.date ?? ""}
        onChange={(e) => updateFilter("date", e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
      >
        {DATE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Neighborhood */}
      <select
        value={currentFilters.neighborhood ?? ""}
        onChange={(e) => updateFilter("neighborhood", e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
      >
        <option value="">All areas</option>
        {neighborhoods.map((n) => (
          <option key={n.id} value={n.slug}>
            {n.name}
          </option>
        ))}
      </select>

      {/* Free toggle */}
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
        <input
          type="checkbox"
          checked={currentFilters.free === "true"}
          onChange={(e) => updateFilter("free", e.target.checked ? "true" : "")}
          className="accent-brand-600"
        />
        Free only
      </label>

      {/* Clear filters */}
      {hasFilters && (
        <a
          href="/events"
          className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
        >
          Clear filters
        </a>
      )}
    </div>
  );
}
