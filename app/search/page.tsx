import type { Metadata } from "next";
import { SearchClient } from "@/components/SearchClient";
import type { SearchResults } from "@/app/api/search/route";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

interface Props {
  searchParams: { q?: string };
}

export function generateMetadata({ searchParams }: Props): Metadata {
  const q = searchParams.q?.trim() ?? "";
  return {
    title: q ? `Search: "${q}"` : "Search Events",
    description: "Search upcoming events and venues in Bergen County, NJ.",
    alternates: { canonical: `${siteUrl}/search` },
    robots: { index: false },   // search result pages shouldn't be indexed
  };
}

// Server-side fetch so direct URL visits (Google, share links) render results immediately
async function serverSearch(q: string): Promise<SearchResults | null> {
  if (!q || q.length < 2) return null;

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const pattern = `%${q}%`;

  const [{ data: evData }, { data: venueData }] = await Promise.all([
    supabase
      .from("events")
      .select(`
        id, title, slug, start_date, is_free, banner_url,
        category:categories(name, icon, color),
        venue:venues(name, city)
      `)
      .eq("status", "published")
      .gte("start_date", now)
      .or(`title.ilike.${pattern},short_description.ilike.${pattern}`)
      .order("start_date", { ascending: true })
      .limit(12),

    supabase
      .from("venues")
      .select("id, slug, name, city, events(id, start_date, status)")
      .ilike("name", pattern)
      .limit(6),
  ]);

  const venues = ((venueData ?? []) as unknown as Array<{
    id: string; slug: string; name: string; city: string | null;
    events: Array<{ id: string; start_date: string; status: string }>;
  }>)
    .map((v) => ({
      id: v.id, slug: v.slug, name: v.name, city: v.city,
      upcomingCount: (v.events ?? []).filter(
        (e) => e.status === "published" && e.start_date >= now
      ).length,
    }))
    .filter((v) => v.upcomingCount > 0);

  return {
    query: q,
    events: (evData ?? []) as unknown as SearchResults["events"],
    venues,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = searchParams.q?.trim() ?? "";
  const initialResults = await serverSearch(q);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
          Search
        </h1>
        <p className="mt-4 text-walnut">
          Find upcoming events and venues in Bergen County.
        </p>
      </div>

      <SearchClient initialQuery={q} initialResults={initialResults} />
    </div>
  );
}
