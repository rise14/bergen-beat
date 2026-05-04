import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNeighborhoodBySlug } from "@/lib/neighborhoods";
import { getPublishedEvents } from "@/lib/events";
import { EventGrid } from "@/components/EventGrid";

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const neighborhood = await getNeighborhoodBySlug(params.slug);
  if (!neighborhood) return {};
  return {
    title: `Events in ${neighborhood.name}`,
    description: `Discover upcoming events in ${neighborhood.name}, Bergen County, NJ.`,
  };
}

export default async function NeighborhoodPage({ params }: Props) {
  const neighborhood = await getNeighborhoodBySlug(params.slug);
  if (!neighborhood) notFound();

  const events = await getPublishedEvents({ neighborhoodSlug: params.slug });

  return (
    <>
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
