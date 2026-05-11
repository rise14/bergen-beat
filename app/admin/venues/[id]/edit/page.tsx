import { notFound } from "next/navigation";
import { getVenueByIdAdmin } from "@/lib/venues";
import { getAllNeighborhoodsAdmin } from "@/lib/neighborhoods";
import { updateVenue } from "@/app/admin/actions";
import { VenueEditForm } from "@/components/admin/VenueEditForm";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
  searchParams: { saved?: string };
}

export default async function AdminVenueEditPage({ params, searchParams }: Props) {
  const [venue, neighborhoods] = await Promise.all([
    getVenueByIdAdmin(params.id),
    getAllNeighborhoodsAdmin(),
  ]);

  if (!venue) notFound();

  const saved = searchParams.saved === "1";

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateVenue(params.id, formData);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <a
          href="/admin/venues"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Venues
        </a>
        <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
      </div>

      {saved && (
        <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          ✓ Venue saved successfully.
        </div>
      )}

      <VenueEditForm venue={venue} neighborhoods={neighborhoods} action={handleUpdate} />

      {/* Merge section */}
      {venue.totalEvents === 0 && (
        <div className="mt-10 rounded-xl border border-red-100 bg-red-50 p-5">
          <h2 className="mb-1 text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="mb-3 text-xs text-red-600">
            This venue has no events. It can be deleted from the venues list.
          </p>
          <a
            href="/admin/venues"
            className="text-xs font-medium text-red-600 hover:underline"
          >
            ← Back to venues list to delete
          </a>
        </div>
      )}
    </div>
  );
}
