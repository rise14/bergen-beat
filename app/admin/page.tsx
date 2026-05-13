import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import type { DailyCount, CategoryCount, StatusCounts } from "@/components/admin/DashboardCharts";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = createAdminSupabaseClient();

  const now = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const endOfWeek     = new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalEvents },
    { count: publishedEvents },
    { count: upcomingEvents },
    { count: draftEvents },
    { count: archivedEvents },
    { count: pendingSubmissions },
    { count: subscribers },
    { count: newSubscribers },
    { count: recentImports },
    { data: recentlyAdded },
    { data: upcomingList },
    { data: recentEvents },      // for daily chart
    { data: categoryRows },      // for category chart
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published").gte("start_date", now),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "archived"),
    supabase.from("event_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("confirmed", true),
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("confirmed", true).gte("subscribed_at", sevenDaysAgo),
    supabase.from("import_log").select("*", { count: "exact", head: true }).eq("status", "imported").gte("imported_at", sevenDaysAgo),
    supabase.from("events").select("id, title, slug, status, source, start_date, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("events").select("id, title, slug, start_date, venue:venues(name, city)").eq("status", "published").gte("start_date", now).lte("start_date", endOfWeek).order("start_date", { ascending: true }).limit(5),
    // Fetch created_at for events added in last 30 days
    supabase.from("events").select("created_at").gte("created_at", thirtyDaysAgo),
    // Fetch category name for all non-archived events
    supabase.from("events").select("category:categories(name)").in("status", ["published", "draft"]),
  ]);

  // ── Build daily counts (last 30 days) ──────────────────────────────────────
  const dayMap: Record<string, number> = {};
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of recentEvents ?? []) {
    const day = (row.created_at as string).slice(0, 10);
    if (day in dayMap) dayMap[day]++;
  }
  const daily: DailyCount[] = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  // ── Build category counts ──────────────────────────────────────────────────
  const catMap: Record<string, number> = {};
  for (const row of categoryRows ?? []) {
    const name = (row.category as unknown as { name: string } | null)?.name ?? "Uncategorised";
    catMap[name] = (catMap[name] ?? 0) + 1;
  }
  const categories: CategoryCount[] = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const statuses: StatusCounts = {
    published: publishedEvents ?? 0,
    draft:     draftEvents     ?? 0,
    archived:  archivedEvents  ?? 0,
  };

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const SOURCE_LABELS: Record<string, string> = {
    admin: "Admin / manual", ticketmaster: "Ticketmaster",
    predicthq: "PredictHQ", submission: "Public submission",
  };

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      published: "bg-green-100 text-green-700",
      draft:     "bg-yellow-100 text-yellow-700",
      archived:  "bg-gray-100 text-gray-500",
    };
    return map[status] ?? "bg-gray-100 text-gray-500";
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function fmtDT(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  const topStats = [
    { label: "Upcoming events",     value: upcomingEvents      ?? 0, href: "/admin/events?status=published", color: "text-accent-orange", sub: null },
    { label: "Drafts to review",    value: draftEvents         ?? 0, href: "/admin/events?status=draft",    color: (draftEvents ?? 0) > 0 ? "text-amber-600" : "text-gray-900", urgent: (draftEvents ?? 0) > 0, sub: null },
    { label: "Pending submissions", value: pendingSubmissions  ?? 0, href: "/admin/submissions",             color: (pendingSubmissions ?? 0) > 0 ? "text-amber-600" : "text-gray-900", urgent: (pendingSubmissions ?? 0) > 0, sub: null },
    { label: "Subscribers",         value: subscribers         ?? 0, href: null, color: "text-gray-900", sub: (newSubscribers ?? 0) > 0 ? `+${newSubscribers} this week` : null },
    { label: "Imported (7 days)",   value: recentImports       ?? 0, href: null, color: "text-gray-900", sub: null },
    { label: "Total events",        value: totalEvents         ?? 0, href: "/admin/events", color: "text-gray-900", sub: null },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <a href="/admin/events/new"
            className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900">
            + Create event
          </a>
          <a href="/admin/submissions"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Review submissions
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {topStats.map((stat) => (
          <div key={stat.label}
            className={`rounded-xl border p-5 ${stat.urgent ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white"}`}>
            <p className="text-xs text-gray-500">{stat.label}</p>
            {stat.href ? (
              <a href={stat.href} className={`mt-1 block text-3xl font-bold hover:underline ${stat.color}`}>
                {stat.value}
              </a>
            ) : (
              <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            )}
            {stat.sub && (
              <p className="mt-1 text-xs font-medium text-green-600">{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <DashboardCharts daily={daily} categories={categories} statuses={statuses} />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">

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
                      <p className="text-sm font-medium text-gray-800 group-hover:text-accent-orange line-clamp-1">{e.title}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {fmtDT(e.start_date as string)}{venue ? ` · ${venue.name}` : ""}
                      </p>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          <a href="/events" target="_blank" rel="noopener noreferrer"
            className="mt-4 inline-block text-xs font-medium text-accent-orange hover:underline">
            View public events page →
          </a>
        </div>

        {/* Recently added */}
        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Recently added</h2>
            <a href="/admin/events" className="text-xs font-medium text-accent-orange hover:underline">Manage all →</a>
          </div>
          {!recentlyAdded || recentlyAdded.length === 0 ? (
            <p className="text-sm text-gray-400">No events yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentlyAdded.map((e) => (
                <li key={e.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <a href={`/admin/events/${e.id}/edit`}
                      className="block truncate text-sm font-medium text-gray-800 hover:text-accent-orange">
                      {e.title}
                    </a>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {SOURCE_LABELS[e.source as string] ?? e.source} · {fmt(e.created_at as string)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(e.status as string)}`}>
                    {e.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
