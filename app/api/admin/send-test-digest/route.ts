/**
 * POST /api/admin/send-test-digest
 * Sends a preview of the weekly or weekend digest to the ADMIN_EMAIL address.
 * Protected by the /admin middleware — no extra auth needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendWeeklyNewsletter, sendWeekendDigest } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getWeekLabel() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
  return `${fmt(start)}–${fmt(end)}`;
}

function getWeekendLabel() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = day <= 5 ? 5 - day : 6;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
  return { friday: friday.toISOString(), sunday: sunday.toISOString(), label: `${fmt(friday)}–${fmt(sunday)}` };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const type: "weekly" | "weekend" = body.type === "weekend" ? "weekend" : "weekly";

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@bergenbeat.net";
  // Use a placeholder token that links to the site root
  const adminToken = "test-preview";

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  let events;

  if (type === "weekend") {
    const { friday, sunday, label } = getWeekendLabel();
    const { data } = await supabase
      .from("events")
      .select(`title, slug, start_date, is_free, price_range, banner_url, short_description,
               venue:venues(name, city), category:categories(name, icon)`)
      .eq("status", "published")
      .gte("start_date", friday)
      .lte("start_date", sunday)
      .order("featured", { ascending: false })
      .order("start_date", { ascending: true })
      .limit(10);

    events = data ?? [];
    if (!events.length) {
      return NextResponse.json({ error: "No events this weekend to preview." }, { status: 422 });
    }

    await sendWeekendDigest({
      subscribers: [{ email: adminEmail, token: adminToken }],
      events: events as unknown as Parameters<typeof sendWeekendDigest>[0]["events"],
      weekendLabel: label,
    });
  } else {
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("events")
      .select(`title, slug, start_date, is_free, price_range, banner_url, short_description,
               venue:venues(name, city), category:categories(name, icon)`)
      .eq("status", "published")
      .gte("start_date", now)
      .lte("start_date", twoWeeks)
      .order("featured", { ascending: false })
      .order("start_date", { ascending: true })
      .limit(8);

    events = data ?? [];
    if (!events.length) {
      return NextResponse.json({ error: "No upcoming events to preview." }, { status: 422 });
    }

    await sendWeeklyNewsletter({
      subscribers: [{ email: adminEmail, token: adminToken }],
      events: events as unknown as Parameters<typeof sendWeeklyNewsletter>[0]["events"],
      weekLabel: getWeekLabel(),
    });
  }

  return NextResponse.json({ success: true, to: adminEmail, type, eventCount: events.length });
}
