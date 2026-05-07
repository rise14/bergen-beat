import { createAdminSupabaseClient } from "./supabase/server";
import type { Event, EventFilters, PaginatedEvents } from "@/types";
import { haversineDistance, withinBoundingBox, DEFAULT_RADIUS_MILES } from "./geo";

export const PAGE_SIZE = 24;

// Fields to select for event cards (list views)
const EVENT_CARD_SELECT = `
  id, title, slug, short_description, start_date, end_date,
  is_free, price_range, banner_url, featured, is_recurring, recurrence_note,
  category:categories(id, name, slug, icon, color),
  neighborhood:neighborhoods(id, name, slug),
  venue:venues(id, name, city, lat, lng)
`;

// Fields to select for full event detail pages
const EVENT_DETAIL_SELECT = `
  *,
  category:categories(id, name, slug, icon, color),
  neighborhood:neighborhoods(id, name, slug),
  venue:venues(id, name, address, city, state, lat, lng, website)
`;

// Supabase returns partial rows and arrays for joined relations.
// We cast through unknown to avoid TypeScript fighting us over the shape.
function asEvents(data: unknown): Event[] {
  return (data as Event[]) ?? [];
}

function asEvent(data: unknown): Event | null {
  return (data as Event) ?? null;
}

export async function getFeaturedEvents(): Promise<Event[]> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .eq("status", "published")
    .eq("featured", true)
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(4);

  return asEvents(data);
}

export async function getUpcomingEvents({
  limit = 8,
}: { limit?: number } = {}): Promise<Event[]> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .eq("status", "published")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(limit);

  return asEvents(data);
}

export async function getPublishedEvents(
  filters: EventFilters = {}
): Promise<PaginatedEvents> {
  const supabase = createAdminSupabaseClient();
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("events")
    .select(EVENT_CARD_SELECT, { count: "exact" })
    .eq("status", "published")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true });

  if (filters.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .single();
    if (cat) query = query.eq("category_id", cat.id);
    else return { events: [], total: 0, page, pageSize, totalPages: 0 };
  }

  if (filters.neighborhoodSlug) {
    const { data: nb } = await supabase
      .from("neighborhoods")
      .select("id")
      .eq("slug", filters.neighborhoodSlug)
      .single();
    if (nb) query = query.eq("neighborhood_id", nb.id);
    else return { events: [], total: 0, page, pageSize, totalPages: 0 };
  }

  if (filters.freeOnly) {
    query = query.eq("is_free", true);
  }

  if (filters.query) {
    query = query.textSearch("title", filters.query, { type: "websearch" });
  }

  if (filters.dateFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filters.dateFilter) {
      case "today": {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query = query
          .gte("start_date", today.toISOString())
          .lt("start_date", tomorrow.toISOString());
        break;
      }
      case "this-weekend": {
        const dayOfWeek = today.getDay();
        const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + daysUntilSat);
        const monday = new Date(saturday);
        monday.setDate(saturday.getDate() + 2);
        query = query
          .gte("start_date", saturday.toISOString())
          .lt("start_date", monday.toISOString());
        break;
      }
      case "this-week": {
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);
        query = query
          .gte("start_date", today.toISOString())
          .lt("start_date", endOfWeek.toISOString());
        break;
      }
      case "this-month": {
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        query = query
          .gte("start_date", today.toISOString())
          .lt("start_date", endOfMonth.toISOString());
        break;
      }
    }
  }

  // ── Near-me filter ─────────────────────────────────────────────────────────
  // Geolocation can't be done at DB level without PostGIS, so we fetch a larger
  // slice, filter + sort by distance in JS, then manually paginate.
  if (filters.userLat != null && filters.userLng != null) {
    const { userLat, userLng } = filters;
    const radius = filters.radiusMiles ?? DEFAULT_RADIUS_MILES;

    const { data } = await query.limit(1000); // fetch wide; Bergen County is small
    const all = asEvents(data)
      .filter((e) => {
        const v = e.venue as (typeof e.venue & { lat?: number; lng?: number }) | null;
        if (!v?.lat || !v?.lng) return false;
        return withinBoundingBox(userLat, userLng, v.lat, v.lng, radius);
      })
      .map((e) => {
        const v = e.venue as (typeof e.venue & { lat?: number; lng?: number }) | null;
        const dist = v?.lat && v?.lng
          ? haversineDistance(userLat, userLng, v.lat, v.lng)
          : Infinity;
        return { event: e, dist };
      })
      .filter(({ dist }) => dist <= radius)
      .sort((a, b) => a.dist - b.dist)
      .map(({ event }) => event);

    const total = all.length;
    const sliced = all.slice(from, from + pageSize);
    return { events: sliced, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // If a legacy `limit` override is set (homepage snippets etc.) skip pagination
  if (filters.limit) {
    const { data } = await query.limit(filters.limit);
    const events = asEvents(data);
    return { events, total: events.length, page: 1, pageSize: filters.limit, totalPages: 1 };
  }

  const { data, count } = await query.range(from, to);
  const total = count ?? 0;
  return {
    events: asEvents(data),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  return asEvent(data);
}

export async function getRelatedEvents(event: Event): Promise<Event[]> {
  if (!event.category_id) return [];

  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .eq("status", "published")
    .eq("category_id", event.category_id)
    .neq("id", event.id)
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(3);

  return asEvents(data);
}
