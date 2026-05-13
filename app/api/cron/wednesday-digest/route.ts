/**
 * GET /api/cron/wednesday-digest
 *
 * Sends "What's happening this week in Bergen County" to subscribers whose
 * frequency preference is "weekly" or "both".
 * Scheduled via vercel.json to run every Wednesday at noon ET.
 *
 * Secured with CRON_SECRET — Vercel sends this automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendWednesdayDigest } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Returns the current Wed–Tue window as ISO strings + a human label. */
function getThisWeek(): { start: string; end: string; label: string } {
  const now = new Date();

  // Start = today at midnight ET (treat server time as UTC; close enough for day window)
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  // End = 7 days from now
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  return {
    start: start.toISOString(),
    end:   end.toISOString(),
    label: `${fmt(start)}–${fmt(end)}`,
  };
}

interface SubscriberRow {
  email: string;
  token: string;
  preferences: { frequency?: string; neighborhoods?: string[]; categories?: string[] } | null;
}

export async function GET(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  // Confirmed, active subscribers who want weekly digest
  const { data: subscriberRows, error: subError } = await supabase
    .from("newsletter_subscribers")
    .select("email, token, preferences")
    .eq("confirmed", true)
    .is("unsubscribed_at", null);

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  const eligible = ((subscriberRows ?? []) as SubscriberRow[]).filter((s) => {
    const freq = s.preferences?.frequency ?? "weekly";
    return freq === "weekly" || freq === "both";
  });

  if (!eligible.length) {
    return NextResponse.json({ message: "No subscribers opted in to weekly digest", sent: 0 });
  }

  const { start, end, label } = getThisWeek();

  // Fetch this week's published events
  const { data: eventRows, error: evError } = await supabase
    .from("events")
    .select(`
      id, title, slug, start_date, is_free, price_range, banner_url, short_description,
      venue:venues(name, city),
      category:categories(name, slug, icon),
      neighborhood:neighborhoods(slug)
    `)
    .eq("status", "published")
    .gte("start_date", start)
    .lte("start_date", end)
    .order("featured", { ascending: false })
    .order("start_date", { ascending: true })
    .limit(40);

  if (evError) {
    return NextResponse.json({ error: evError.message }, { status: 500 });
  }

  const allEvents = (eventRows ?? []) as unknown as Array<{
    id: string; title: string; slug: string; start_date: string;
    is_free: boolean; price_range: string | null; banner_url: string | null;
    short_description: string | null;
    venue: { name: string; city: string | null } | null;
    category: { name: string; slug: string; icon: string | null } | null;
    neighborhood: { slug: string } | null;
  }>;

  if (!allEvents.length) {
    return NextResponse.json({ message: "No events this week", sent: 0 });
  }

  let totalSent = 0;

  for (const sub of eligible) {
    const prefs = sub.preferences ?? {};
    const wantedNeighborhoods = prefs.neighborhoods ?? [];
    const wantedCategories    = prefs.categories    ?? [];

    const filtered = allEvents.filter((e) => {
      const neighborhoodOk = !wantedNeighborhoods.length ||
        (e.neighborhood?.slug && wantedNeighborhoods.includes(e.neighborhood.slug));
      const categoryOk = !wantedCategories.length ||
        (e.category?.slug && wantedCategories.includes(e.category.slug));
      return neighborhoodOk && categoryOk;
    }).slice(0, 12);

    if (!filtered.length) continue;

    const result = await sendWednesdayDigest({
      subscribers: [{ email: sub.email, token: sub.token }],
      events: filtered,
      weekLabel: label,
    });
    totalSent += result.sent;
  }

  // Archive
  const sentEventIds = [...new Set(allEvents.map((e) => e.id))];
  try {
    await supabase.from("newsletter_archive").insert({
      type: "weekly",
      week_label: label,
      event_ids: sentEventIds,
      sent_count: totalSent,
    });
  } catch (archiveErr) {
    console.warn("[cron/wednesday-digest] Failed to save archive entry:", archiveErr);
  }

  console.log("[cron/wednesday-digest]", { weekLabel: label, eligible: eligible.length, totalSent });

  return NextResponse.json({
    success: true,
    weekLabel: label,
    eligibleCount: eligible.length,
    sent: totalSent,
  });
}
