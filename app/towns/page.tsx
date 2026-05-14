import type { Metadata } from "next";
import { getNeighborhoods } from "@/lib/neighborhoods";
import { buildItemListJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export const metadata: Metadata = {
  title: "Things to Do by Town in Bergen County, NJ",
  description:
    "Find things to do in every town in Bergen County, NJ — Hackensack, Ridgewood, Paramus, Fort Lee, Englewood, Teaneck, and 60+ more municipalities.",
  alternates: { canonical: `${siteUrl}/towns` },
  openGraph: {
    url: `${siteUrl}/towns`,
    title: "Things to Do by Town in Bergen County, NJ",
    description: "Local events and activities in every Bergen County town — concerts, festivals, markets, family events, and more.",
  },
};

export const revalidate = 3600;

export default async function TownsPage() {
  const neighborhoods = await getNeighborhoods();

  const withEvents = neighborhoods.filter((n) => n.upcomingCount > 0);
  const noEvents   = neighborhoods.filter((n) => n.upcomingCount === 0);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home",  href: "/" },
    { name: "Towns", href: "/towns" },
  ]);

  const listJsonLd = buildItemListJsonLd(
    "Things to Do by Town in Bergen County, NJ",
    `${siteUrl}/towns`,
    withEvents.map((n) => ({
      name: `Things to Do in ${n.name}, NJ`,
      url: `/towns/${n.slug}`,
      description: `${n.upcomingCount} upcoming events in ${n.name}, Bergen County`,
    }))
  );

  const totalEvents = neighborhoods.reduce((s, n) => s + n.upcomingCount, 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />

      <div className="mb-8">
        <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
          Things to Do by Town
        </h1>
        <p className="mt-2 text-sm text-walnut">
          {totalEvents} upcoming events across {withEvents.length} Bergen County town{withEvents.length !== 1 ? "s" : ""}.
        </p>
      </div>

      {/* Towns with events */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {withEvents.map((n) => (
          <a
            key={n.id}
            href={`/towns/${n.slug}`}
            className="group rounded-xl border border-cream-200 bg-white p-4 hover:border-navy-800 transition-colors"
          >
            {n.hero_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={n.hero_url}
                alt={n.name}
                className="mb-3 h-24 w-full rounded-lg object-cover"
              />
            )}
            <p className="font-semibold text-navy-800 group-hover:text-accent-orange transition-colors">
              {n.name}
            </p>
            <p className="mt-0.5 text-xs text-walnut">
              {n.upcomingCount} event{n.upcomingCount !== 1 ? "s" : ""}
            </p>
          </a>
        ))}
      </div>

      {/* Towns without current events */}
      {noEvents.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
            More towns
          </h2>
          <div className="flex flex-wrap gap-2">
            {noEvents.map((n) => (
              <a
                key={n.id}
                href={`/towns/${n.slug}`}
                className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-sm text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors"
              >
                {n.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Submit CTA */}
      <div className="mt-12 rounded-2xl border border-cream-200 bg-white p-6 text-center">
        <p className="font-medium text-navy-800">Don&apos;t see your town&apos;s events?</p>
        <p className="mt-1 text-sm text-walnut">
          Submit your event free and put your town on the map.{" "}
          <a href="/submit" className="font-semibold text-accent-orange hover:underline">
            Submit an event →
          </a>
        </p>
      </div>
    </>
  );
}
