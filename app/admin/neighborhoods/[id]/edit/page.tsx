import { notFound } from "next/navigation";
import { getNeighborhoodByIdAdmin } from "@/lib/neighborhoods";
import { updateNeighborhood } from "@/app/admin/actions";
import { NeighborhoodEditForm } from "@/components/admin/NeighborhoodEditForm";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
  searchParams: { saved?: string };
}

export default async function AdminNeighborhoodEditPage({ params, searchParams }: Props) {
  const nb = await getNeighborhoodByIdAdmin(params.id);
  if (!nb) notFound();

  const saved = searchParams.saved === "1";

  async function handleUpdate(formData: FormData) {
    "use server";
    formData.set("slug", nb!.slug);
    await updateNeighborhood(params.id, formData);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <a href="/admin/neighborhoods" className="text-sm text-gray-500 hover:text-gray-700">
          ← Neighborhoods
        </a>
        <h1 className="text-2xl font-bold text-gray-900">{nb.name}</h1>
      </div>

      {saved && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Neighborhood saved successfully.
        </div>
      )}

      {/* Read-only info */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 space-y-0.5">
        <p><span className="font-medium text-gray-700">Slug:</span> {nb.slug}</p>
        {nb.city && <p><span className="font-medium text-gray-700">City:</span> {nb.city}</p>}
        <p className="text-xs text-gray-400">Name and slug are managed in the database directly.</p>
      </div>

      <NeighborhoodEditForm nb={nb} action={handleUpdate} />
    </div>
  );
}
