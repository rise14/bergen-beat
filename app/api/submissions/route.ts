import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendSubmissionConfirmation } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

const submissionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  is_free: z.boolean(),
  price_range: z.string().max(50).optional(),
  external_url: z.string().url("Please provide a valid URL"),
  category_id: z.string().uuid().optional(),
  venue_name: z.string().min(2).max(200),
  venue_address: z.string().max(300).optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  organizer_name: z.string().min(2).max(100),
  organizer_email: z.string().email(),
  banner_url: z.string().url().optional(),
});

// POST /api/submissions — accepts a public event submission
export async function POST(request: Request) {
  // Rate limit: 3 submissions per IP per hour
  const { allowed, headers: rlHeaders } = await checkRateLimit(request, {
    endpoint: "submissions",
    limit: 3,
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

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("event_submissions")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    console.error("Submission insert error:", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }

  // Send confirmation email to the organizer
  await sendSubmissionConfirmation({
    to: parsed.data.organizer_email,
    organizerName: parsed.data.organizer_name,
    eventTitle: parsed.data.title,
  });

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}
