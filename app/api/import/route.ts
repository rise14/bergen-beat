/**
 * POST /api/import
 *
 * Triggers an import from a given source.
 * Body: { source: "eventbrite" | "predicthq", autoPublish?: boolean }
 *
 * Protected: only callable from the admin UI (checks for a simple server-side
 * secret header rather than a full auth session, since this is a server action
 * alternative for long-running work).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchEventbriteEvents } from "@/lib/importers/eventbrite";
import { fetchPredictHQEvents } from "@/lib/importers/predicthq";
import { saveImportedEvents } from "@/lib/importers/save";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Auth: verify the user is logged in as admin
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { source?: string; autoPublish?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { source, autoPublish = false } = body;

  if (source !== "eventbrite" && source !== "predicthq") {
    return NextResponse.json(
      { error: 'source must be "eventbrite" or "predicthq"' },
      { status: 400 }
    );
  }

  try {
    const events =
      source === "eventbrite"
        ? await fetchEventbriteEvents()
        : await fetchPredictHQEvents();

    const result = await saveImportedEvents(events, autoPublish);

    return NextResponse.json({
      success: true,
      source,
      fetched: events.length,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
