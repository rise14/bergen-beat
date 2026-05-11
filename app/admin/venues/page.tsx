import { getAllVenuesAdmin } from "@/lib/venues";
import { deleteVenue } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminVenuesPage() {
  const venues = await getAllVenuesAdmin();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
        <span className="text-sm text-gray-500">{venues.length} total</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Neighborhood</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-center">Upcoming</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {venues.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{v.name}</p>
                    {v.website && (
                      <a
                        href={v.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        {v.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {[v.city, v.state].filter(Boolean).join(", ")}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {v.neighborhood?.name ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono text-gray-700">{v.totalEvents}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {v.upcomingEvents > 0 ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      {v.upcomingEvents}
                    </span>
                  ) : (
                    <span className="text-gray-300">0</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/venues/${v.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                    >
                      View ↗
                    </a>
                    <a
                      href={`/admin/venues/${v.id}/edit`}
                      className="rounded bg-navy-800 px-3 py-1 text-xs font-medium text-white hover:bg-navy-700"
                    >
                      Edit
                    </a>
                    <DeleteButton id={v.id} name={v.name} eventCount={v.totalEvents} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {venues.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <p className="text-lg">No venues yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Server-action delete button (client component would also work, but keeping it simple)
function DeleteButton({
  id,
  name,
  eventCount,
}: {
  id: string;
  name: string;
  eventCount: number;
}) {
  async function handleDelete() {
    "use server";
    await deleteVenue(id);
  }

  if (eventCount > 0) {
    return (
      <span
        title={`Can't delete — ${eventCount} event(s) attached`}
        className="cursor-not-allowed rounded px-3 py-1 text-xs text-gray-300"
      >
        Delete
      </span>
    );
  }

  return (
    <form action={handleDelete}>
      <button
        type="submit"
        className="rounded px-3 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
        onClick={(e) => {
          if (!confirm(`Delete "${name}"? This cannot be undone.`)) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
