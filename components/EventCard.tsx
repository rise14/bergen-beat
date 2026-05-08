import Image from "next/image";
import type { Event } from "@/types";
import { formatShortDate, formatEventTime } from "@/lib/dates";

interface Props {
  event: Event;
  /** Pass true for above-the-fold cards to skip lazy loading */
  priority?: boolean;
}

export function EventCard({ event, priority = false }: Props) {
  return (
    <a
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white transition hover:shadow-md hover:-translate-y-0.5"
    >
      {/* Banner image */}
      <div className="relative h-44 overflow-hidden bg-cream-100">
        {event.banner_url ? (
          <Image
            src={event.banner_url}
            alt={event.title}
            fill
            sizes="(min-width: 1280px) 265px, (min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-4xl"
            style={{ backgroundColor: event.category?.color ?? "#f5e6d0" }}
          >
            {event.category?.icon ?? "📅"}
          </div>
        )}

        {/* Free badge */}
        {event.is_free && (
          <span className="absolute left-3 top-3 rounded-full bg-accent-orange px-2.5 py-0.5 text-xs font-semibold text-white">
            Free
          </span>
        )}

        {/* Featured badge */}
        {event.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-navy-800 px-2.5 py-0.5 text-xs font-semibold text-sky-light">
            ⭐ Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category */}
        {event.category && (
          <span className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent-orange">
            {event.category.icon} {event.category.name}
          </span>
        )}

        {/* Title — serif font, navy */}
        <h3 className="font-serif text-sm font-semibold text-navy-800 line-clamp-2 leading-snug">
          {event.title}
        </h3>

        {/* Date */}
        <p className="mt-2 text-xs text-walnut">
          {formatShortDate(event.start_date)}
          {" · "}
          {formatEventTime(event.start_date)}
        </p>

        {/* Venue / neighborhood */}
        {(event.venue?.name ?? event.neighborhood?.name) && (
          <p className="mt-0.5 text-xs text-gray-400">
            {event.venue?.name ? (
              <a
                href={`/venues/${(event.venue as { slug?: string }).slug ?? ""}`}
                className="hover:text-brand-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {event.venue.name}
                {event.venue.city ? `, ${event.venue.city}` : ""}
              </a>
            ) : (
              event.neighborhood?.name
            )}
          </p>
        )}

        {/* Recurring note */}
        {event.is_recurring && event.recurrence_note && (
          <p className="mt-1 text-xs italic text-gray-300">{event.recurrence_note}</p>
        )}

        {/* Price */}
        {!event.is_free && event.price_range && (
          <p className="mt-auto pt-3 text-xs font-medium text-walnut">{event.price_range}</p>
        )}
      </div>
    </a>
  );
}
