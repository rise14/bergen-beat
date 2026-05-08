import { createAdminSupabaseClient } from "./supabase/server";
import type { Event } from "@/types";

export interface VenueWithCount {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string;
  lat: number | null;
  lng: number | null;
  website: string | null;
  neighborhood: { name: string; slug: string } | null;
  upcomingCount: number;
}

export interface VenueDetail extends VenueWithCount {
  zip: string | null;
}

/** All venues that have at least one upcoming published event, sorted by event count desc. */
export async function getActiveVenues(): Promise<VenueWithCount[]> {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("venues")
    .select(`
      id, slug, name, address, city, state, lat, lng, website,
      neighborhood:neighborhoods(name, slug),
      events(id, start_date, status)
    `)
    .order("name", { ascending: true });

  if (!data) return [];

  const now = new Date().toISOString();

  return (data as unknown as Array<{
    id: string; slug: string; name: string; address: string | null;
    city: string | null; state: string; lat: number | null; lng: number | null;
    website: string | null;
    neighborhood: { name: string; slug: string } | null;
    events: Array<{ id: string; start_date: string; status: string }>;
  }>)
    .map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      address: v.address,
      city: v.city,
      state: v.state,
      lat: v.lat,
      lng: v.lng,
      website: v.website,
      neighborhood: Array.isArray(v.neighborhood) ? v.neighborhood[0] ?? null : v.neighborhood,
      upcomingCount: (v.events ?? []).filter(
        (e) => e.status === "published" && e.start_date >= now
      ).length,
    }))
    .filter((v) => v.upcomingCount > 0)
    .sort((a, b) => b.upcomingCount - a.upcomingCount);
}

/** Single venue by slug. */
export async function getVenueBySlug(slug: string): Promise<VenueDetail | null> {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("venues")
    .select(`
      id, slug, name, address, city, state, zip, lat, lng, website,
      neighborhood:neighborhoods(name, slug),
      events(id, start_date, status)
    `)
    .eq("slug", slug)
    .single();

  if (!data) return null;

  const d = data as unknown as {
    id: string; slug: string; name: string; address: string | null;
    city: string | null; state: string; zip: string | null;
    lat: number | null; lng: number | null; website: string | null;
    neighborhood: { name: string; slug: string } | null;
    events: Array<{ id: string; start_date: string; status: string }>;
  };

  const now = new Date().toISOString();
  const upcomingCount = (d.events ?? []).filter(
    (e) => e.status === "published" && e.start_date >= now
  ).length;

  return {
    id: d.id, slug: d.slug, name: d.name, address: d.address,
    city: d.city, state: d.state, zip: d.zip, lat: d.lat, lng: d.lng,
    website: d.website,
    neighborhood: Array.isArray(d.neighborhood) ? d.neighborhood[0] ?? null : d.neighborhood,
    upcomingCount,
  };
}

/** Upcoming published events at a specific venue. */
export async function getVenueEvents(venueId: string): Promise<Event[]> {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("events")
    .select(`
      id, title, slug, short_description, start_date, end_date,
      is_free, price_range, banner_url, featured, is_recurring, recurrence_note,
      category:categories(id, name, slug, icon, color),
      neighborhood:neighborhoods(id, name, slug),
      venue:venues(id, slug, name, city, lat, lng)
    `)
    .eq("venue_id", venueId)
    .eq("status", "published")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(50);

  return (data ?? []) as unknown as Event[];
}

/** Slugs of all venues with upcoming events — used by generateStaticParams. */
export async function getActiveVenueSlugs(): Promise<string[]> {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("events")
    .select("venue:venues(slug)")
    .eq("status", "published")
    .gte("start_date", now)
    .not("venue_id", "is", null);

  if (!data) return [];

  const slugs = new Set<string>();
  for (const row of data as unknown as Array<{ venue: { slug: string } | null }>) {
    if (row.venue?.slug) slugs.add(row.venue.slug);
  }
  return [...slugs];
}
