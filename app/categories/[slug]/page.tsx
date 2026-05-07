import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getCategories } from "@/lib/categories";
import { getPublishedEvents } from "@/lib/events";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { EventGrid } from "@/components/EventGrid";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};
  const canonicalUrl = `${siteUrl}/categories/${params.slug}`;
  return {
    title: `${category.name} Events in Bergen County, NJ`,
    description: `Find the best ${category.name.toLowerCase()} events happening in Bergen County, NJ.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${category.name} Events in Bergen County, NJ`,
      description: `Find the best ${category.name.toLowerCase()} events happening in Bergen County, NJ.`,
      url: canonicalUrl,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const { events } = await getPublishedEvents({ categorySlug: params.slug });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", href: "/" },
    { name: "Categories", href: "/categories" },
    { name: category.name, href: `/categories/${params.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mb-8 flex items-center gap-4">
        {category.icon && <span className="text-4xl">{category.icon}</span>}
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
