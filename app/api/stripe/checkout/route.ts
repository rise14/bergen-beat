/**
 * POST /api/stripe/checkout
 * Body: { eventSlug: string }
 *
 * Creates a Stripe Checkout session for a $25 sponsored listing.
 * Redirects the browser to Stripe's hosted checkout page.
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe, SPONSOR_PRICE_CENTS, SPONSOR_DURATION_DAYS } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { eventSlug } = await req.json();

  if (!eventSlug || typeof eventSlug !== "string") {
    return NextResponse.json({ error: "eventSlug required" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, status, banner_url")
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found or not published" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: SPONSOR_PRICE_CENTS,
          product_data: {
            name: `Sponsored Listing — ${event.title}`,
            description: `Featured placement for ${SPONSOR_DURATION_DAYS} days on Bergen Beat. Includes homepage carousel, Sponsored badge on event card, and priority slot in the weekly email digest.`,
            images: event.banner_url ? [event.banner_url] : [],
          },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    // Pass the event id in metadata so the webhook can activate the sponsorship
    metadata: {
      event_id:  event.id,
      event_slug: event.slug,
    },
    success_url: `${siteUrl}/sponsor/success?session_id={CHECKOUT_SESSION_ID}&slug=${event.slug}`,
    cancel_url:  `${siteUrl}/sponsor?event=${event.slug}&cancelled=1`,
  });

  return NextResponse.json({ url: session.url });
}
