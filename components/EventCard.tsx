import Image from "next/image";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import type { Event } from "@/types";
import { formatShortDate, formatEventTime } from "@/lib/dates";
import { CategoryIcon } from "@/components/CategoryIcon";

interface Props {
  event: Event;
  /** Pass true for above-the-fold cards to skip lazy loading */
  priority?: boolean;
}

export function EventCard({ event, priority = false }: Props) {
  return (
    // `relative` anchors the stretched-link overlay on the title anchor below.
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white transition hover:shadow-md hover:-translate-y-0.5">
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
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-cream-100 to-navy-50 text-navy-600/40">
            <CategoryIcon slug={event.category?.slug} className="h-10 w-10" />
          </div>
        )}

        {/* Free badge */}
        {event.is_free && (
          <span className="absolute left-3 top-3 rounded-full bg-accent-orange px-2.5 py-0.5 text-xs font-semibold text-white">
            Free
          </span>
        )}

        {/* Sponsored badge — takes priority over Featured */}
        {event.is_sponsored ? (
          <span className="absolute right-3 top-3 rounded-full bg-accent-orange/90 px-2.5 py-0.5 text-xs font-semibold text-white">
            Sponsored
          </span>
        ) : event.featured ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-navy-800 px-2.5 py-0.5 text-xs font-semibold text-sky-light">
            <Star className="h-3 w-3" strokeWidth={2} aria-hidden="true" /> Featured
          </span>
        ) : null}

        {/* Outside Bergen badge */}
        {event.is_outside_bergen && (
          <span className="absolute left-3 bottom-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-walnut">
            <MapPin className="h-3 w-3" strokeWidth={2} aria-hidden="true" /> Outside Bergen
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category */}
        {event.category && (
          <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-accent-orange">
            <CategoryIcon slug={event.category.slug} /> {event.category.name}
          </span>
        )}

        {/* Title — serif font, navy */}
        {/*
          The title is the card's real crawlable link. `after:absolute
          after:inset-0` stretches its hit area over the whole card, so the
          entire card stays clickable (as it was with the old router.push
          handler) while search engines and "open in new tab" get a genuine
          <a href>. Ahrefs Site Audit: "Orphan page (has no incoming internal
          links)" — every event detail page was orphaned because this card
          emitted no anchor.
        */}
        <h3 className="font-serif text-sm font-semibold text-navy-800 line-clamp-2 leading-snug">
          <Link
            href={`/events/${event.slug}`}
            className="after:absolute after:inset-0 after:content-[''] hover:underline"
          >
            {event.title}
          </Link>
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
              // `relative z-10` lifts this above the title's stretched
              // overlay so the venue link stays independently clickable.
              <Link
                href={`/venues/${(event.venue as { slug?: string }).slug ?? ""}`}
                className="relative z-10 hover:text-accent-orange hover:underline"
              >
                {event.venue.name}
                {event.venue.city ? `, ${event.venue.city}` : ""}
              </Link>
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
    </div>
  );
}
