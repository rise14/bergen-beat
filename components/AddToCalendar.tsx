import type { Event } from "@/types";
import { buildGoogleCalendarUrl } from "@/lib/dates";

interface Props {
  event: Event;
}

export function AddToCalendar({ event }: Props) {
  const location = event.venue
    ? [event.venue.name, event.venue.address, event.venue.city]
        .filter(Boolean)
        .join(", ")
    : undefined;

  const googleUrl = buildGoogleCalendarUrl({
    title: event.title,
    startDate: event.start_date,
    endDate: event.end_date,
    description: event.short_description ?? event.description,
    location,
  });

  const icalUrl = `/api/events/${event.slug}/ical`;

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Add to calendar
      </p>
      <div className="flex flex-col gap-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <span>📅</span> Google Calendar
        </a>
        <a
          href={icalUrl}
          download
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <span>🗓</span> Download .ics (Apple / Outlook)
        </a>
      </div>
    </div>
  );
}
