import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { AdminEventsTable } from "@/components/AdminEventsTable";
import { ArchivePastButton } from "@/components/ArchivePastButton";

// Explicit type for the query result avoids Supabase join inference issues
export type EventRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  source: string;
  start_date: string;
  end_date: string | null;
  featured: boolean;
  category: { name: string } | null;
};

export default async function AdminEventsPage() {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("events")
    .select("id, title, slug, status, source, start_date, end_date, featured, category:categories(name)")
    .order("start_date", { ascending: false });

  const events = (data ?? []) as unknown as EventRow[];

  // Count how many published events are eligible for archiving (ended 7+ days ago)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const pastCount = events.filter(
    (e) =>
      e.status === "published" &&
      (e.end_date ? e.end_date < cutoff : e.start_date < cutoff)
  ).length;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-400">{events.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          {pastCount > 0 && <ArchivePastButton count={pastCount} />}
          <a
            href="/admin/events/new"
            className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900"
          >
            ＋ New Event
          </a>
        </div>
      </div>

      <AdminEventsTable events={events} />
    </>
  );
}
