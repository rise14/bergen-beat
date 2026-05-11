/**
 * GET /api/cron/expire
 * Archives published events that ended more than 7 days ago.
 * Runs nightly via Vercel cron (see vercel.json).
 *
 * Logic:
 *  - If the event has an end_date  → archive if end_date  < now - 7 days
 *  - If no end_date                → archive if start_date < now - 7 days
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createAdminSupabaseClient();

  // Archive published events where the effective end date is past the cutoff.
  // Supabase doesn't support "coalesce" in filters directly, so we run two queries:

  // 1. Events with an explicit end_date that has passed the cutoff
  const { data: byEndDate, error: e1 } = await supabase
    .from("events")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("status", "published")
    .lt("end_date", cutoff)
    .select("id, title");

  // 2. Events with no end_date whose start_date has passed the cutoff
  const { data: byStartDate, error: e2 } = await supabase
    .from("events")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("status", "published")
    .is("end_date", null)
    .lt("start_date", cutoff)
    .select("id, title");

  if (e1 || e2) {
    const msg = [e1?.message, e2?.message].filter(Boolean).join("; ");
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const archived = [...(byEndDate ?? []), ...(byStartDate ?? [])];

  // Bust ISR cache so expired events drop off the homepage and /events immediately
  if (archived.length > 0) {
    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath("/this-weekend");
  }

  console.log(`[cron/expire] archived ${archived.length} event(s)`);

  return NextResponse.json({
    archived: archived.length,
    titles: archived.map((e) => e.title),
  });
}
