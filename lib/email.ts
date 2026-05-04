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
