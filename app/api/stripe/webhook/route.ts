/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe events. Handles checkout.session.completed to activate
 * a sponsored listing (sets is_sponsored=true, featured_until=now+7days).
 *
 * Configure in Stripe Dashboard: Webhooks → Add endpoint
 * URL: https://www.bergenbeat.net/api/stripe/webhook
 * Events: checkout.session.completed
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe, SPONSOR_DURATION_DAYS } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendSponsorshipConfirmation } from "@/lib/email";

export const dynamic = "force-dynamic";

// Required: disable body parsing so we can verify the raw Stripe signature
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { event_id?: string; event_slug?: string };
      customer_details?: { email?: string };
      payment_status: string;
    };

    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: true });
    }

    const eventId   = session.metadata?.event_id;
    const eventSlug = session.metadata?.event_slug;
    const email     = session.customer_details?.email ?? null;

    if (!eventId) {
      console.error("[stripe/webhook] No event_id in metadata");
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
    }

    // Activate the sponsored listing
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + SPONSOR_DURATION_DAYS);

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("events")
      .update({
        is_sponsored:  true,
        featured:      true,
        featured_until: featuredUntil.toISOString().slice(0, 10),
      })
      .eq("id", eventId);

    if (error) {
      console.error("[stripe/webhook] Failed to update event:", error.message);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    // Send confirmation email to the buyer
    if (email && eventSlug) {
      await sendSponsorshipConfirmation({
        to:          email,
        eventSlug,
        featuredUntil: featuredUntil.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      }).catch((err) => console.error("[stripe/webhook] Email failed:", err));
    }

    console.log(`[stripe/webhook] Sponsored event ${eventId} until ${featuredUntil.toISOString().slice(0, 10)}`);
  }

  return NextResponse.json({ ok: true });
}
