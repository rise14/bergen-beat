import type { Event } from "@/types";
import { formatShortDate, formatEventTime } from "@/lib/dates";

interface Props {
  event: Event;
}

export function EventCard({ event }: Props) {
  return (
    <a
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition hover:shadow-md"
    >
      {/* Banner image */}
      <div className="relative h-44 overflow-hidden bg-gray-100">
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          // Placeholder with category color
          <div
            className="flex h-full items-center justify-center text-4xl"
            style={{ backgroundColor: event.category?.color ?? "#f3f4f6" }}
          >
            {event.category?.icon ?? "📅"}
          </div>
        )}

        {/* Free badge */}
        {event.is_free && (
          <span className="absolute left-3 top-3 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
            Free
          </span>
        )}

        {/* Featured badge */}
        {event.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
            Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category */}
        {event.category && (
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            {event.category.name}
          </span>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {event.title}
        </h3>

        {/* Date */}
        <p className="mt-2 text-xs text-gray-400">
          {formatShortDate(event.start_date)}
          {" · "}
          {formatEventTime(event.start_date)}
        </p>

        {/* Venue / neighborhood */}
        {(event.venue?.name ?? event.neighborhood?.name) && (
          <p className="mt-0.5 text-xs text-gray-400">
            {event.venue?.name ?? event.neighborhood?.name}
            {event.venue?.city ? `, ${event.venue.city}` : ""}
          </p>
        )}

        {/* Recurring note */}
        {event.is_recurring && event.recurrence_note && (
          <p className="mt-1 text-xs italic text-gray-300">{event.recurrence_note}</p>
        )}

        {/* Price */}
        {!event.is_free && event.price_range && (
          <p className="mt-auto pt-3 text-xs text-gray-500">{event.price_range}</p>
        )}
      </div>
    </a>
  );
}
