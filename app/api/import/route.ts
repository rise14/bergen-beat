/**
 * POST /api/import
 *
 * Triggers an import from a given source.
 * Body: { source: "ticketmaster" | "predicthq", autoPublish?: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchTicketmasterEvents } from "@/lib/importers/ticketmaster";
import { fetchPredictHQEvents } from "@/lib/importers/predicthq";
import { enrichWithImages } from "@/lib/importers/images";
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

  if (source !== "ticketmaster" && source !== "predicthq") {
    return NextResponse.json(
      { error: 'source must be "ticketmaster" or "predicthq"' },
      { status: 400 }
    );
  }

  try {
    const rawEvents =
      source === "ticketmaster"
        ? await fetchTicketmasterEvents()
        : await fetchPredictHQEvents();

    // Fill in missing banner images from Unsplash (no-op if UNSPLASH_ACCESS_KEY not set)
    const events = await enrichWithImages(rawEvents);

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
