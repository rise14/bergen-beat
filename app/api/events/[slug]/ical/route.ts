import { NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";

// GET /api/events/[slug]/ical — returns a downloadable .ics calendar file
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const event = await getEventBySlug(params.slug);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

  // Build iCal content manually (avoids needing ical-generator at runtime on edge)
  const formatIcalDate = (dateStr: string) =>
    new Date(dateStr)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z/, "Z");

  const location = event.venue
    ? `${event.venue.name}${event.venue.address ? ", " + event.venue.address : ""}`
    : "";

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bergen Beat//bergenbeat.net//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@bergenbeat.net`,
    `DTSTAMP:${formatIcalDate(new Date().toISOString())}`,
    `DTSTART:${formatIcalDate(event.start_date)}`,
    event.end_date ? `DTEND:${formatIcalDate(event.end_date)}` : "",
    `SUMMARY:${event.title}`,
    event.short_description ? `DESCRIPTION:${event.short_description}` : "",
    location ? `LOCATION:${location}` : "",
    `URL:${siteUrl}/events/${event.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
    },
  });
}
