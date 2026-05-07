import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNeighborhoodBySlug, getNeighborhoods } from "@/lib/neighborhoods";
import { getPublishedEvents } from "@/lib/events";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
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
  const neighborhood = await getNeighborhoodBySlug(params.slug);
  if (!neighborhood) return {};
  const canonicalUrl = `${siteUrl}/neighborhoods/${params.slug}`;
  return {
    title: `Events in ${neighborhood.name}, NJ`,
    description: `Discover upcoming events in ${neighborhood.name}, Bergen County, NJ.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `Events in ${neighborhood.name}, NJ`,
      description: `Discover upcoming events in ${neighborhood.name}, Bergen County, NJ.`,
      url: canonicalUrl,
    },
  };
}

export default async function NeighborhoodPage({ params }: Props) {
  const neighborhood = await getNeighborhoodBySlug(params.slug);
  if (!neighborhood) notFound();

  const { events } = await getPublishedEvents({ neighborhoodSlug: params.slug });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", href: "/" },
    { name: "Neighborhoods", href: "/neighborhoods" },
    { name: neighborhood.name, href: `/neighborhoods/${params.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Events in {neighborhood.name}
        </h1>
        {neighborhood.city && (
          <p className="mt-1 text-gray-500">{neighborhood.city}, NJ</p>
        )}
        <p className="mt-2 text-gray-500">
          {events.length} upcoming event{events.length !== 1 ? "s" : ""}
        </p>
      </div>

      {events.length > 0 ? (
        <EventGrid events={events} />
      ) : (
        <div className="py-16 text-center text-gray-400">
          <p>No upcoming events in {neighborhood.name} right now.</p>
          <a href="/submit" className="mt-2 inline-block text-brand-600 hover:underline">
            Know of one? Submit it →
          </a>
        </div>
      )}
    </>
  );
}
