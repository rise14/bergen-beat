import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNeighborhoodDetails, getNeighborhoods } from "@/lib/neighborhoods";
import { getPublishedEvents } from "@/lib/events";
import { buildBreadcrumbJsonLd, buildPlaceJsonLd, buildItemListJsonLd } from "@/lib/seo";
import { EventGrid } from "@/components/EventGrid";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const neighborhoods = await getNeighborhoods();
  return neighborhoods.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const nb = await getNeighborhoodDetails(params.slug);
  if (!nb) return {};
  const locationStr = nb.city ? `${nb.name}, ${nb.city}, NJ` : `${nb.name}, Bergen County, NJ`;
  const canonicalUrl = `${siteUrl}/neighborhoods/${params.slug}`;
  return {
    title: `Events in ${nb.name}, NJ`,
    description: `Find ${nb.upcomingCount} upcoming event${nb.upcomingCount !== 1 ? "s" : ""} in ${locationStr}. Concerts, markets, festivals, food events and more in Bergen County.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `Events in ${nb.name}, NJ`,
      description: `Discover what's happening in ${locationStr}.`,
      url: canonicalUrl,
    },
  };
}

export default async function NeighborhoodPage({ params }: Props) {
  const [nb, eventsResult] = await Promise.all([
    getNeighborhoodDetails(params.slug),
    getPublishedEvents({ neighborhoodSlug: params.slug }),
  ]);

  if (!nb) notFound();

  const { events } = eventsResult;
  const locationStr = nb.city ? `${nb.name}, ${nb.city}` : nb.name;
  const canonicalUrl = `${siteUrl}/neighborhoods/${params.slug}`;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home",          href: "/" },
    { name: "Neighborhoods", href: "/neighborhoods" },
    { name: nb.name,         href: `/neighborhoods/${params.slug}` },
  ]);

  const placeJsonLd = buildPlaceJsonLd({
    name: `${nb.name}${nb.city ? `, ${nb.city}` : ""}`,
    url: canonicalUrl,
    description: `A neighborhood in Bergen County, NJ with ${nb.upcomingCount} upcoming local events.`,
    address: { addressLocality: nb.city ?? nb.name, addressRegion: "NJ" },
  });

  const eventListJsonLd = events.length > 0
    ? buildItemListJsonLd(
        `Events in ${nb.name}`,
        canonicalUrl,
        events.slice(0, 10).map((e) => ({
          name: e.title,
          url: `/events/${e.slug}`,
          ...(e.short_description ? { description: e.short_description } : {}),
          ...(e.banner_url ? { image: e.banner_url } : {}),
        }))
      )
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
      {eventListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventListJsonLd) }} />
      )}

      <a href="/neighborhoods" className="text-sm text-gray-400 hover:text-gray-600">
        ← All neighborhoods
      </a>

      {/* Hero image — uses <img> since domain is admin-entered and unpredictable */}
      {nb.hero_url && (
        <div className="relative mt-4 h-52 w-full overflow-hidden rounded-2xl sm:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nb.hero_url}
            alt={nb.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 to-transparent" />
          <h1 className="absolute bottom-5 left-6 font-serif text-3xl font-semibold text-white drop-shadow">
            {nb.name}
          </h1>
        </div>
      )}

      <div className={`${nb.hero_url ? "mt-6" : "mt-4"} mb-8`}>
        {!nb.hero_url && (
          <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
            Events in {nb.name}
          </h1>
        )}
        <p className="mt-4 text-walnut">{locationStr}, NJ</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-navy-800 px-3 py-1 text-sm font-semibold text-sky-light">
            {nb.upcomingCount} upcoming event{nb.upcomingCount !== 1 ? "s" : ""}
          </span>
          {nb.venues.length > 0 && (
            <span className="text-sm text-walnut">
              {nb.venues.length} venue{nb.venues.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {nb.description && (
        <p className="mb-6 max-w-2xl text-walnut leading-relaxed">{nb.description}</p>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
        {/* Sidebar */}
        <aside className="order-2 lg:order-1 space-y-8">

          {nb.topCategories.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
                By category
              </h2>
              <ul className="space-y-1">
                {nb.topCategories.map((cat) => (
                  <li key={cat.slug}>
                    <a href={`/categories/${cat.slug}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-cream-100">
                      <span className="text-navy-800">
                        {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
                        {cat.name}
                      </span>
                      <span className="rounded-full bg-cream-100 px-2 py-0.5 text-xs font-semibold text-walnut">
                        {cat.count}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {nb.venues.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Venues here
              </h2>
              <ul className="space-y-1">
                {nb.venues.map((v) => (
                  <li key={v.id}>
                    <a href={`/venues/${v.slug}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-cream-100">
                      <span className="font-medium text-navy-800">{v.name}</span>
                      <span className="text-xs text-walnut">
                        {v.upcomingCount} event{v.upcomingCount !== 1 ? "s" : ""}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-cream-200 bg-cream-50 p-4">
            <p className="text-sm font-semibold text-navy-800">Know of an event here?</p>
            <p className="mt-1 text-xs text-walnut">Help the community stay in the loop.</p>
            <a href="/submit"
              className="mt-3 inline-block rounded-full bg-accent-orange px-4 py-1.5 text-sm font-semibold text-white hover:bg-walnut transition-colors">
              Submit an event →
            </a>
          </div>
        </aside>

        {/* Event grid */}
        <div className="order-1 lg:order-2 lg:col-span-3">
          {events.length > 0 ? (
            <EventGrid events={events} />
          ) : (
            <div className="py-16 text-center text-gray-400">
              <p className="text-lg">No upcoming events in {nb.name} right now.</p>
              <p className="mt-1 text-sm">Be the first to add one.</p>
              <a href="/submit"
                className="mt-4 inline-block rounded-full bg-accent-orange px-5 py-2 text-sm font-semibold text-white hover:bg-walnut transition-colors">
                Submit an event →
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
