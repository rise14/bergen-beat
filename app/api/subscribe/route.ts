import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// POST /api/subscribe — adds an email to the newsletter subscriber list
export async function POST(request: Request) {
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

  // Upsert — silently succeeds if email already exists
  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert({ email: parsed.data.email }, { onConflict: "email" });

  if (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }

  // TODO Phase 2: send double opt-in confirmation email via Resend

  return NextResponse.json({ success: true });
}
