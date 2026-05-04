import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

// GET /api/events — returns published events as JSON (useful for future map/search features)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const neighborhoodSlug = searchParams.get("neighborhood");
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from("events")
    .select(
      `id, title, slug, short_description, start_date, end_date, is_free, price_range,
       banner_url, featured,
       category:categories(id, name, slug, icon, color),
       venue:venues(id, name, city, lat, lng),
       neighborhood:neighborhoods(id, name, slug)`
    )
    .eq("status", "published")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(limit);

  if (categorySlug) {
    // Join filter via category slug
    query = query.eq("category.slug", categorySlug);
  }

  if (neighborhoodSlug) {
    query = query.eq("neighborhood.slug", neighborhoodSlug);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data });
}
