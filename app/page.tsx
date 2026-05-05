import type { Metadata } from "next";
import { EventGrid } from "@/components/EventGrid";
import { CategoryPill } from "@/components/CategoryPill";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { getFeaturedEvents, getUpcomingEvents } from "@/lib/events";
import { getCategories } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Bergen Beat — Events in Bergen County, NJ",
};

// Revalidate the homepage every 5 minutes
export const revalidate = 300;

export default async function HomePage() {
  const [featuredEvents, upcomingEvents, categories] = await Promise.all([
    getFeaturedEvents(),
    getUpcomingEvents({ limit: 8 }),
    getCategories(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="py-12 text-center">
        <h1 className="flex justify-center">
          <img
            src="/bergen-beat-logo.png"
            alt="Bergen Beat"
            className="h-auto w-full max-w-sm"
          />
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          What&apos;s happening in Bergen County, New Jersey — concerts, markets, festivals, food, and more.
        </p>
        <div className="mt-6">
          <a
            href="/events"
            className="inline-block rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Browse all events
          </a>
        </div>
      </section>

      {/* Category grid */}
      <section className="py-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
          Browse by category
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <CategoryPill key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      {/* Featured events */}
      {featuredEvents.length > 0 && (
        <section className="py-8">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Featured this week
          </h2>
          <EventGrid events={featuredEvents} />
        </section>
      )}

      {/* Upcoming events */}
      <section className="py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Coming up</h2>
          <a href="/events" className="text-sm font-medium text-brand-600 hover:underline">
            See all →
          </a>
        </div>
        <EventGrid events={upcomingEvents} />
      </section>

      {/* Newsletter */}
      <section className="py-12">
        <NewsletterSignup />
      </section>
    </>
  );
}
