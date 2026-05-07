/**
 * GET /api/confirm-email?token=<uuid>
 *
 * Validates the double opt-in token and marks the subscriber as confirmed.
 * Redirects to /confirm-subscription?status=success|invalid|expired
 */

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/confirm-subscription?status=invalid`);
  }

  const supabase = createAdminSupabaseClient();

  const { data: subscriber, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, confirmed, token_expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !subscriber) {
    return NextResponse.redirect(`${siteUrl}/confirm-subscription?status=invalid`);
  }

  if (subscriber.confirmed) {
    // Already confirmed — redirect to success anyway
    return NextResponse.redirect(`${siteUrl}/confirm-subscription?status=success`);
  }

  // Check expiry
  if (subscriber.token_expires_at && new Date(subscriber.token_expires_at) < new Date()) {
    return NextResponse.redirect(`${siteUrl}/confirm-subscription?status=expired`);
  }

  // Token is valid — confirm and clear it
  const { error: updateError } = await supabase
    .from("newsletter_subscribers")
    .update({ confirmed: true, token: null })
    .eq("id", subscriber.id);

  if (updateError) {
    console.error("Confirm subscriber error:", updateError);
    return NextResponse.redirect(`${siteUrl}/confirm-subscription?status=error`);
  }

  return NextResponse.redirect(`${siteUrl}/confirm-subscription?status=success`);
}
