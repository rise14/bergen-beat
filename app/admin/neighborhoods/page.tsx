import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface NeighborhoodRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  description: string | null;
  hero_url: string | null;
  upcomingCount: number;
}

export default async function AdminNeighborhoodsPage() {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const [{ data: nbData }, { data: evData }] = await Promise.all([
    supabase
      .from("neighborhoods")
      .select("id, name, slug, city, description, hero_url")
      .order("name", { ascending: true }),
    supabase
      .from("events")
      .select("neighborhood_id")
      .eq("status", "published")
      .gte("start_date", now)
      .not("neighborhood_id", "is", null),
  ]);

  const countMap: Record<string, number> = {};
  for (const ev of evData ?? []) {
    const nid = ev.neighborhood_id as string;
    countMap[nid] = (countMap[nid] ?? 0) + 1;
  }

  const neighborhoods: NeighborhoodRow[] = ((nbData ?? []) as unknown as NeighborhoodRow[]).map((nb) => ({
    ...nb,
    upcomingCount: countMap[nb.id] ?? 0,
  }));

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neighborhoods</h1>
          <p className="mt-1 text-sm text-gray-400">{neighborhoods.length} total</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Hero</th>
              <th className="px-4 py-3">Upcoming</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {neighborhoods.map((nb) => (
              <tr key={nb.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{nb.name}</td>
                <td className="px-4 py-3 text-gray-500">{nb.city ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 max-w-xs">
                  {nb.description ? (
                    <span className="line-clamp-1">{nb.description}</span>
                  ) : (
                    <span className="italic text-gray-300">None</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {nb.hero_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={nb.hero_url} alt="" className="h-8 w-14 rounded object-cover" />
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{nb.upcomingCount}</td>
                <td className="px-4 py-3">
                  <a
                    href={`/admin/neighborhoods/${nb.id}/edit`}
                    className="text-accent-orange hover:underline"
                  >
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
