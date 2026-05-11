/**
 * GET /api/cron/weekend-digest
 *
 * Sends "This weekend in Bergen County" to subscribers whose frequency
 * preference is "weekend" or "both".
 * Scheduled via vercel.json to run every Friday at 8 AM ET.
 *
 * Secured with CRON_SECRET — Vercel sends this automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendWeekendDigest } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Returns { friday, sunday } as ISO date strings for the upcoming weekend. */
function getUpcomingWeekend(): { friday: string; sunday: string; label: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 5=Fri … 6=Sat

  // Days until next Friday (if today IS Friday, use today)
  const daysUntilFriday = day <= 5 ? 5 - day : 6; // Sat → next Fri = 6 days
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  return {
    friday: friday.toISOString(),
    sunday: sunday.toISOString(),
    label: `${fmt(friday)}–${fmt(sunday)}`,
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

  // Confirmed, active subscribers who want weekend digest
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
    return freq === "weekend" || freq === "both";
  });

  if (!eligible.length) {
    return NextResponse.json({ message: "No subscribers opted in to weekend digest", sent: 0 });
  }

  const { friday, sunday, label } = getUpcomingWeekend();

  // Fetch this weekend's published events
  const { data: eventRows, error: evError } = await supabase
    .from("events")
    .select(`
      id, title, slug, start_date, is_free, price_range, banner_url, short_description,
      venue:venues(name, city),
      category:categories(name, slug, icon),
      neighborhood:neighborhoods(slug)
    `)
    .eq("status", "published")
    .gte("start_date", friday)
    .lte("start_date", sunday)
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
    return NextResponse.json({ message: "No events this weekend", sent: 0 });
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
    }).slice(0, 10); // up to 10 events for the weekend preview

    if (!filtered.length) continue;

    const result = await sendWeekendDigest({
      subscribers: [{ email: sub.email, token: sub.token }],
      events: filtered,
      weekendLabel: label,
    });
    totalSent += result.sent;
  }

  // Save to archive
  const sentEventIds = [...new Set(allEvents.map((e) => e.id))];
  try {
    await supabase.from("newsletter_archive").insert({
      type: "weekend",
      week_label: label,
      event_ids: sentEventIds,
      sent_count: totalSent,
    });
  } catch (archiveErr) {
    console.warn("[cron/weekend-digest] Failed to save archive entry:", archiveErr);
  }

  console.log("[cron/weekend-digest]", { weekendLabel: label, eligible: eligible.length, totalSent });

  return NextResponse.json({
    success: true,
    weekendLabel: label,
    eligibleCount: eligible.length,
    sent: totalSent,
  });
}
