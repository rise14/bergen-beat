import Image from "next/image";
import type { Event } from "@/types";
import { formatShortDate, formatEventTime } from "@/lib/dates";

interface Props {
  events: Event[];
}

export function FeaturedHero({ events }: Props) {
  if (!events.length) return null;

  const [primary, ...rest] = events;
  const secondaries = rest.slice(0, 2); // show at most 2 secondary cards

  const category = primary.category as { name: string; icon: string | null; color: string | null } | null;
  const venue    = primary.venue    as { name: string; city: string | null; slug?: string } | null;

  return (
    <section className="py-8">
      <h2 className="heading-rule mb-6 font-serif text-2xl font-semibold text-navy-800">
        Featured this week
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Primary spotlight ── */}
        <a
          href={`/events/${primary.slug}`}
          className="group relative lg:col-span-2 flex flex-col overflow-hidden rounded-2xl bg-navy-800 text-white min-h-[280px] hover:shadow-lg transition-shadow"
        >
          {/* Background image */}
          {primary.banner_url ? (
            <>
              <Image
                src={primary.banner_url}
                alt={primary.title}
                fill
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover opacity-40 transition-opacity duration-300 group-hover:opacity-50"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-900" />
          )}

          {/* Content */}
          <div className="relative mt-auto p-6">
            {category && (
              <span
                className="mb-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                style={{ background: category.color ?? "#dc8f53" }}
              >
                {category.icon} {category.name}
              </span>
            )}
            <h3 className="font-serif text-xl font-bold leading-snug text-white sm:text-2xl">
              {primary.title}
            </h3>
            <p className="mt-2 text-sm text-sky/80">
              {formatShortDate(primary.start_date)} · {formatEventTime(primary.start_date)}
              {venue ? ` · ${venue.name}${venue.city ? `, ${venue.city}` : ""}` : ""}
            </p>
            {primary.is_free && (
              <span className="mt-3 inline-block rounded-full bg-accent-orange px-3 py-0.5 text-xs font-semibold text-white">
                Free
              </span>
            )}
          </div>
        </a>

        {/* ── Secondary cards ── */}
        <div className="flex flex-col gap-4">
          {secondaries.map((event) => {
            const cat = event.category as { name: string; icon: string | null; color: string | null } | null;
            const v   = event.venue   as { name: string; city: string | null } | null;
            return (
              <a
                key={event.id}
                href={`/events/${event.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-navy-800 text-white hover:shadow-lg transition-shadow"
                style={{ minHeight: secondaries.length === 1 ? 280 : 130 }}
              >
                {event.banner_url ? (
                  <>
                    <Image
                      src={event.banner_url}
                      alt={event.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      className="object-cover opacity-40 transition-opacity duration-300 group-hover:opacity-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/30 to-transparent" />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ background: cat?.color ?? "#1a2e5a" }}
                  />
                )}
                <div className="relative mt-auto p-4">
                  {cat && (
                    <p className="mb-1 text-xs font-semibold text-accent-orange">
                      {cat.icon} {cat.name}
                    </p>
                  )}
                  <h3 className="font-serif text-sm font-bold leading-snug text-white line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs text-sky/70">
                    {formatShortDate(event.start_date)}
                    {v ? ` · ${v.name}` : ""}
                  </p>
                </div>
              </a>
            );
          })}

          {/* "See all featured" link if no secondary events */}
          {secondaries.length === 0 && (
            <a
              href="/events"
              className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-cream-200 text-sm font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors"
            >
              Browse all events →
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
