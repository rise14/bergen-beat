import type { Event } from "@/types";
import { buildGoogleCalendarUrl, buildOutlookWebUrl } from "@/lib/dates";

interface Props {
  event: Event;
}

export function AddToCalendar({ event }: Props) {
  const location = event.venue
    ? [event.venue.name, event.venue.address, event.venue.city]
        .filter(Boolean)
        .join(", ")
    : undefined;

  const sharedProps = {
    title: event.title,
    startDate: event.start_date,
    endDate: event.end_date,
    description: event.short_description ?? event.description,
    location,
  };

  const googleUrl  = buildGoogleCalendarUrl(sharedProps);
  const outlookUrl = buildOutlookWebUrl(sharedProps);
  const icalUrl    = `/api/events/${event.slug}/ical`;

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Add to calendar
      </p>
      <div className="flex flex-col gap-2">

        {/* Google Calendar */}
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
        >
          {/* Google Calendar colour logo */}
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="17" rx="2" fill="#fff" stroke="#dadce0" strokeWidth="1.5"/>
            <path d="M3 9h18" stroke="#dadce0" strokeWidth="1.5"/>
            <path d="M8 2v4M16 2v4" stroke="#5f6368" strokeWidth="1.5" strokeLinecap="round"/>
            <text x="12" y="19" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1a73e8">G</text>
          </svg>
          Google Calendar
        </a>

        {/* Outlook Web */}
        <a
          href={outlookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          {/* Outlook icon */}
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="5" width="14" height="14" rx="2" fill="#0078d4"/>
            <rect x="9" y="3" width="13" height="13" rx="2" fill="#fff" stroke="#0078d4" strokeWidth="1.5"/>
            <path d="M9 8h8M9 12h8M9 16h5" stroke="#0078d4" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="6" cy="12" r="2.5" fill="#fff"/>
            <text x="6" y="13.2" textAnchor="middle" fontSize="4" fontWeight="700" fill="#0078d4">O</text>
          </svg>
          Outlook Web
        </a>

        {/* Apple / .ics */}
        <a
          href={icalUrl}
          download
          className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          {/* Calendar icon */}
          <svg className="h-4 w-4 shrink-0 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="17" rx="2"/>
            <path d="M3 9h18M8 2v4M16 2v4"/>
          </svg>
          Apple / Outlook (.ics)
        </a>

      </div>
    </div>
  );
}
