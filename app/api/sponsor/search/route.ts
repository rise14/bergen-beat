/**
 * GET /api/sponsor/search?q=<query>&bySlug=1
 *
 * Returns published events matching the title query (or exact slug).
 * Used by the /sponsor page event picker.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q      = (searchParams.get("q") ?? "").trim();
  const bySlug = searchParams.get("bySlug") === "1";

  if (!q) return NextResponse.json([]);

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from("events")
    .select("id, title, slug, start_date, is_sponsored")
    .eq("status", "published")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(8);

  if (bySlug) {
    query = query.eq("slug", q);
  } else {
    query = query.ilike("title", `%${q}%`);
  }

  const { data } = await query;
  return NextResponse.json(data ?? []);
}
