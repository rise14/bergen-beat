/**
 * POST /api/admin/trigger-import
 *
 * Admin-only endpoint that manually kicks off the import pipeline.
 * Requires an active Supabase session (same auth as /admin pages).
 *
 * This proxies to /api/cron/import with the CRON_SECRET header so
 * all import logic stays in one place.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Verify the caller has a valid admin session
  const cookieStore = cookies();
  const supabase = createServerClient(
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }

  // Proxy the request to the cron endpoint
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const cronUrl = `${siteUrl}/api/cron/import`;

  const cronResponse = await fetch(cronUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const result = await cronResponse.json();
  return NextResponse.json(result, { status: cronResponse.status });
}
