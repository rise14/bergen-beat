/**
 * Serverless-compatible IP-based rate limiting via Supabase.
 *
 * Each request is a row in the `rate_limits` table.
 * On every check we:
 *  1. Delete rows older than the window (self-cleaning)
 *  2. Count how many remain for this key
 *  3. If under limit, insert a new row and allow
 *  4. If at limit, reject with 429
 *
 * Race conditions are possible on simultaneous requests but are acceptable
 * for a small local events site — the worst case is a slight over-allowance.
 *
 * Requires the following table (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS rate_limits (
 *     id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *     key        text        NOT NULL,
 *     created_at timestamptz NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX IF NOT EXISTS rate_limits_key_idx
 *     ON rate_limits (key, created_at DESC);
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export interface RateLimitOptions {
  /** Logical name for the endpoint, e.g. "subscribe" */
  endpoint: string;
  /** Max requests allowed within the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Headers to attach to the response */
  headers: Record<string, string>;
}

/** Extract the best available IP from a Next.js Request. */
function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { endpoint, limit, windowMs } = options;
  const ip = getIp(request);
  const key = `${ip}:${endpoint}`;
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  const supabase = createAdminSupabaseClient();

  // 1. Remove expired rows for this key (fire-and-forget — don't await)
  supabase
    .from("rate_limits")
    .delete()
    .eq("key", key)
    .lt("created_at", windowStart)
    .then(() => {});

  // 2. Count remaining rows in window
  const { count } = await supabase
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", windowStart);

  const current = count ?? 0;
  const remaining = Math.max(0, limit - current - 1);
  const resetAt = Math.ceil((Date.now() + windowMs) / 1000); // Unix timestamp

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetAt),
  };

  if (current >= limit) {
    return {
      allowed: false,
      headers: { ...headers, "Retry-After": String(Math.ceil(windowMs / 1000)) },
    };
  }

  // 3. Log this request
  await supabase.from("rate_limits").insert({ key });

  return { allowed: true, headers };
}
