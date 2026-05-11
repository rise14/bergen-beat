import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { SubmissionCard } from "@/components/admin/SubmissionCard";
import type { SubmissionRow } from "@/components/admin/SubmissionCard";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: { approved?: string; rejected?: string; edited?: string };
}) {
  const supabase = createAdminSupabaseClient();

  const [{ data: submissions }, { data: categories }] = await Promise.all([
    supabase
      .from("event_submissions")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, icon")
      .order("name"),
  ]);

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
