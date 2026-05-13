/**
 * POST /api/events/view
 * Body: { eventId: string }
 *
 * Logs a page view for an event. Called from the client on mount.
 * Fire-and-forget from the client — any error is silently ignored.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { eventId } = await req.json();
    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json({ error: "eventId required" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    await supabase.from("event_views").insert({ event_id: eventId });

    return NextResponse.json({ ok: true });
  } catch {
    // Never surface errors to the client
    return NextResponse.json({ ok: true });
  }
}
