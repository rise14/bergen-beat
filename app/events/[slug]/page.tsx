import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getEventBySlug, getEventBySlugAdmin, getRelatedEvents } from "@/lib/events";
import { buildEventJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo";
import { EventGrid } from "@/components/EventGrid";
import { EventMap } from "@/components/EventMap";
import { AddToCalendar } from "@/components/AddToCalendar";
import { ShareButtons } from "@/components/ShareButtons";
import { formatEventDate, formatEventTime } from "@/lib/dates";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Revalidate event pages every hour
export const revalidate = 3600;

interface Props {
  params: { slug: string };
  searchParams: { preview?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug(params.slug);
  if (!event) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const canonicalUrl = `${siteUrl}/events/${event.slug}`;

  return {
    title: event.title,
    description: event.short_description ?? event.description?.slice(0, 155),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: event.title,
      description: event.short_description ?? undefined,
      url: canonicalUrl,
      images: event.banner_url
        ? [{ url: event.banner_url, width: 1200, height: 630, alt: event.title }]
        : [],
    },
  };
}

export default async function EventPage({ params, searchParams }: Props) {
  const isPreview = searchParams.preview === "1";

  // Draft preview: only allowed for authenticated admin users
  let event = await getEventBySlug(params.slug);
  if (!event && isPreview) {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      event = await getEventBySlugAdmin(params.slug);
    }
  }

  if (!event) notFound();

  const relatedEvents = await getRelatedEvents(event);
  const jsonLd = buildEventJsonLd(event);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", href: "/" },
    { name: "Events", href: "/events" },
    { name: event.title, href: `/events/${event.slug}` },
  ]);

  return (
    <>
      {/* Structured data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Draft preview banner — only shown when accessed via ?preview=1 */}
      {isPreview && event.status !== "published" && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <span className="text-base">🔒</span>
            <span>
              <span className="font-semibold capitalize">{event.status}</span> — this event is not
              publicly visible yet. Only admins can see this preview.
            </span>
          </div>
          <a
            href={`/admin/events/${event.id}/edit`}
            className="shrink-0 rounded-lg bg-yellow-200 px-3 py-1.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-300 transition-colors"
          >
            ← Back to edit
          </a>
        </div>
      )}

      {/* Banner */}
      {event.banner_url && (
        <div className="relative mb-8 h-64 overflow-hidden rounded-2xl sm:h-80">
          <Image
            src={event.banner_url}
            alt={event.title}
            fill
            priority
            sizes="(min-width: 1200px) 1152px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Category */}
          {event.category && (
            <a
              href={`/categories/${event.category.slug}`}
              className="inline-block mb-3 rounded-full bg-cream-50 px-3 py-1 text-xs font-semibold text-navy-800"
            >
              {event.category.name}
            </a>
          )}

          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            {event.title}
          </h1>

          {/* Date & time */}
          <p className="mt-3 text-gray-600">
            {formatEventDate(event.start_date)}
            {event.end_date && ` · ${formatEventTime(event.start_date)} – ${formatEventTime(event.end_date)}`}
          </p>

          {/* Recurring note */}
          {event.is_recurring && event.recurrence_note && (
            <p className="mt-1 text-sm italic text-gray-400">{event.recurrence_note}</p>
          )}

          {/* Description */}
          <div className="prose mt-6 max-w-none text-gray-700">
            {event.description ? (
              <p>{event.description}</p>
            ) : (
              <p className="text-gray-400">No description provided.</p>
            )}
          </div>

          {/* Organizer */}
          {event.organizer_name && (
            <p className="mt-6 text-sm text-gray-400">
              Organized by <span className="font-medium text-gray-600">{event.organizer_name}</span>
            </p>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* CTA */}
          {event.external_url && (
            <a
              href={event.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl bg-navy-800 px-6 py-4 text-center text-sm font-semibold text-white hover:bg-navy-900"
            >
              Get Tickets / More Info →
            </a>
          )}

          {/* Price */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Price</span>
              <span className="font-medium">
                {event.is_free ? "Free" : event.price_range ?? "Paid"}
              </span>
            </div>

            {/* Venue */}
            {event.venue && (
              <div className="flex justify-between">
                <span className="text-gray-500">Venue</span>
                <a
                  href={`/venues/${(event.venue as { slug?: string }).slug ?? ""}`}
                  className="font-medium text-right text-accent-orange hover:underline"
                >
                  {event.venue.name}
                </a>
              </div>
            )}

            {/* Neighborhood */}
            {event.neighborhood && (
              <div className="flex justify-between">
                <span className="text-gray-500">Area</span>
                <a
                  href={`/neighborhoods/${event.neighborhood.slug}`}
                  className="font-medium text-accent-orange hover:underline"
                >
                  {event.neighborhood.name}
                </a>
              </div>
            )}
          </div>

          {/* Add to calendar */}
          <AddToCalendar event={event} />

          {/* Share */}
          <ShareButtons
            url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net"}/events/${event.slug}`}
            title={event.title}
          />

          {/* Map */}
          {event.venue?.lat && event.venue?.lng && (
            <EventMap
              lat={event.venue.lat}
              lng={event.venue.lng}
              label={event.venue.name}
            />
          )}

          {/* Suggest an edit */}
          <div className="border-t border-gray-100 pt-4">
            <a
              href={`mailto:${process.env.ADMIN_EMAIL ?? "hi@bergenbeat.net"}?subject=${encodeURIComponent(`Suggest an edit: ${event.title}`)}&body=${encodeURIComponent(`Hi,\n\nI'd like to suggest an update to this event:\nhttps://www.bergenbeat.net/events/${event.slug}\n\nHere's what needs fixing:\n\n`)}`}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-accent-orange"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Suggest an edit
            </a>
          </div>
        </aside>
      </div>

      {/* Related events */}
      {relatedEvents.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">More events like this</h2>
          <EventGrid events={relatedEvents} />
        </section>
      )}
    </>
  );
}
