import { createAdminSupabaseClient } from "./supabase/server";
import type { Neighborhood } from "@/types";

// ─── Basic types ──────────────────────────────────────────────────────────────

export interface NeighborhoodWithCount extends Neighborhood {
  upcomingCount: number;
}

export interface CategorySummary {
  name: string;
  slug: string;
  icon: string | null;
  count: number;
}

export interface VenueSummary {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  upcomingCount: number;
}

export interface NeighborhoodDetail extends Neighborhood {
  upcomingCount: number;
  venues: VenueSummary[];
  topCategories: CategorySummary[];
}

// ─── All neighborhoods (with event counts) ────────────────────────────────────

export async function getNeighborhoods(): Promise<NeighborhoodWithCount[]> {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  // Fetch neighborhoods and upcoming published events in one shot
  const [{ data: nbData }, { data: evData }] = await Promise.all([
    supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
    supabase
      .from("events")
      .select("neighborhood_id")
      .eq("status", "published")
      .gte("start_date", now)
      .not("neighborhood_id", "is", null),
  ]);

  const countMap: Record<string, number> = {};
  for (const ev of evData ?? []) {
    const nid = ev.neighborhood_id as string;
    countMap[nid] = (countMap[nid] ?? 0) + 1;
  }

  return ((nbData ?? []) as unknown as Neighborhood[]).map((nb) => ({
    ...nb,
    upcomingCount: countMap[nb.id] ?? 0,
  }));
}

// ─── Single neighborhood (plain) ─────────────────────────────────────────────

export async function getNeighborhoodBySlug(slug: string): Promise<Neighborhood | null> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();
  return (data as unknown as Neighborhood) ?? null;
}

// ─── Neighborhood detail (for landing pages) ──────────────────────────────────
// Returns event count, top venues, and category breakdown in one call set.

export async function getNeighborhoodDetails(slug: string): Promise<NeighborhoodDetail | null> {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data: nb } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!nb) return null;
  const neighborhood = nb as unknown as Neighborhood;

  // Fetch upcoming events + venues for this neighborhood in parallel
  const [{ data: evData }, { data: venueData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, category:categories(name, slug, icon)")
      .eq("status", "published")
      .gte("start_date", now)
      .eq("neighborhood_id", neighborhood.id),
    supabase
      .from("venues")
      .select("id, slug, name, city, events(id, start_date, status)")
      .eq("neighborhood_id", neighborhood.id),
  ]);

  // Count upcoming events per venue
  const venues: VenueSummary[] = ((venueData ?? []) as unknown as Array<{
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
    .filter((v) => v.upcomingCount > 0)
    .sort((a, b) => b.upcomingCount - a.upcomingCount)
    .slice(0, 5);

  // Tally categories
  const catMap: Record<string, CategorySummary> = {};
  for (const ev of (evData ?? []) as unknown as Array<{
    id: string;
    category: { name: string; slug: string; icon: string | null } | null;
  }>) {
    const cat = ev.category;
    if (!cat) continue;
    if (!catMap[cat.slug]) catMap[cat.slug] = { name: cat.name, slug: cat.slug, icon: cat.icon, count: 0 };
    catMap[cat.slug].count++;
  }

  const topCategories = Object.values(catMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    ...neighborhood,
    upcomingCount: evData?.length ?? 0,
    venues,
    topCategories,
  };
}

/** All neighborhoods (id + name only) — for admin dropdowns. */
export async function getAllNeighborhoodsAdmin(): Promise<{ id: string; name: string; slug: string }[]> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("neighborhoods")
    .select("id, name, slug")
    .order("name", { ascending: true });
  return (data ?? []) as { id: string; name: string; slug: string }[];
}

/** Full neighborhood row for admin editing. */
export async function getNeighborhoodByIdAdmin(id: string): Promise<{
  id: string; name: string; slug: string; city: string | null;
  description: string | null; hero_url: string | null;
} | null> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("neighborhoods")
    .select("id, name, slug, city, description, hero_url")
    .eq("id", id)
    .single();
  return (data as unknown as {
    id: string; name: string; slug: string; city: string | null;
    description: string | null; hero_url: string | null;
  }) ?? null;
}
