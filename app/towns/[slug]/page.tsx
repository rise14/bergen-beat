import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNeighborhoodDetails, getNeighborhoods } from "@/lib/neighborhoods";
import { getPublishedEvents } from "@/lib/events";
import { buildBreadcrumbJsonLd, buildPlaceJsonLd, buildItemListJsonLd } from "@/lib/seo";
import { EventGrid } from "@/components/EventGrid";
import { NewsletterSubscribeBar } from "@/components/NewsletterSubscribeBar";

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

  const townName    = nb.name;
  const canonicalUrl = `${siteUrl}/towns/${params.slug}`;

  return {
    title: `Things to Do in ${townName}, NJ — Local Events`,
    description: `Find things to do in ${townName}, NJ — upcoming concerts, festivals, family events, outdoor activities, and more. ${nb.upcomingCount} events coming up in ${townName}.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `Things to Do in ${townName}, NJ`,
      description: `Upcoming concerts, festivals, markets, and events in ${townName}, Bergen County, NJ.`,
      url: canonicalUrl,
    },
  };
}

export default async function TownPage({ params }: Props) {
  const [nb, eventsResult] = await Promise.all([
    getNeighborhoodDetails(params.slug),
    getPublishedEvents({ neighborhoodSlug: params.slug }),
  ]);

  if (!nb) notFound();

  const { events } = eventsResult;
  const townName    = nb.name;
  const canonicalUrl = `${siteUrl}/towns/${params.slug}`;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home",   href: "/" },
    { name: "Towns",  href: "/towns" },
    { name: townName, href: `/towns/${params.slug}` },
  ]);

  const placeJsonLd = buildPlaceJsonLd({
    name:        `${townName}, NJ`,
    url:          canonicalUrl,
    description: `${townName} is a municipality in Bergen County, NJ with ${nb.upcomingCount} upcoming local events.`,
    address:     { addressLocality: townName, addressRegion: "NJ" },
  });

  const itemListJsonLd = events.length > 0
    ? buildItemListJsonLd(
        `Things to Do in ${townName}, NJ`,
        canonicalUrl,
        events.slice(0, 10).map((e) => ({
          name: e.title,
          url:  `${siteUrl}/events/${e.slug}`,
          ...(e.short_description ? { description: e.short_description } : {}),
          ...(e.banner_url ? { image: e.banner_url } : {}),
        }))
      )
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      )}

      {/* Breadcrumb */}
      <a href="/towns" className="text-sm text-gray-400 hover:text-gray-600">
        ← All towns
      </a>

      {/* Hero */}
      {nb.hero_url && (
        <div className="relative mt-4 h-52 w-full overflow-hidden rounded-2xl sm:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nb.hero_url} alt={townName} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 to-transparent" />
          <h1 className="absolute bottom-5 left-6 font-serif text-3xl font-semibold text-white drop-shadow">
            Things to Do in {townName}
          </h1>
        </div>
      )}

      <div className={`${nb.hero_url ? "mt-6" : "mt-4"} mb-8`}>
        {!nb.hero_url && (
          <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
            Things to Do in {townName}, NJ
          </h1>
        )}
        <p className="mt-2 text-sm text-walnut">
          {nb.upcomingCount} upcoming event{nb.upcomingCount !== 1 ? "s" : ""} in {townName}, Bergen County
        </p>

        {/* Quick filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`/towns/${params.slug}`}
            className="rounded-full bg-navy-800 px-3.5 py-1.5 text-xs font-medium text-white">
            All events
          </a>
          <a href={`/events?neighborhood=${params.slug}&free=true`}
            className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            Free events
          </a>
          <a href={`/events?neighborhood=${params.slug}&date=this-weekend`}
            className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            This weekend
          </a>
          <a href={`/neighborhoods/${params.slug}`}
            className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            Neighborhood guide
          </a>
        </div>
      </div>

      {/* Description */}
      {nb.description && (
        <p className="mb-8 max-w-2xl text-walnut leading-relaxed">{nb.description}</p>
      )}

      {/* Events */}
      {events.length > 0 ? (
        <>
          <EventGrid events={events} priorityCount={4} />
          <div className="mt-10">
            <NewsletterSubscribeBar variant="inline" />
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-walnut/60">
          <p className="text-lg font-medium text-navy-800">No upcoming events in {townName} right now.</p>
          <p className="mt-2 text-sm">Check back soon — events are added daily.</p>
          <a href="/events"
            className="mt-6 inline-block rounded-full bg-accent-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-walnut transition-colors">
            Browse all Bergen County events
          </a>
        </div>
      )}

      {/* Nearby venues */}
      {nb.venues.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 font-serif text-xl font-semibold text-navy-800">
            Venues in {townName}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {nb.venues.map((v) => (
              <a key={v.id} href={`/venues/${v.slug}`}
                className="flex items-center gap-3 rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-navy-800 transition-colors">
                <div>
                  <p className="font-medium text-navy-800">{v.name}</p>
                  {v.upcomingCount > 0 && (
                    <p className="text-xs text-walnut">
                      {v.upcomingCount} upcoming event{v.upcomingCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Submit CTA */}
      <div className="mt-12 rounded-2xl border border-cream-200 bg-white p-6 text-center">
        <p className="font-medium text-navy-800">Hosting an event in {townName}?</p>
        <p className="mt-1 text-sm text-walnut">
          Submit it free and reach the Bergen County community.{" "}
          <a href="/submit" className="font-semibold text-accent-orange hover:underline">
            Submit your event →
          </a>
        </p>
      </div>
    </>
  );
}
