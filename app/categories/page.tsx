import type { Metadata } from "next";
import { getCategories } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Browse by Category",
  description: "Find events in Bergen County, NJ by category — music, food, arts, sports, kids, and more.",
};

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse by Category</h1>
        <p className="mt-2 text-gray-500">
          Find what you love in Bergen County.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat) => (
          <a
            key={cat.id}
            href={`/categories/${cat.slug}`}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition hover:border-brand-200 hover:shadow-md"
            style={{ borderTopColor: cat.color ?? undefined }}
          >
            <span className="text-4xl">{cat.icon ?? "📅"}</span>
            <span className="text-sm font-semibold text-gray-800 group-hover:text-brand-600">
              {cat.name}
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
