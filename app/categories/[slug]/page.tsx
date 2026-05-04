import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/categories";
import { getPublishedEvents } from "@/lib/events";
import { EventGrid } from "@/components/EventGrid";

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};
  return {
    title: `${category.name} Events`,
    description: `Find the best ${category.name.toLowerCase()} events happening in Bergen County, NJ.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const events = await getPublishedEvents({ categorySlug: params.slug });

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        {category.icon && (
          <span className="text-4xl">{category.icon}</span>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
          <p className="mt-1 text-gray-500">
            {events.length} upcoming event{events.length !== 1 ? "s" : ""} in Bergen County
          </p>
        </div>
      </div>

      {events.length > 0 ? (
        <EventGrid events={events} />
      ) : (
        <div className="py-16 text-center text-gray-400">
          <p>No upcoming {category.name.toLowerCase()} events right now.</p>
          <a href="/submit" className="mt-2 inline-block text-brand-600 hover:underline">
            Know of one? Submit it →
          </a>
        </div>
      )}
    </>
  );
}
