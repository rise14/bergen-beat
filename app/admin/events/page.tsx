import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/dates";

// Explicit type for the query result avoids Supabase join inference issues
type EventRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_date: string;
  featured: boolean;
  category: { name: string } | null;
};

export default async function AdminEventsPage() {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("events")
    .select("id, title, slug, status, start_date, featured, category:categories(name)")
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

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{event.title}</td>
                <td className="px-4 py-3 text-gray-500">
                  {event.category?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {formatEventDate(event.start_date)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      event.status === "published"
                        ? "bg-green-100 text-green-700"
                        : event.status === "draft"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {event.featured ? "⭐" : "—"}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/admin/events/${event.id}/edit`}
                    className="text-brand-600 hover:underline"
                  >
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            No events yet.{" "}
            <a href="/admin/events/new" className="text-brand-600 hover:underline">
              Create one →
            </a>
          </div>
        )}
      </div>
    </>
  );
}
