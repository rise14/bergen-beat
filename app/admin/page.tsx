import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const revalidate = 0; // always fresh in admin

export default async function AdminDashboardPage() {
  const supabase = createAdminSupabaseClient();

  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endOfWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalEvents },
    { count: publishedEvents },
    { count: upcomingEvents },
    { count: draftEvents },
    { count: pendingSubmissions },
    { count: subscribers },
    { count: recentImports },
    { data: sourceBreakdown },
    { data: recentlyAdded },
    { data: upcomingList },
  ] = await Promise.all([
    // Total events (all statuses)
    supabase.from("events").select("*", { count: "exact", head: true }),
    // Published
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published"),
    // Upcoming published
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published").gte("start_date", now),
    // Drafts
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "draft"),
    // Pending submissions
    supabase.from("event_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
    // Confirmed newsletter subscribers
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("confirmed", true),
    // Events imported in last 7 days
    supabase.from("import_log").select("*", { count: "exact", head: true }).eq("status", "imported").gte("imported_at", sevenDaysAgo),
    // Events by source
    supabase.from("events").select("source").in("status", ["published", "draft"]),
    // 5 most recently created events
    supabase.from("events").select("id, title, slug, status, source, start_date, created_at").order("created_at", { ascending: false }).limit(5),
    // Next 5 upcoming published events
    supabase.from("events").select("id, title, slug, start_date, venue:venues(name, city)").eq("status", "published").gte("start_date", now).lte("start_date", endOfWeek).order("start_date", { ascending: true }).limit(5),
  ]);

  // Tally events by source
  const sourceCounts: Record<string, number> = {};
  for (const row of sourceBreakdown ?? []) {
    const s = (row.source as string) ?? "admin";
    sourceCounts[s] = (sourceCounts[s] ?? 0) + 1;
  }

  const SOURCE_LABELS: Record<string, string> = {
    admin: "Admin / manual",
    ticketmaster: "Ticketmaster",
    predicthq: "PredictHQ",
    submission: "Public submission",
  };

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      published: "bg-green-100 text-green-700",
      draft: "bg-yellow-100 text-yellow-700",
      archived: "bg-gray-100 text-gray-500",
    };
    return map[status] ?? "bg-gray-100 text-gray-500";
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const topStats = [
    { label: "Upcoming events", value: upcomingEvents ?? 0, href: "/admin/events?status=published", color: "text-brand-600" },
    { label: "Drafts to review", value: draftEvents ?? 0, href: "/admin/events?status=draft", color: (draftEvents ?? 0) > 0 ? "text-amber-600" : "text-gray-900", urgent: (draftEvents ?? 0) > 0 },
    { label: "Pending submissions", value: pendingSubmissions ?? 0, href: "/admin/submissions", color: (pendingSubmissions ?? 0) > 0 ? "text-amber-600" : "text-gray-900", urgent: (pendingSubmissions ?? 0) > 0 },
    { label: "Subscribers", value: subscribers ?? 0, href: null, color: "text-gray-900" },
    { label: "Imported (7 days)", value: recentImports ?? 0, href: null, color: "text-gray-900" },
    { label: "Total events", value: totalEvents ?? 0, href: "/admin/events", color: "text-gray-900" },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <a
            href="/admin/events/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Create event
          </a>
          <a
            href="/admin/submissions"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Review submissions
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {topStats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-5 ${stat.urgent ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white"}`}
          >
            <p className="text-xs text-gray-500">{stat.label}</p>
            {stat.href ? (
              <a href={stat.href} className={`mt-1 block text-3xl font-bold hover:underline ${stat.color}`}>
                {stat.value}
              </a>
            ) : (
              <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">

        {/* Events by source */}
        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
            Events by source
          </h2>
          {Object.keys(sourceCounts).length === 0 ? (
            <p className="text-sm text-gray-400">No events yet.</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(sourceCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => {
                  const total = totalEvents ?? 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <li key={source}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-gray-700">{SOURCE_LABELS[source] ?? source}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        {/* This week's events */}
        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
            Coming up this week
          </h2>
          {!upcomingList || upcomingList.length === 0 ? (
            <p className="text-sm text-gray-400">No published events in the next 7 days.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {upcomingList.map((e) => {
                const venue = (e.venue as unknown) as { name: string; city: string } | null;
                return (
                  <li key={e.id} className="py-3 first:pt-0 last:pb-0">
                    <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer" className="group block">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-brand-600 line-clamp-1">
                        {e.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatDateTime(e.start_date as string)}
                        {venue ? ` · ${venue.name}` : ""}
                      </p>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          <a href="/events" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs font-medium text-brand-600 hover:underline">
            View public events page →
          </a>
        </div>

        {/* Recently added */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
              Recently added
            </h2>
            <a href="/admin/events" className="text-xs font-medium text-brand-600 hover:underline">
              Manage all →
            </a>
          </div>
          {!recentlyAdded || recentlyAdded.length === 0 ? (
            <p className="text-sm text-gray-400">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="pb-2 text-left font-medium">Title</th>
                    <th className="pb-2 text-left font-medium">Source</th>
                    <th className="pb-2 text-left font-medium">Status</th>
                    <th className="pb-2 text-left font-medium">Event date</th>
                    <th className="pb-2 text-left font-medium">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentlyAdded.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2.5 pr-4">
                        <a
                          href={`/admin/events/${e.id}/edit`}
                          className="font-medium text-gray-800 hover:text-brand-600 line-clamp-1"
                        >
                          {e.title}
                        </a>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500 capitalize">
                        {SOURCE_LABELS[e.source as string] ?? e.source}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(e.status as string)}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {formatDate(e.start_date as string)}
                      </td>
                      <td className="py-2.5 text-gray-400">
                        {formatDate(e.created_at as string)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
