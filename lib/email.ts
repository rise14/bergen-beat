// Email sending via Resend (https://resend.com)
// Install: npm install resend

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bergenbeat.net";
const FROM_ADDRESS = "Bergen Beat <noreply@bergenbeat.net>";

// Lazy-load the Resend client so missing API keys don't crash non-email code paths
function getResend() {
  const { Resend } = require("resend");
  return new Resend(process.env.RESEND_API_KEY);
}

// ─── Submission confirmation ───────────────────────────────────────────────────

export async function sendSubmissionConfirmation({
  to,
  organizerName,
  eventTitle,
}: {
  to: string;
  organizerName: string;
  eventTitle: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `We received your event: ${eventTitle}`,
    html: `
      <p>Hi ${organizerName},</p>
      <p>Thanks for submitting <strong>${eventTitle}</strong> to Bergen Beat!
      We'll review your submission and get back to you within 2 business days.</p>
      <p>— The Bergen Beat Team</p>
    `,
  });
}

// ─── Submission approved ───────────────────────────────────────────────────────

export async function sendSubmissionApproved({
  to,
  organizerName,
  eventTitle,
  eventSlug,
}: {
  to: string;
  organizerName: string;
  eventTitle: string;
  eventSlug: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your event is live on Bergen Beat: ${eventTitle}`,
    html: `
      <p>Hi ${organizerName},</p>
      <p>Great news — <strong>${eventTitle}</strong> has been approved and is now live on Bergen Beat.</p>
      <p><a href="${siteUrl}/events/${eventSlug}">View your event →</a></p>
      <p>— The Bergen Beat Team</p>
    `,
  });
}

// ─── Submission rejected ───────────────────────────────────────────────────────

export async function sendSubmissionRejected({
  to,
  organizerName,
  eventTitle,
  adminNote,
}: {
  to: string;
  organizerName: string;
  eventTitle: string;
  adminNote?: string | null;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Update on your Bergen Beat submission: ${eventTitle}`,
    html: `
      <p>Hi ${organizerName},</p>
      <p>Unfortunately we weren't able to publish <strong>${eventTitle}</strong> on Bergen Beat at this time.</p>
      ${adminNote ? `<p>Note from our team: ${adminNote}</p>` : ""}
      <p>Feel free to resubmit if details change, or reply to this email with questions.</p>
      <p>— The Bergen Beat Team</p>
    `,
  });
}

// ─── Admin notification: new submission ───────────────────────────────────────

export async function sendAdminNewSubmissionAlert({
  eventTitle,
  organizerName,
  organizerEmail,
}: {
  eventTitle: string;
  organizerName: string;
  organizerEmail: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_EMAIL,
    subject: `New event submission: ${eventTitle}`,
    html: `
      <p>A new event was submitted to Bergen Beat.</p>
      <ul>
        <li><strong>Event:</strong> ${eventTitle}</li>
        <li><strong>Organizer:</strong> ${organizerName} (${organizerEmail})</li>
      </ul>
      <p><a href="${siteUrl}/admin/submissions">Review in admin →</a></p>
    `,
  });
}

// ─── Weekly newsletter digest ─────────────────────────────────────────────────

interface DigestEvent {
  title: string;
  slug: string;
  start_date: string;
  is_free: boolean;
  price_range: string | null;
  banner_url: string | null;
  short_description: string | null;
  venue?: { name: string; city: string | null } | null;
  category?: { name: string; icon: string | null } | null;
}

function formatDigestDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function eventCard(event: DigestEvent, siteUrl: string): string {
  const url = `${siteUrl}/events/${event.slug}`;
  const date = formatDigestDate(event.start_date);
  const price = event.is_free ? "Free" : (event.price_range ?? "Paid");
  const venue = event.venue?.name ?? "";
  const city = event.venue?.city ? `, ${event.venue.city}` : "";
  const category = event.category ? `${event.category.icon ?? ""} ${event.category.name}` : "";

  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #f3f4f6;">
        ${event.banner_url ? `
          <a href="${url}">
            <img src="${event.banner_url}" alt="${event.title}"
              style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;display:block;margin-bottom:12px;" />
          </a>` : ""}
        ${category ? `<p style="margin:0 0 4px;font-size:12px;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${category}</p>` : ""}
        <h2 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">
          <a href="${url}" style="color:#111827;text-decoration:none;">${event.title}</a>
        </h2>
        <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">📅 ${date}${venue ? ` &nbsp;·&nbsp; 📍 ${venue}${city}` : ""}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">${price}</p>
        ${event.short_description ? `<p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.5;">${event.short_description}</p>` : ""}
        <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:13px;font-weight:600;padding:8px 16px;border-radius:6px;text-decoration:none;">
          See details →
        </a>
      </td>
    </tr>`;
}

export async function sendWeeklyNewsletter({
  subscribers,
  events,
  weekLabel,
}: {
  subscribers: string[];
  events: DigestEvent[];
  weekLabel: string; // e.g. "May 9–15"
}) {
  if (!subscribers.length || !events.length) return { sent: 0, skipped: true };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const resend = getResend();

  const eventsHtml = events.map((e) => eventCard(e, siteUrl)).join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.02em;">
              🎵 Bergen Beat
            </h1>
            <p style="margin:6px 0 0;color:#c7d2fe;font-size:14px;">
              What's happening in Bergen County — ${weekLabel}
            </p>
          </td>
        </tr>

        <!-- Events -->
        <tr>
          <td style="padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${eventsHtml}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="${siteUrl}/events"
              style="display:inline-block;background:#f3f4f6;color:#374151;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
              Browse all events →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              You're receiving this because you signed up at bergenbeat.net.<br>
              <a href="${siteUrl}" style="color:#6366f1;">Visit Bergen Beat</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Resend supports batch sending — send one email per subscriber
  // For larger lists use Resend's broadcast/audience features
  let sent = 0;
  for (const email of subscribers) {
    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: email,
        subject: `🎵 Bergen Beat: What's happening ${weekLabel}`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send newsletter to ${email}:`, err);
    }
  }

  return { sent, skipped: false };
}
