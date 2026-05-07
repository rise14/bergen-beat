import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendSubscribeConfirmation } from "@/lib/email";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// POST /api/subscribe — adds an email to the newsletter subscriber list
export async function POST(request: Request) {
  // Rate limit: 5 subscribe attempts per IP per hour
  const { allowed, headers: rlHeaders } = await checkRateLimit(request, {
    endpoint: "subscribe",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rlHeaders }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.email?.[0] ?? "Invalid email" },
      { status: 422 }
    );
  }

  const supabase = createAdminSupabaseClient();
  const email = parsed.data.email;

  // Check if already confirmed — silently succeed so we don't leak status
  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("id, confirmed")
    .eq("email", email)
    .maybeSingle();

  if (existing?.confirmed) {
    return NextResponse.json({ success: true });
  }

  // Generate a secure token valid for 48 hours
  const token = crypto.randomUUID();
  const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      { email, confirmed: false, token, token_expires_at: tokenExpiresAt },
      { onConflict: "email" }
    );

  if (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }

  // Send double opt-in email (fire-and-forget — don't let email errors block response)
  sendSubscribeConfirmation({ to: email, token }).catch((err) =>
    console.error("Failed to send confirmation email:", err)
  );

  return NextResponse.json({ success: true, pendingConfirmation: true });
}
