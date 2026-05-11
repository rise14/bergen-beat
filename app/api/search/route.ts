import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export interface SearchEvent {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  is_free: boolean;
  banner_url: string | null;
  category: { name: string; icon: string | null; color: string | null } | null;
  venue: { name: string; city: string | null } | null;
}

export interface SearchVenue {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  upcomingCount: number;
}

export interface SearchResults {
  events: SearchEvent[];
  venues: SearchVenue[];
  query: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json<SearchResults>({ events: [], venues: [], query: q });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const pattern = `%${q}%`;

  const [{ data: evData }, { data: venueData }] = await Promise.all([
    // Events: search title + short_description, upcoming published only
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

    // Venues: search name, only those with upcoming events
    supabase
      .from("venues")
      .select("id, slug, name, city, events(id, start_date, status)")
      .ilike("name", pattern)
      .limit(6),
  ]);

  // Compute upcomingCount for venues
  const venues: SearchVenue[] = ((venueData ?? []) as unknown as Array<{
    id: string; slug: string; name: string; city: string | null;
    events: Array<{ id: string; start_date: string; status: string }>;
  }>)
    .map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      city: v.city,
      upcomingCount: (v.events ?? []).filter(
        (e) => e.status === "published" && e.start_date >= now
      ).length,
    }))
    .filter((v) => v.upcomingCount > 0);

  return NextResponse.json<SearchResults>({
    query: q,
    events: (evData ?? []) as unknown as SearchEvent[],
    venues,
  });
}
