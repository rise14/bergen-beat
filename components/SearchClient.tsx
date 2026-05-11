"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { SearchResults, SearchEvent, SearchVenue } from "@/app/api/search/route";
import { formatShortDate, formatEventTime } from "@/lib/dates";

interface Props {
  initialQuery: string;
  initialResults: SearchResults | null;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-cream-200 bg-white p-4">
          <div className="h-14 w-14 shrink-0 rounded-lg bg-cream-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-cream-100" />
            <div className="h-3 w-1/2 rounded bg-cream-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: SearchEvent }) {
  const category = event.category as { name: string; icon: string | null; color: string | null } | null;
  const venue    = event.venue    as { name: string; city: string | null } | null;

  return (
    <a
      href={`/events/${event.slug}`}
      className="flex items-center gap-4 rounded-xl border border-cream-200 bg-white p-4 transition hover:border-navy-800 hover:shadow-sm"
    >
      {/* Thumbnail */}
      <div
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-100"
        style={{ backgroundColor: category?.color ?? "#f5e6d0" }}
      >
        {event.banner_url ? (
          <Image
            src={event.banner_url}
            alt={event.title}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xl">
            {category?.icon ?? "📅"}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-sm font-semibold text-navy-800">
          {event.title}
        </p>
        <p className="mt-0.5 text-xs text-walnut">
          {formatShortDate(event.start_date)} · {formatEventTime(event.start_date)}
          {venue?.name && ` · ${venue.name}${venue.city ? `, ${venue.city}` : ""}`}
        </p>
        {category && (
          <span className="mt-1 inline-block text-xs font-semibold text-accent-orange">
            {category.icon} {category.name}
          </span>
        )}
      </div>

      {event.is_free && (
        <span className="shrink-0 rounded-full bg-accent-orange px-2 py-0.5 text-xs font-semibold text-white">
          Free
        </span>
      )}
    </a>
  );
}

// ── Venue chip ────────────────────────────────────────────────────────────────

function VenueChip({ venue }: { venue: SearchVenue }) {
  return (
    <a
      href={`/venues/${venue.slug}`}
      className="flex items-center gap-2 rounded-xl border border-cream-200 bg-white px-4 py-3 transition hover:border-navy-800 hover:shadow-sm"
    >
      <span className="text-lg">🏛️</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy-800">{venue.name}</p>
        {venue.city && <p className="text-xs text-walnut">{venue.city}, NJ</p>}
      </div>
      <span className="ml-auto shrink-0 text-xs text-walnut">
        {venue.upcomingCount} event{venue.upcomingCount !== 1 ? "s" : ""}
      </span>
    </a>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SearchClient({ initialQuery, initialResults }: Props) {
  const router = useRouter();
  const [query,   setQuery]   = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(initialResults);
  const [loading, setLoading] = useState(false);
  const [,        startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced search + URL sync
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      setLoading(false);
      startTransition(() => {
        router.replace(query ? `/search?q=${encodeURIComponent(query)}` : "/search", { scroll: false });
      });
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = (await res.json()) as SearchResults;
        setResults(data);
        startTransition(() => {
          router.replace(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false });
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasResults = results && (results.events.length > 0 || results.venues.length > 0);
  const noResults  = results && !hasResults && results.query.length >= 2;

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-8">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events, venues…"
          className="w-full rounded-2xl border border-cream-200 bg-white py-4 pl-11 pr-5 text-base text-navy-800 shadow-sm outline-none transition focus:border-navy-800 focus:ring-2 focus:ring-navy-800/10"
        />
        {loading && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            Searching…
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && <Skeleton />}

      {/* No results */}
      {!loading && noResults && (
        <div className="py-16 text-center text-gray-400">
          <p className="text-lg">No results for &ldquo;{results.query}&rdquo;</p>
          <p className="mt-1 text-sm">Try a different spelling, or browse by category.</p>
          <a href="/events" className="mt-4 inline-block text-accent-orange hover:underline">
            Browse all events →
          </a>
        </div>
      )}

      {/* Results */}
      {!loading && hasResults && (
        <div className="space-y-10">

          {/* Events */}
          {results.events.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Events · {results.events.length}
              </h2>
              <div className="space-y-2.5">
                {results.events.map((e) => <EventRow key={e.id} event={e} />)}
              </div>
              {results.events.length >= 12 && (
                <a
                  href={`/events?q=${encodeURIComponent(results.query)}`}
                  className="mt-4 inline-block text-sm text-accent-orange hover:underline"
                >
                  See all matching events →
                </a>
              )}
            </section>
          )}

          {/* Venues */}
          {results.venues.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Venues · {results.venues.length}
              </h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {results.venues.map((v) => <VenueChip key={v.id} venue={v} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty state (no query yet) */}
      {!loading && !results && !query.trim() && (
        <div className="py-12 text-center text-gray-400">
          <p className="text-4xl mb-4">🎵</p>
          <p className="text-base">Type to search upcoming events and venues in Bergen County.</p>
        </div>
      )}
    </div>
  );
}
