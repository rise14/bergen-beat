import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — safe to use in Client Components ("use client").
// Uses the public anon key only; subject to Row Level Security policies.
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
