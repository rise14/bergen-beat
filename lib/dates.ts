// Date/time formatting helpers — all events are in Eastern Time (NJ)

const TIMEZONE = "America/New_York";

export function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
  });
}

// Returns a Google Calendar URL for an event
export function buildGoogleCalendarUrl({
  title,
  startDate,
  endDate,
  description,
  location,
}: {
  title: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  location?: string;
}): string {
  const fmt = (d: string) =>
    new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");

  const dates = endDate ? `${fmt(startDate)}/${fmt(endDate)}` : fmt(startDate);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    ...(description ? { details: description } : {}),
    ...(location ? { location } : {}),
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}
