/**
 * GET /api/admin/check-duplicate?title=...&date=...&excludeId=...
 *
 * Returns any published/draft events whose title closely matches AND whose
 * start_date falls within 3 days of the given date.
 *
 * Used by the admin EventForm to warn before saving a potential duplicate.
 */

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const date = searchParams.get("date")?.trim();
  const excludeId = searchParams.get("excludeId")?.trim();

  if (!title || title.length < 3) {
    return NextResponse.json({ duplicates: [] });
  }

  const supabase = createAdminSupabaseClient();

  // Build a loose title match: strip common words and search for the core phrase
  const normalized = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const words = normalized.split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return NextResponse.json({ duplicates: [] });

  // Use ilike with first few significant words — good enough for Bergen County scale
  const searchPhrase = words.slice(0, 4).join(" ");

  let query = supabase
    .from("events")
    .select("id, title, slug, start_date, status")
    .ilike("title", `%${searchPhrase}%`)
    .in("status", ["draft", "published"]);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  // If a date is given, constrain to ±3 days
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const from = new Date(d);
      from.setDate(from.getDate() - 3);
      const to = new Date(d);
      to.setDate(to.getDate() + 3);
      query = query
        .gte("start_date", from.toISOString())
        .lte("start_date", to.toISOString());
    }
  }

  const { data } = await query.limit(5);

  return NextResponse.json({ duplicates: data ?? [] });
}
