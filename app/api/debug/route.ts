import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Temporary debug endpoint — DELETE THIS FILE after fixing the issue
export async function GET() {
  const checks: Record<string, unknown> = {};

  // Check env vars are present (not their values)
  checks.NEXT_PUBLIC_SUPABASE_URL = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  checks.NEXT_PUBLIC_SUPABASE_ANON_KEY = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  checks.SUPABASE_SERVICE_ROLE_KEY = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Show first/last 6 chars of the key so we can verify it's the right one
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  checks.key_preview = key.length > 12
    ? `${key.slice(0, 6)}...${key.slice(-6)} (${key.length} chars)`
    : `too short (${key.length} chars)`;

  // Try fetching events
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
