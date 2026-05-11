import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;
  const preferences = body?.preferences as Record<string, unknown> | undefined;

  if (!token || !preferences) {
    return NextResponse.json({ error: "Missing token or preferences" }, { status: 400 });
  }

  // Sanitize — only allow known keys
  const cleanPrefs = {
    neighborhoods: Array.isArray(preferences.neighborhoods) ? preferences.neighborhoods.filter((v: unknown) => typeof v === "string") : [],
    categories:    Array.isArray(preferences.categories)    ? preferences.categories.filter((v: unknown) => typeof v === "string")    : [],
    frequency:     ["weekly", "weekend", "both"].includes(preferences.frequency as string) ? preferences.frequency : "weekly",
  };

  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ preferences: cleanPrefs })
    .eq("token", token)
    .is("unsubscribed_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
