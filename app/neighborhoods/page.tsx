import type { Metadata } from "next";
import { getNeighborhoods } from "@/lib/neighborhoods";

export const metadata: Metadata = {
  title: "Browse by Neighborhood",
  description: "Find events near you in Bergen County, NJ — Hackensack, Ridgewood, Paramus, Fort Lee, and more.",
};

export const revalidate = 3600;

export default async function NeighborhoodsPage() {
  const neighborhoods = await getNeighborhoods();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse by Neighborhood</h1>
        <p className="mt-2 text-gray-500">
          Find events happening near you across Bergen County.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {neighborhoods.map((nb) => (
          <a
            key={nb.id}
            href={`/neighborhoods/${nb.slug}`}
            className="group flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
          >
            <span className="text-sm font-semibold text-gray-800 group-hover:text-brand-600">
              {nb.name}
            </span>
            {nb.city && (
              <span className="text-xs text-gray-400">{nb.city}, NJ</span>
            )}
          </a>
        ))}
      </div>
    </>
  );
}
