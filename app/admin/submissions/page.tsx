import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/dates";
import { approveSubmission, rejectSubmission } from "@/app/admin/actions";

interface Submission {
  id: string;
  title: string;
  organizer_name: string;
  organizer_email: string;
  start_date: string;
  venue_name: string;
  status: string;
  admin_notes: string | null;
  external_url: string | null;
  is_free: boolean;
  price_range: string | null;
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: { approved?: string; rejected?: string };
}) {
  const supabase = createServerSupabaseClient();

  const { data: submissions } = await supabase
    .from("event_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  const pending  = submissions?.filter((s) => s.status === "pending") ?? [];
  const reviewed = submissions?.filter((s) => s.status !== "pending") ?? [];

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Submissions
        {pending.length > 0 && (
          <span className="ml-3 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700">
            {pending.length} pending
          </span>
        )}
      </h1>

      {/* Action feedback */}
      {searchParams.approved && (
        <div className="mb-6 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          Submission approved and published. ✓
        </div>
      )}
      {searchParams.rejected && (
        <div className="mb-6 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-600">
          Submission rejected and organizer notified.
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 ? (
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Needs review
          </h2>
          <div className="space-y-4">
            {pending.map((sub) => (
              <SubmissionCard key={sub.id} submission={sub} />
            ))}
          </div>
        </section>
      ) : (
        <div className="mb-12 rounded-xl border border-gray-100 py-10 text-center text-gray-400">
          No submissions pending review. 🎉
        </div>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Recently reviewed
          </h2>
          <div className="space-y-3">
            {reviewed.slice(0, 20).map((sub) => (
              <SubmissionCard key={sub.id} submission={sub} compact />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ─── Submission card ──────────────────────────────────────────────────────────

function SubmissionCard({
  submission: s,
  compact = false,
}: {
  submission: Submission;
  compact?: boolean;
}) {
  const statusColor =
    s.status === "approved"
      ? "bg-green-100 text-green-700"
      : s.status === "rejected"
      ? "bg-red-100 text-red-600"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">{s.title}</p>
          <p className="mt-0.5 text-sm text-gray-500">
            {formatEventDate(s.start_date)} · {s.venue_name} ·{" "}
            {s.is_free ? "Free" : s.price_range ?? "Paid"}
          </p>
          <p className="mt-0.5 text-sm text-gray-400">
            {s.organizer_name} · {s.organizer_email}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
          {s.status}
        </span>
      </div>

      {/* Approve / Reject forms — only shown for pending submissions */}
      {!compact && s.status === "pending" && (
        <div className="mt-4 space-y-3">
          {s.external_url && (
            <a
              href={s.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-brand-600 hover:underline"
            >
              View original event page →
            </a>
          )}

          <div className="flex flex-wrap gap-3">
            {/* Approve */}
            <form action={approveSubmission}>
              <input type="hidden" name="submission_id" value={s.id} />
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Approve & Publish
              </button>
            </form>

            {/* Reject */}
            <form action={rejectSubmission} className="flex items-center gap-2">
              <input type="hidden" name="submission_id" value={s.id} />
              <input
                type="text"
                name="admin_note"
                placeholder="Reason (optional)"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-brand-400"
              />
              <button
                type="submit"
                className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Reject
              </button>
            </form>
          </div>
        </div>
      )}

      {s.admin_notes && (
        <p className="mt-3 text-sm italic text-gray-400">Note: {s.admin_notes}</p>
      )}
    </div>
  );
}
