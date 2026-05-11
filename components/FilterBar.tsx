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
    outside?: string;
    q?: string;
    lat?: string;
    lng?: string;
    view?: string;
  };
  showViewToggle?: boolean;
}

const DATE_PILLS = [
  { value: "",             label: "Any date" },
  { value: "today",        label: "Today" },
  { value: "this-weekend", label: "This weekend" },
  { value: "this-week",    label: "This week" },
  { value: "this-month",   label: "This month" },
];

export function FilterBar({ categories, neighborhoods, currentFilters, showViewToggle }: Props) {
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
    params.delete("page");
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
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters =
    currentFilters.category ||
    currentFilters.neighborhood ||
    currentFilters.date ||
    currentFilters.free ||
    currentFilters.outside ||
    currentFilters.q ||
    currentFilters.lat;

  const currentView = currentFilters.view ?? "list";

  return (
    <div className="space-y-3">
      {/* Row 1: search + view toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-walnut/50 text-sm">
            🔍
          </span>
          <input
            ref={searchInputRef}
            type="search"
            defaultValue={currentFilters.q ?? ""}
            placeholder="Search events…"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch((e.target as HTMLInputElement).value);
            }}
            className="w-full rounded-xl border border-cream-200 bg-white py-2.5 pl-9 pr-20 text-sm text-navy-800 placeholder-walnut/40 focus:border-navy-800 focus:outline-none"
          />
          <button
            onClick={() => { if (searchInputRef.current) submitSearch(searchInputRef.current.value); }}
            className="absolute inset-y-1.5 right-1.5 rounded-lg bg-navy-800 px-3 text-xs font-semibold text-white hover:bg-navy-700"
          >
            Search
          </button>
        </div>

        {/* List / Map toggle */}
        {showViewToggle && (
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-cream-200 bg-white">
            <button
              onClick={() => updateFilter("view", "")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                currentView === "list"
                  ? "bg-navy-800 text-white"
                  : "text-walnut hover:bg-cream-100"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              List
            </button>
            <button
              onClick={() => updateFilter("view", "map")}
              className={`flex items-center gap-1.5 border-l border-cream-200 px-3 py-2 text-sm font-medium transition-colors ${
                currentView === "map"
                  ? "bg-navy-800 text-white"
                  : "text-walnut hover:bg-cream-100"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </button>
          </div>
        )}
      </div>

      {/* Row 2: date pills */}
      <div className="flex flex-wrap gap-1.5">
        {DATE_PILLS.map((pill) => {
          const active = (currentFilters.date ?? "") === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => updateFilter("date", pill.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-navy-800 text-white"
                  : "border border-cream-200 bg-white text-walnut hover:border-navy-800 hover:text-navy-800"
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Row 3: dropdowns + free + near me */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={currentFilters.category ?? ""}
          onChange={(e) => updateFilter("category", e.target.value)}
          className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>

        <select
          value={currentFilters.neighborhood ?? ""}
          onChange={(e) => updateFilter("neighborhood", e.target.value)}
          className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-navy-800 focus:border-navy-800 focus:outline-none"
        >
          <option value="">All areas</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-walnut transition-colors hover:border-navy-800 hover:text-navy-800">
          <input
            type="checkbox"
            checked={currentFilters.free === "true"}
            onChange={(e) => updateFilter("free", e.target.checked ? "true" : "")}
            className="accent-navy-800"
          />
          Free only
        </label>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-walnut transition-colors hover:border-navy-800 hover:text-navy-800">
          <input
            type="checkbox"
            checked={currentFilters.outside === "true"}
            onChange={(e) => updateFilter("outside", e.target.checked ? "true" : "")}
            className="accent-navy-800"
          />
          📍 Outside Bergen
        </label>

        <NearMeButton active={!!currentFilters.lat} />

        {hasFilters && (
          <a href="/events" className="text-sm text-walnut/60 hover:text-walnut hover:underline">
            Clear all
          </a>
        )}
      </div>

      {currentFilters.q && (
        <p className="text-sm text-walnut">
          Results for{" "}
          <span className="font-semibold text-navy-800">&ldquo;{currentFilters.q}&rdquo;</span>
          {" — "}
          <button
            onClick={() => {
              if (searchInputRef.current) searchInputRef.current.value = "";
              updateFilter("q", "");
            }}
            className="text-accent-orange hover:underline"
          >
            clear
          </button>
        </p>
      )}
    </div>
  );
}
