/**
 * GET /api/cron/newsletter
 *
 * Sends the weekly Bergen Beat digest to all subscribers.
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
  const now = new Date();
  const start = new Date(now);
  // Find this Saturday
  const dayOfWeek = start.getDay(); // 0=Sun, 4=Thu
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
  start.setDate(start.getDate() + daysUntilSat - 1); // Start from tomorrow (Fri)
  start.setDate(start.getDate() - (daysUntilSat === 7 ? 6 : daysUntilSat - 2));

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  return `${fmt(start)}–${fmt(end)}`;
}

export async function GET(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  // Fetch all confirmed subscribers
  const { data: subscriberRows, error: subError } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("confirmed", true);

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  const subscribers = (subscriberRows ?? []).map((r) => r.email as string);

  if (!subscribers.length) {
    return NextResponse.json({ message: "No subscribers yet", sent: 0 });
  }

  // Fetch the best upcoming events for the next 14 days
  const now = new Date().toISOString();
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: eventRows, error: evError } = await supabase
    .from("events")
    .select(`
      title, slug, start_date, is_free, price_range, banner_url, short_description,
      venue:venues(name, city),
      category:categories(name, icon)
    `)
    .eq("status", "published")
    .gte("start_date", now)
    .lte("start_date", twoWeeks)
    .order("featured", { ascending: false })
    .order("start_date", { ascending: true })
    .limit(8);

  if (evError) {
    return NextResponse.json({ error: evError.message }, { status: 500 });
  }

  const events = (eventRows ?? []) as unknown as Parameters<typeof sendWeeklyNewsletter>[0]["events"];

  if (!events.length) {
    return NextResponse.json({ message: "No upcoming events to send", sent: 0 });
  }

  const weekLabel = getWeekLabel();
  const result = await sendWeeklyNewsletter({ subscribers, events, weekLabel });

  console.log("[cron/newsletter]", { weekLabel, subscribers: subscribers.length, ...result });

  return NextResponse.json({
    success: true,
    weekLabel,
    subscriberCount: subscribers.length,
    eventCount: events.length,
    ...result,
  });
}
