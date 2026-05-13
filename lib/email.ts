// Email sending via Resend (https://resend.com)
// Install: npm install resend

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bergenbeat.net";
const FROM_ADDRESS = "Bergen Beat <noreply@bergenbeat.net>";

// Lazy-load the Resend client so missing API keys don't crash non-email code paths
function getResend() {
  const { Resend } = require("resend");
  return new Resend(process.env.RESEND_API_KEY);
}

// ─── Newsletter double opt-in ─────────────────────────────────────────────────

export async function sendSubscribeConfirmation({
  to,
  token,
}: {
  to: string;
  token: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const confirmUrl = `${siteUrl}/api/confirm-email?token=${token}`;
  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Confirm your Bergen Beat subscription",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 16px;">
        <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">
          🎵 Almost there!
        </h1>
        <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
          Click the button below to confirm your email and start receiving the
          Bergen Beat weekly events digest.
        </p>
        <a href="${confirmUrl}"
          style="display:inline-block;background:#3355ba;color:#fff;font-size:15px;font-weight:600;
                 padding:12px 28px;border-radius:8px;text-decoration:none;">
          Confirm my subscription →
        </a>
        <p style="margin:24px 0 0;font-size:13px;color:#374151;">
          After confirming, you can
          <a href="${siteUrl}/preferences?token=${token}" style="color:#3355ba;">
            set your preferences
          </a>
          — choose neighborhoods, categories, and whether you want a weekly digest,
          a Friday weekend preview, or both.
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
          If you didn't sign up for Bergen Beat, you can safely ignore this email.
          This link expires in 48 hours.
        </p>
      </div>
    `,
  });
}

// ─── Shared transactional email shell ────────────────────────────────────────

function transactionalEmail({ siteUrl, body }: { siteUrl: string; body: string }): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td>
      <table width="560" align="center" cellpadding="0" cellspacing="0"
        style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1e3a5f;padding:22px 32px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.01em;">🎵 Bergen Beat</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${body}
            <p style="margin:32px 0 0;font-size:14px;color:#6b7280;">— The Bergen Beat Team</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Bergen County, NJ &nbsp;·&nbsp;
              <a href="${siteUrl}" style="color:#9ca3af;">${siteUrl.replace("https://", "")}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `We received your event: ${eventTitle}`,
    html: transactionalEmail({
      siteUrl,
      body: `
        <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${organizerName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
          Thanks for submitting <strong>${eventTitle}</strong> to Bergen Beat!
          We'll review your submission and get back to you within 2 business days.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
          In the meantime, feel free to browse upcoming events in Bergen County.
        </p>
        <a href="${siteUrl}/events"
          style="display:inline-block;background:#e05a2b;color:#fff;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;text-decoration:none;">
          Browse events →
        </a>`,
    }),
  });
}

// ─── Submission approved ───────────────────────────────────────────────────────

export async function sendSubmissionApproved({
  to,
  organizerName,
  eventTitle,
  eventSlug,
  editToken,
}: {
  to: string;
  organizerName: string;
  eventTitle: string;
  eventSlug: string;
  editToken?: string | null;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const resend = getResend();
  const editSection = editToken
    ? `
        <p style="margin:16px 0 0;font-size:14px;color:#374151;line-height:1.6;">
          Need to update the details? You can edit your event at any time using this private link:
        </p>
        <a href="${siteUrl}/edit-event/${editToken}"
          style="display:inline-block;margin-top:10px;background:#f3f4f6;color:#1e3a5f;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;border:1px solid #d1d5db;">
          ✏️ Edit your event →
        </a>
        <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">
          Keep this link safe — anyone with it can edit your event listing.
        </p>`
    : "";

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your event is live on Bergen Beat: ${eventTitle}`,
    html: transactionalEmail({
      siteUrl,
      body: `
        <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${organizerName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
          Great news — <strong>${eventTitle}</strong> has been approved and is now live on Bergen Beat! 🎉
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
          Share it with your community to spread the word.
        </p>
        <a href="${siteUrl}/events/${eventSlug}"
          style="display:inline-block;background:#e05a2b;color:#fff;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;text-decoration:none;">
          View your event →
        </a>
        ${editSection}`,
    }),
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const resend = getResend();
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Update on your Bergen Beat submission: ${eventTitle}`,
    html: transactionalEmail({
      siteUrl,
      body: `
        <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${organizerName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
          Unfortunately we weren't able to publish <strong>${eventTitle}</strong> on Bergen Beat at this time.
        </p>
        ${adminNote ? `
        <div style="margin:0 0 16px;padding:12px 16px;background:#f9fafb;border-left:3px solid #d1d5db;border-radius:4px;">
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;"><strong>Note from our team:</strong> ${adminNote}</p>
        </div>` : ""}
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
          Feel free to resubmit with updated details, or reply to this email with any questions.
        </p>
        <a href="${siteUrl}/submit"
          style="display:inline-block;background:#1e3a5f;color:#fff;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;text-decoration:none;">
          Submit another event →
        </a>`,
    }),
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
    subject: `New submission: ${eventTitle}`,
    html: transactionalEmail({
      siteUrl,
      body: `
        <p style="margin:0 0 16px;font-size:15px;color:#374151;font-weight:600;">A new event was submitted to Bergen Beat.</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 12px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:6px 6px 0 0;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Event</td>
            <td style="padding:10px 12px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:6px 6px 0 0;font-size:14px;color:#111827;">${eventTitle}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #f3f4f6;border-top:none;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Organizer</td>
            <td style="padding:10px 12px;border:1px solid #f3f4f6;border-top:none;font-size:14px;color:#111827;">${organizerName}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;background:#f9fafb;border:1px solid #f3f4f6;border-top:none;border-radius:0 0 6px 6px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Email</td>
            <td style="padding:10px 12px;background:#f9fafb;border:1px solid #f3f4f6;border-top:none;border-radius:0 0 6px 6px;font-size:14px;color:#111827;">
              <a href="mailto:${organizerEmail}" style="color:#e05a2b;">${organizerEmail}</a>
            </td>
          </tr>
        </table>
        <a href="${siteUrl}/admin/submissions"
          style="display:inline-block;background:#1e3a5f;color:#fff;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;text-decoration:none;">
          Review in admin →
        </a>`,
    }),
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

// ─── Shared footer ─────────────────────────────────────────────────────────────

function digestFooter(siteUrl: string, token: string): string {
  const prefsUrl = `${siteUrl}/preferences?token=${encodeURIComponent(token)}`;
  const unsubUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
  return `
    <tr>
      <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          You're receiving this because you signed up at bergenbeat.net.<br>
          <a href="${prefsUrl}" style="color:#6366f1;">Manage preferences</a>
          &nbsp;·&nbsp;
          <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a>
        </p>
      </td>
    </tr>`;
}

export async function sendWeeklyNewsletter({
  subscribers,
  events,
  weekLabel,
}: {
  subscribers: { email: string; token: string }[];
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

        <!-- CTA / Footer replaced per-subscriber below -->
        __FOOTER__

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Send one email per subscriber (personalised footer with their token)
  let sent = 0;
  for (const sub of subscribers) {
    try {
      const personalHtml = html.replace("__FOOTER__", digestFooter(siteUrl, sub.token));
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: sub.email,
        subject: `🎵 Bergen Beat: What's happening ${weekLabel}`,
        html: personalHtml,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send newsletter to ${sub.email}:`, err);
    }
  }

  return { sent, skipped: false };
}

// ─── Weekend digest ────────────────────────────────────────────────────────────

export async function sendWeekendDigest({
  subscribers,
  events,
  weekendLabel, // e.g. "May 9–11"
}: {
  subscribers: { email: string; token: string }[];
  events: DigestEvent[];
  weekendLabel: string;
}) {
  if (!subscribers.length || !events.length) return { sent: 0, skipped: true };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const resend = getResend();

  const eventsHtml = events.map((e) => eventCard(e, siteUrl)).join("");

  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header — orange accent for weekend -->
        <tr>
          <td style="background:#e05a2b;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.02em;">
              🎵 Bergen Beat
            </h1>
            <p style="margin:6px 0 0;color:#fde3d8;font-size:14px;">
              This weekend in Bergen County — ${weekendLabel}
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
              See all weekend events →
            </a>
          </td>
        </tr>

        __FOOTER__

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  let sent = 0;
  for (const sub of subscribers) {
    try {
      const html = htmlTemplate.replace("__FOOTER__", digestFooter(siteUrl, sub.token));
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: sub.email,
        subject: `🎵 This weekend in Bergen County — ${weekendLabel}`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send weekend digest to ${sub.email}:`, err);
    }
  }

  return { sent, skipped: false };
}

// ─── Wednesday "This week" digest ─────────────────────────────────────────────

export async function sendWednesdayDigest({
  subscribers,
  events,
  weekLabel,
}: {
  subscribers: { email: string; token: string }[];
  events: DigestEvent[];
  weekLabel: string; // e.g. "May 13–19"
}) {
  if (!subscribers.length || !events.length) return { sent: 0, skipped: true };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const resend = getResend();

  const eventsHtml = events.map((e) => eventCard(e, siteUrl)).join("");

  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header — navy for mid-week -->
        <tr>
          <td style="background:#1e3a5f;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.02em;">
              🎵 Bergen Beat
            </h1>
            <p style="margin:6px 0 0;color:#a8c4e0;font-size:14px;">
              What's happening this week — ${weekLabel}
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
              See all upcoming events →
            </a>
          </td>
        </tr>

        __FOOTER__

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  let sent = 0;
  for (const sub of subscribers) {
    try {
      const html = htmlTemplate.replace("__FOOTER__", digestFooter(siteUrl, sub.token));
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: sub.email,
        subject: `🎵 This week in Bergen County — ${weekLabel}`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send Wednesday digest to ${sub.email}:`, err);
    }
  }

  return { sent, skipped: false };
}

// ─── Event alert (new event published matching subscriber preferences) ────────

export async function sendEventAlert({
  to,
  token,
  event,
}: {
  to: string;
  token: string;
  event: DigestEvent & { slug: string };
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
  const resend = getResend();

  const url = `${siteUrl}/events/${event.slug}`;
  const date = formatDigestDate(event.start_date);
  const price = event.is_free ? "Free" : (event.price_range ?? "Paid");
  const venue = event.venue?.name ?? "";
  const city  = event.venue?.city ? `, ${event.venue.city}` : "";
  const categoryLabel = event.category
    ? `${event.category.icon ?? ""} ${event.category.name}`
    : "";

  const prefsUrl = `${siteUrl}/preferences?token=${encodeURIComponent(token)}`;
  const unsubUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;

  const subject = categoryLabel
    ? `New ${event.category!.name} event: ${event.title}`
    : `New event in Bergen County: ${event.title}`;

  const html = transactionalEmail({
    siteUrl,
    body: `
      <p style="margin:0 0 4px;font-size:12px;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
        ${categoryLabel || "New event"}
      </p>
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
        <a href="${url}" style="color:#111827;text-decoration:none;">${event.title}</a>
      </h2>
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">
        📅 ${date}${venue ? ` &nbsp;·&nbsp; 📍 ${venue}${city}` : ""}
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;">${price}</p>
      ${event.short_description
        ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${event.short_description}</p>`
        : ""}
      ${event.banner_url
        ? `<a href="${url}"><img src="${event.banner_url}" alt="${event.title}"
             style="width:100%;max-height:240px;object-fit:cover;border-radius:8px;display:block;margin-bottom:16px;" /></a>`
        : ""}
      <a href="${url}"
        style="display:inline-block;background:#e05a2b;color:#fff;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;text-decoration:none;">
        View event →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
        You received this because you subscribed to event alerts on Bergen Beat.
        <a href="${prefsUrl}" style="color:#6366f1;">Manage preferences</a>
        &nbsp;·&nbsp;
        <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a>
      </p>`,
  });

  await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
}
