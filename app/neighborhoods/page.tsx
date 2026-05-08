import type { Metadata } from "next";
import { getNeighborhoods } from "@/lib/neighborhoods";
import { buildItemListJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export const metadata: Metadata = {
  title: "Events by Neighborhood in Bergen County, NJ",
  description:
    "Browse local events by neighborhood across Bergen County, NJ — Hackensack, Ridgewood, Paramus, Fort Lee, Englewood, Teaneck, and more.",
  alternates: { canonical: `${siteUrl}/neighborhoods` },
  openGraph: { url: `${siteUrl}/neighborhoods` },
};

export const revalidate = 3600;

export default async function NeighborhoodsPage() {
  const neighborhoods = await getNeighborhoods();

  const withEvents = neighborhoods.filter((n) => n.upcomingCount > 0);
  const noEvents   = neighborhoods.filter((n) => n.upcomingCount === 0);

  const listJsonLd = buildItemListJsonLd(
    "Bergen County Neighborhoods",
    `${siteUrl}/neighborhoods`,
    withEvents.map((n) => ({
      name: n.name,
      url: `/neighborhoods/${n.slug}`,
      description: `Upcoming events in ${n.name}${n.city ? `, ${n.city}` : ""}, NJ`,
    }))
  );

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home",          href: "/" },
    { name: "Neighborhoods", href: "/neighborhoods" },
  ]);

  const totalEvents = neighborhoods.reduce((s, n) => s + n.upcomingCount, 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
          Browse by Neighborhood
        </h1>
        <p className="mt-4 text-walnut">
          {totalEvents} upcoming event{totalEvents !== 1 ? "s" : ""} across{" "}
          {withEvents.length} neighborhood{withEvents.length !== 1 ? "s" : ""} in Bergen County.
        </p>
      </div>

      {/* Active neighborhoods */}
      {withEvents.length > 0 && (
        <section className="mb-10">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {withEvents.map((nb) => (
              <a
                key={nb.id}
                href={`/neighborhoods/${nb.slug}`}
                className="group relative flex flex-col gap-1 rounded-2xl border border-cream-200 bg-white p-5 shadow-sm transition hover:border-navy-800 hover:shadow-md"
              >
                <span className="text-sm font-semibold text-navy-800 group-hover:text-accent-orange transition-colors">
                  {nb.name}
                </span>
                {nb.city && (
                  <span className="text-xs text-walnut">{nb.city}, NJ</span>
                )}
                <span className="mt-2 inline-flex w-fit items-center rounded-full bg-navy-800 px-2.5 py-0.5 text-xs font-semibold text-sky-light">
                  {nb.upcomingCount} event{nb.upcomingCount !== 1 ? "s" : ""}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Quiet neighborhoods */}
      {noEvents.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            No upcoming events
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {noEvents.map((nb) => (
              <a
                key={nb.id}
                href={`/neighborhoods/${nb.slug}`}
                className="rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm text-gray-400 transition hover:border-gray-300 hover:text-gray-600"
              >
                {nb.name}
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
