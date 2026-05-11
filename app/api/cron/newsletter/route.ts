/**
 * GET /api/cron/newsletter
 *
 * Sends the weekly Bergen Beat digest to all confirmed subscribers
 * whose frequency preference is "weekly" or "both".
 * Scheduled via vercel.json to run every Thursday at noon ET.
 *
 * Secured with CRON_SECRET — Vercel sends this automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendWeeklyNewsletter } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getWeekLabel(): string {
  // Label = "May 9–15" covering the next 7 days from today
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  return `${fmt(start)}–${fmt(end)}`;
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

  // Fetch confirmed, active subscribers with their token and preferences
  const { data: subscriberRows, error: subError } = await supabase
    .from("newsletter_subscribers")
    .select("email, token, preferences")
    .eq("confirmed", true)
    .is("unsubscribed_at", null);

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  // Only send weekly digest to subscribers who want it (weekly or both; default = weekly)
  const eligible = ((subscriberRows ?? []) as SubscriberRow[]).filter((s) => {
    const freq = s.preferences?.frequency ?? "weekly";
    return freq === "weekly" || freq === "both";
  });

  if (!eligible.length) {
    return NextResponse.json({ message: "No eligible subscribers", sent: 0 });
  }

  // Fetch the best upcoming events for the next 14 days
  const now = new Date().toISOString();
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: eventRows, error: evError } = await supabase
    .from("events")
    .select(`
      id, title, slug, start_date, is_free, price_range, banner_url, short_description,
      venue:venues(name, city),
      category:categories(name, slug, icon),
      neighborhood:neighborhoods(slug)
    `)
    .eq("status", "published")
    .gte("start_date", now)
    .lte("start_date", twoWeeks)
    .order("featured", { ascending: false })
    .order("start_date", { ascending: true })
    .limit(40); // fetch more; we'll filter per-subscriber

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
    return NextResponse.json({ message: "No upcoming events to send", sent: 0 });
  }

  const weekLabel = getWeekLabel();
  let totalSent = 0;

  // Send per-subscriber with preference filtering
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
    }).slice(0, 8);

    // Skip subscriber if no matching events
    if (!filtered.length) continue;

    const result = await sendWeeklyNewsletter({
      subscribers: [{ email: sub.email, token: sub.token }],
      events: filtered,
      weekLabel,
    });
    totalSent += result.sent;
  }

  // Save edition to archive (best-effort — don't fail the cron if this errors)
  // Use the union of all event IDs sent (unique across all subscribers)
  const sentEventIds = [...new Set(allEvents.map((e) => e.id))];
  try {
    await supabase.from("newsletter_archive").insert({
      type: "weekly",
      week_label: weekLabel,
      event_ids: sentEventIds,
      sent_count: totalSent,
    });
  } catch (archiveErr) {
    console.warn("[cron/newsletter] Failed to save archive entry:", archiveErr);
  }

  console.log("[cron/newsletter]", { weekLabel, eligible: eligible.length, totalSent });

  return NextResponse.json({
    success: true,
    weekLabel,
    eligibleCount: eligible.length,
    sent: totalSent,
  });
}
