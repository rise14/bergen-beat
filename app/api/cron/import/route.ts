/**
 * GET /api/cron/import
 *
 * Called automatically by Vercel Cron once per day.
 * Imports from both Ticketmaster and PredictHQ, auto-publishes results.
 *
 * Secured with CRON_SECRET — Vercel sends this automatically.
 * Never call this endpoint manually without the correct Authorization header.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchTicketmasterEvents } from "@/lib/importers/ticketmaster";
import { fetchPredictHQEvents } from "@/lib/importers/predicthq";
import { fetchAllIcalSources } from "@/lib/importers/ical";
import { enrichWithImages } from "@/lib/importers/images";
import { saveImportedEvents } from "@/lib/importers/save";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (or an authorised manual trigger)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Set CRON_AUTO_PUBLISH=true in Vercel env to publish imported events immediately.
  // Default: false (events land as drafts for admin review).
  const autoPublish = process.env.CRON_AUTO_PUBLISH === "true";

  const summary: Record<string, unknown> = {
    started_at: new Date().toISOString(),
    autoPublish,
  };

  // ── Ticketmaster ──────────────────────────────────────────────────────────
  try {
    const raw = await fetchTicketmasterEvents();
    const enriched = await enrichWithImages(raw);
    const result = await saveImportedEvents(enriched, autoPublish);
    summary.ticketmaster = { fetched: raw.length, ...result };
  } catch (err) {
    summary.ticketmaster = { error: err instanceof Error ? err.message : String(err) };
  }

  // ── PredictHQ ─────────────────────────────────────────────────────────────
  try {
    const raw = await fetchPredictHQEvents();
    const enriched = await enrichWithImages(raw);
    const result = await saveImportedEvents(enriched, autoPublish);
    summary.predicthq = { fetched: raw.length, ...result };
  } catch (err) {
    summary.predicthq = { error: err instanceof Error ? err.message : String(err) };
  }

  // ── iCal feeds ────────────────────────────────────────────────────────────
  try {
    const supabase = createAdminSupabaseClient();
    const icalResults = await fetchAllIcalSources();
    const allEvents = icalResults.flatMap((r) => r.events);
    const enriched = await enrichWithImages(allEvents);
    const result = await saveImportedEvents(enriched, autoPublish);

    // Update last_fetched_at for all sources that ran
    const now = new Date().toISOString();
    for (const r of icalResults) {
      if (!r.error) {
        await supabase
          .from("ical_sources")
          .update({ last_fetched_at: now })
          .eq("id", r.source.id);
      }
    }

    summary.ical = {
      sources: icalResults.map((r) => ({
        name: r.source.name,
        fetched: r.fetched,
        error: r.error,
      })),
      total_fetched: allEvents.length,
      ...result,
    };
  } catch (err) {
    summary.ical = { error: err instanceof Error ? err.message : String(err) };
  }

  // Bust the ISR cache so the homepage shows new events immediately
  revalidatePath("/");
  revalidatePath("/events");

  summary.finished_at = new Date().toISOString();

  console.log("[cron/import]", JSON.stringify(summary));

  return NextResponse.json(summary);
}
