import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {};

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  // Show the actual URL (it's public anyway — NEXT_PUBLIC_ prefix)
  checks.supabase_url = url || "(not set)";
  checks.key_preview = key.length > 12
    ? `${key.slice(0, 6)}...${key.slice(-6)} (${key.length} chars)`
    : `too short (${key.length} chars)`;

  // Try a raw fetch to Supabase to test connectivity
  try {
    const pingRes = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    checks.ping_status = pingRes.status;
    checks.ping_ok = pingRes.ok;
  } catch (err) {
    checks.ping_error = err instanceof Error ? err.message : String(err);
  }

  // Try fetching events via the Supabase client
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, title, status, start_date")
      .order("start_date", { ascending: true })
      .limit(5);

    checks.db_error = error?.message ?? null;
    checks.total_events_returned = data?.length ?? 0;
    checks.events = data?.map((e) => ({
      title: e.title,
      status: e.status,
      start_date: e.start_date,
    }));
  } catch (err) {
    checks.db_exception = err instanceof Error ? err.message : String(err);
  }

  checks.server_time = new Date().toISOString();

  return NextResponse.json(checks, {
    headers: { "Cache-Control": "no-store" },
  });
}
