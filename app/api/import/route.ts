/**
 * POST /api/import
 *
 * Triggers an import from a given source.
 * Body: { source: "ticketmaster" | "predicthq" | "ical", autoPublish?: boolean, sourceId?: string }
 *
 * For "ical":
 *   - omit sourceId  → import all enabled iCal sources
 *   - include sourceId → import that specific source only
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchTicketmasterEvents } from "@/lib/importers/ticketmaster";
import { fetchPredictHQEvents } from "@/lib/importers/predicthq";
import { fetchAllIcalSources, fetchIcalSource } from "@/lib/importers/ical";
import { fetchRssSource } from "@/lib/importers/rss";
import { enrichWithImages } from "@/lib/importers/images";
import { saveImportedEvents } from "@/lib/importers/save";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import type { ImportedEvent } from "@/types";

export async function POST(req: NextRequest) {
  // Auth: verify the user is logged in as admin
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { source?: string; autoPublish?: boolean; sourceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { source, autoPublish = false, sourceId } = body;

  if (source !== "ticketmaster" && source !== "predicthq" && source !== "ical") {
    return NextResponse.json(
      { error: 'source must be "ticketmaster", "predicthq", or "ical"' },
      { status: 400 }
    );
  }

  // ── iCal import (one source or all) ──────────────────────────────────────────
  if (source === "ical") {
    try {
      let allEvents: ImportedEvent[] = [];
      const perSourceResults: Array<{ name: string; fetched: number; error: string | null }> = [];

      if (sourceId) {
        // Import a single source
        const admin = createAdminSupabaseClient();
        const { data: row } = await admin
          .from("ical_sources")
          .select("*")
          .eq("id", sourceId)
          .single();

        if (!row) {
          return NextResponse.json({ error: "iCal source not found" }, { status: 404 });
        }

        try {
          const typedRow = row as Parameters<typeof fetchIcalSource>[0];
          const events =
            row.source_type === "rss"
              ? await fetchRssSource(typedRow)
              : await fetchIcalSource(typedRow);
          allEvents = events;
          perSourceResults.push({ name: row.name, fetched: events.length, error: null });

          // Update last_fetched_at
          await admin
            .from("ical_sources")
            .update({ last_fetched_at: new Date().toISOString() })
            .eq("id", sourceId);
        } catch (err) {
          perSourceResults.push({
            name: row.name,
            fetched: 0,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        // Import all enabled sources
        const results = await fetchAllIcalSources();
        for (const r of results) {
          allEvents = allEvents.concat(r.events);
          perSourceResults.push({ name: r.source.name, fetched: r.fetched, error: r.error });
        }
      }

      const enriched = await enrichWithImages(allEvents);
      const saveResult = await saveImportedEvents(enriched, autoPublish);

      return NextResponse.json({
        success: true,
        source: "ical",
        fetched: allEvents.length,
        sources: perSourceResults,
        ...saveResult,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── Ticketmaster / PredictHQ ──────────────────────────────────────────────────
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
