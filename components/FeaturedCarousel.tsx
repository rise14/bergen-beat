"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import type { Event } from "@/types";
import { formatShortDate, formatEventTime } from "@/lib/dates";

interface Props {
  events: Event[];
}

export function FeaturedCarousel({ events }: Props) {
  const [index, setIndex]   = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setIndex((i) => (i + 1) % events.length), [events.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + events.length) % events.length), [events.length]);

  // Auto-advance every 5 s, paused while hovering
  useEffect(() => {
    if (events.length <= 1 || paused) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, paused, events.length]);

  if (!events.length) return null;

  const event    = events[index]!;
  const category = event.category as { name: string; icon: string | null; color: string | null } | null;
  const venue    = event.venue    as { name: string; city: string | null } | null;

  return (
    <section className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="heading-rule font-serif text-2xl font-semibold text-navy-800">
          Featured this week
        </h2>
        {events.length > 1 && (
          <div className="flex items-center gap-1.5">
            {events.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to event ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === index ? "w-5 bg-navy-800" : "w-1.5 bg-cream-200 hover:bg-walnut/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="relative overflow-hidden rounded-2xl bg-navy-800 text-white"
        style={{ minHeight: 320 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Background image */}
        {event.banner_url ? (
          <>
            <Image
              key={event.id}
              src={event.banner_url}
              alt={event.title}
              fill
              sizes="(min-width: 1200px) 1152px, 100vw"
              className="object-cover opacity-40"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900/95 via-navy-900/50 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-900" />
        )}

        {/* Content */}
        <a
          href={`/events/${event.slug}`}
          className="relative flex flex-col justify-end p-8 sm:p-10 h-full min-h-[320px] block"
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {category && (
              <span
                className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                style={{ background: category.color ?? "#dc8f53" }}
              >
                {category.icon} {category.name}
              </span>
            )}
            {event.is_sponsored && (
              <span className="rounded-full border border-white/30 px-3 py-0.5 text-xs font-medium text-white/70">
                Sponsored
              </span>
            )}
            {event.is_free && (
              <span className="rounded-full bg-accent-orange px-3 py-0.5 text-xs font-semibold text-white">
                Free
              </span>
            )}
          </div>

          <h3 className="font-serif text-2xl font-bold leading-snug text-white sm:text-3xl lg:text-4xl max-w-2xl">
            {event.title}
          </h3>

          <p className="mt-3 text-sm text-sky/80">
            {formatShortDate(event.start_date)} · {formatEventTime(event.start_date)}
            {venue ? ` · ${venue.name}${venue.city ? `, ${venue.city}` : ""}` : ""}
          </p>

          {event.short_description && (
            <p className="mt-2 max-w-lg text-sm text-sky/60 line-clamp-2">
              {event.short_description}
            </p>
          )}

          <span className="mt-5 inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors">
            View event →
          </span>
        </a>

        {/* Prev / Next arrows */}
        {events.length > 1 && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); prev(); }}
              aria-label="Previous event"
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
            >
              ‹
            </button>
            <button
              onClick={(e) => { e.preventDefault(); next(); }}
              aria-label="Next event"
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnails — shown when 2+ secondary events exist */}
      {events.length > 1 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {events.slice(0, 4).map((e, i) => {
            const cat = e.category as { name: string; icon: string | null; color: string | null } | null;
            const v   = e.venue   as { name: string; city: string | null } | null;
            return (
              <button
                key={e.id}
                onClick={() => setIndex(i)}
                className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                  i === index
                    ? "border-navy-800 ring-1 ring-navy-800"
                    : "border-cream-200 bg-white hover:border-navy-800/40"
                }`}
              >
                <div className="relative h-20 bg-cream-100 overflow-hidden">
                  {e.banner_url ? (
                    <Image
                      src={e.banner_url}
                      alt={e.title}
                      fill
                      sizes="300px"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center text-2xl"
                      style={{ backgroundColor: cat?.color ?? "#f5e6d0" }}
                    >
                      {cat?.icon ?? "📅"}
                    </div>
                  )}
                  {i === index && (
                    <div className="absolute inset-0 bg-navy-800/20" />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-navy-800 line-clamp-1">{e.title}</p>
                  <p className="mt-0.5 text-xs text-walnut/70">
                    {formatShortDate(e.start_date)}
                    {v ? ` · ${v.name}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
