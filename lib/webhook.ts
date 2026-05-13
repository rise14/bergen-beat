/**
 * Social auto-posting webhook
 *
 * When an event is approved, call fireEventWebhook() to POST a structured
 * payload to SOCIAL_WEBHOOK_URL. Point that URL at a Make or Zapier webhook
 * that posts to Instagram, Facebook, etc.
 *
 * Set SOCIAL_WEBHOOK_URL in your environment to activate. No-op when absent.
 */

export interface WebhookEventPayload {
  event_title:       string;
  event_url:         string;
  event_slug:        string;
  start_date:        string;   // ISO 8601
  end_date:          string | null;
  is_free:           boolean;
  price_range:       string | null;
  short_description: string | null;
  banner_url:        string | null;
  venue_name:        string | null;
  venue_city:        string | null;
  category_name:     string | null;
  category_icon:     string | null;
  organizer_name:    string | null;
}

export async function fireEventWebhook(payload: WebhookEventPayload): Promise<void> {
  const url = process.env.SOCIAL_WEBHOOK_URL;
  if (!url) return; // silently no-op if not configured

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      // Short timeout — don't block the approval flow
      signal:  AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[webhook] Social webhook returned ${res.status}:`, await res.text());
    }
  } catch (err) {
    // Log but never throw — a webhook failure must not break event approval
    console.error("[webhook] Failed to fire social webhook:", err);
  }
}
