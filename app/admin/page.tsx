import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = createAdminSupabaseClient();

  // Quick counts for the dashboard overview
  const [
    { count: totalEvents },
    { count: pendingSubmissions },
    { count: publishedEvents },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase
      .from("event_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
  ]);

  const stats = [
    { label: "Total events", value: totalEvents ?? 0 },
    { label: "Published", value: publishedEvents ?? 0 },
    { label: "Pending review", value: pendingSubmissions ?? 0, urgent: (pendingSubmissions ?? 0) > 0 },
  ];

  return (
    <>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-6 ${
              stat.urgent
                ? "border-amber-200 bg-amber-50"
                : "border-gray-100 bg-white"
            }`}
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stat.value}</p>
            {stat.urgent && (
              <a
                href="/admin/submissions"
                className="mt-2 inline-block text-xs font-medium text-amber-700 hover:underline"
              >
                Review now →
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <a
          href="/admin/events/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Create event
        </a>
        <a
          href="/admin/submissions"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Review submissions
        </a>
      </div>
    </>
  );
}
