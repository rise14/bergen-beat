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

// Formats a date as a compact UTC string for calendar URLs: YYYYMMDDTHHmmSSZ
function fmtCalDate(d: string): string {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
}

// When no end_date is provided, default to 2 hours after start
function resolveEndDate(startDate: string, endDate?: string | null): string {
  if (endDate) return endDate;
  return new Date(new Date(startDate).getTime() + 2 * 60 * 60 * 1000).toISOString();
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
  const end = resolveEndDate(startDate, endDate);
  const dates = `${fmtCalDate(startDate)}/${fmtCalDate(end)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    ctz: "America/New_York",
    ...(description ? { details: description } : {}),
    ...(location ? { location } : {}),
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

// Returns an Outlook Web (outlook.live.com) URL for an event
export function buildOutlookWebUrl({
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
  const end = resolveEndDate(startDate, endDate);

  // Outlook uses ISO 8601 without the trailing Z for its "local" param
  const fmt = (d: string) => new Date(d).toISOString().replace(/\.\d{3}Z$/, "");

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: fmt(startDate),
    enddt: fmt(end),
    ...(description ? { body: description } : {}),
    ...(location ? { location } : {}),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
