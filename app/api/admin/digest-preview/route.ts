/**
 * GET /api/admin/digest-preview
 *
 * Returns the Wednesday digest HTML for the current week — without sending it.
 * Used by /admin/digest-preview to render a live preview in the browser.
 * Requires an active admin session.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function getThisWeek(): { start: string; end: string; label: string } {
  const now   = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
  return { start: start.toISOString(), end: end.toISOString(), label: `${fmt(start)}–${fmt(end)}` };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York",
  });
}

export async function GET(req: NextRequest) {
  // Verify admin session
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: Record<string, unknown>) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: Record<string, unknown>) { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminSupabaseClient();
  const { start, end, label } = getThisWeek();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

  const [{ data: eventRows }, { data: sponsoredRow }] = await Promise.all([
    supabase
      .from("events")
      .select(`id, title, slug, start_date, is_free, price_range, banner_url, short_description,
               venue:venues(name, city), category:categories(name, slug, icon)`)
      .eq("status", "published")
      .gte("start_date", start)
      .lte("start_date", end)
      .order("featured", { ascending: false })
      .order("start_date", { ascending: true })
      .limit(40),
    supabase
      .from("events")
      .select(`title, slug, start_date, is_free, price_range, banner_url, short_description,
               venue:venues(name, city), category:categories(name, slug, icon)`)
      .eq("status", "published")
      .eq("is_sponsored", true)
      .gte("start_date", start)
      .order("start_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const events = (eventRows ?? []) as unknown as Array<{
    title: string; slug: string; start_date: string; is_free: boolean;
    price_range: string | null; banner_url: string | null; short_description: string | null;
    venue: { name: string; city: string | null } | null;
    category: { name: string; icon: string | null } | null;
  }>;

  const sponsored = sponsoredRow as unknown as typeof events[0] | null;

  function eventCardHtml(e: typeof events[0], isSponsored = false): string {
    const url   = `${siteUrl}/events/${e.slug}`;
    const date  = formatDate(e.start_date);
    const price = e.is_free ? "Free" : (e.price_range ?? "Paid");
    const venue = e.venue?.name ? `${e.venue.name}${e.venue.city ? `, ${e.venue.city}` : ""}` : "";
    const borderStyle = isSponsored ? "border:2px solid #e05a2b;background:#fff8f5;" : "border:1px solid #f3f4f6;background:#fff;";
    return `
      <tr><td style="padding:0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;${borderStyle}overflow:hidden;">
          ${isSponsored ? `<tr><td style="padding:10px 16px 4px;font-size:11px;font-weight:700;color:#e05a2b;letter-spacing:0.08em;">★ SPONSORED</td></tr>` : ""}
          ${e.banner_url ? `<tr><td style="padding:0 16px 10px;">
            <a href="${url}"><img src="${e.banner_url}" alt="${e.title}"
              style="width:100%;max-height:160px;object-fit:cover;border-radius:6px;display:block;" /></a>
          </td></tr>` : ""}
          <tr><td style="padding:12px 16px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827;">
              <a href="${url}" style="color:#111827;text-decoration:none;">${e.title}</a>
            </p>
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">${date}${venue ? ` · ${venue}` : ""} · ${price}</p>
            ${e.short_description ? `<p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">${e.short_description}</p>` : ""}
          </td></tr>
        </table>
      </td></tr>`;
  }

  const sponsoredHtml = sponsored ? eventCardHtml(sponsored, true) : "";
  const eventsHtml    = events.map((e) => eventCardHtml(e)).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:16px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1e3a5f;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">🎵 Bergen Beat</h1>
            <p style="margin:6px 0 0;color:#a8c4e0;font-size:14px;">What's happening this week — ${label}</p>
          </td>
        </tr>
        ${sponsoredHtml ? `<tr><td style="padding:24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">${sponsoredHtml}</table>
        </td></tr>` : ""}
        <tr><td style="padding:24px 32px;">
          ${events.length === 0
            ? `<p style="color:#6b7280;text-align:center;padding:32px 0;">No events found for ${label}.</p>`
            : `<table width="100%" cellpadding="0" cellspacing="0">${eventsHtml}</table>`}
        </td></tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              ${events.length} event${events.length !== 1 ? "s" : ""} this week ·
              <a href="${siteUrl}" style="color:#9ca3af;">${siteUrl.replace("https://","")}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
