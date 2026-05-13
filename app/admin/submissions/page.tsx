import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { SubmissionCard } from "@/components/admin/SubmissionCard";
import type { SubmissionRow } from "@/components/admin/SubmissionCard";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: { approved?: string; rejected?: string; edited?: string; resentedit?: string };
}) {
  const supabase = createAdminSupabaseClient();

  const [{ data: submissions }, { data: categories }, editTokenCheck] = await Promise.all([
    supabase
      .from("event_submissions")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, icon")
      .order("name"),
    // Probe for the edit_token column — error means migration hasn't been run yet
    supabase
      .from("event_submissions")
      .select("edit_token")
      .limit(1),
  ]);

  const editTokenMissing = !!editTokenCheck.error;

  const cats = (categories ?? []) as { id: string; name: string; icon: string | null }[];
  const pending  = (submissions ?? []).filter((s) => s.status === "pending");
  const reviewed = (submissions ?? []).filter((s) => s.status !== "pending");

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

      {/* Migration reminder — shown if add_edit_token_to_submissions.sql hasn't been run */}
      {editTokenMissing && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">⚠️ Migration required</p>
          <p className="mt-1 text-sm text-amber-700">
            The <code className="rounded bg-amber-100 px-1 font-mono text-xs">edit_token</code> column
            is missing from <code className="rounded bg-amber-100 px-1 font-mono text-xs">event_submissions</code>.
            Run <strong>supabase/migrations/add_edit_token_to_submissions.sql</strong> in your Supabase
            SQL editor to enable organizer edit links.
          </p>
          <a
            href="https://supabase.com/dashboard/project/_/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-amber-800 underline hover:no-underline"
          >
            Open Supabase SQL editor →
          </a>
        </div>
      )}

      {searchParams.approved && (
        <div className="mb-6 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          ✓ Submission approved and published.
        </div>
      )}
      {searchParams.rejected && (
        <div className="mb-6 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-600">
          Submission rejected and organizer notified.
        </div>
      )}
      {searchParams.edited && (
        <div className="mb-6 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
          ✓ Submission updated.
        </div>
      )}
      {searchParams.resentedit && (
        <div className="mb-6 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          ✉️ Edit link re-sent to organizer.
        </div>
      )}

      {pending.length > 0 ? (
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Needs review
          </h2>
          <div className="space-y-4">
            {pending.map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={sub as SubmissionRow}
                categories={cats}
                highlightId={searchParams.edited}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="mb-12 rounded-xl border border-gray-100 py-10 text-center text-gray-400">
          No submissions pending review. 🎉
        </div>
      )}

      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Recently reviewed
          </h2>
          <div className="space-y-3">
            {(reviewed as SubmissionRow[]).slice(0, 20).map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={sub}
                categories={cats}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
