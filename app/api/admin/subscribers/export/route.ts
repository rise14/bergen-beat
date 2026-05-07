/**
 * GET /api/admin/subscribers/export
 * Downloads all confirmed subscribers as a CSV file.
 * Protected by the same middleware that guards /admin/* routes.
 */

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("email, confirmed, subscribed_at")
    .eq("confirmed", true)
    .order("subscribed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const header = "email,confirmed,subscribed_at";
  const csv = [
    header,
    ...rows.map(
      (r) =>
        `${r.email},${r.confirmed},${new Date(r.subscribed_at).toISOString()}`
    ),
  ].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
