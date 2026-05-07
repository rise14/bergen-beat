"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";
import type { Category, Neighborhood } from "@/types";
import { NearMeButton } from "@/components/NearMeButton";

interface Props {
  categories: Category[];
  neighborhoods: Neighborhood[];
  currentFilters: {
    category?: string;
    neighborhood?: string;
    date?: string;
    free?: string;
    q?: string;
    lat?: string;
    lng?: string;
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function submitSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters =
    currentFilters.category ||
    currentFilters.neighborhood ||
    currentFilters.date ||
    currentFilters.free ||
    currentFilters.q ||
    currentFilters.lat;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </span>
        <input
          ref={searchInputRef}
          type="search"
          defaultValue={currentFilters.q ?? ""}
          placeholder="Search events…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submitSearch((e.target as HTMLInputElement).value);
            }
          }}
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-20 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          onClick={() => {
            if (searchInputRef.current) submitSearch(searchInputRef.current.value);
          }}
          className="absolute inset-y-1.5 right-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
        >
          Search
        </button>
      </div>

      {/* Filter row */}
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

        {/* Near me */}
        <NearMeButton active={!!currentFilters.lat} />

        {/* Clear filters */}
        {hasFilters && (
          <a
            href="/events"
            className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
          >
            Clear all
          </a>
        )}
      </div>

      {/* Active search query indicator */}
      {currentFilters.q && (
        <p className="text-sm text-gray-500">
          Showing results for{" "}
          <span className="font-medium text-gray-800">&ldquo;{currentFilters.q}&rdquo;</span>
          {" — "}
          <button
            onClick={() => {
              if (searchInputRef.current) searchInputRef.current.value = "";
              updateFilter("q", "");
            }}
            className="text-brand-600 hover:underline"
          >
            clear search
          </button>
        </p>
      )}
    </div>
  );
}
