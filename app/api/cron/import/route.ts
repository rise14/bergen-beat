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
import { enrichWithImages } from "@/lib/importers/images";
import { saveImportedEvents } from "@/lib/importers/save";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — imports can take a while

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (or an authorised manual trigger)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary: Record<string, unknown> = {
    started_at: new Date().toISOString(),
  };

  // ── Ticketmaster ──────────────────────────────────────────────────────────
  try {
    const raw = await fetchTicketmasterEvents();
    const enriched = await enrichWithImages(raw);
    const result = await saveImportedEvents(enriched, true); // auto-publish
    summary.ticketmaster = { fetched: raw.length, ...result };
  } catch (err) {
    summary.ticketmaster = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // ── PredictHQ ─────────────────────────────────────────────────────────────
  try {
    const raw = await fetchPredictHQEvents();
    const enriched = await enrichWithImages(raw);
    const result = await saveImportedEvents(enriched, true); // auto-publish
    summary.predicthq = { fetched: raw.length, ...result };
  } catch (err) {
    summary.predicthq = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Bust the ISR cache so the homepage shows new events immediately
  revalidatePath("/");
  revalidatePath("/events");

  summary.finished_at = new Date().toISOString();

  console.log("[cron/import]", JSON.stringify(summary));

  return NextResponse.json(summary);
}
