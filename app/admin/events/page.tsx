import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/dates";
import { AdminEventsTable } from "@/components/AdminEventsTable";

// Explicit type for the query result avoids Supabase join inference issues
export type EventRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  source: string;
  start_date: string;
  featured: boolean;
  category: { name: string } | null;
};

export default async function AdminEventsPage() {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("events")
    .select("id, title, slug, status, source, start_date, featured, category:categories(name)")
    .order("start_date", { ascending: true });

  const events = (data ?? []) as unknown as EventRow[];

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <a
          href="/admin/events/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          ＋ New Event
        </a>
      </div>

      <AdminEventsTable events={events} />
    </>
  );
}
