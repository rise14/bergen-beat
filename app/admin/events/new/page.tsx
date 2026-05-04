import { getCategories } from "@/lib/categories";
import { getNeighborhoods } from "@/lib/neighborhoods";
import { EventForm } from "@/components/admin/EventForm";
import { createEvent } from "@/app/admin/actions";

export default async function NewEventPage() {
  const [categories, neighborhoods] = await Promise.all([
    getCategories(),
    getNeighborhoods(),
  ]);

  return (
    <>
      <div className="mb-6">
        <a href="/admin/events" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to events
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Create Event</h1>
      </div>

      <EventForm
        categories={categories}
        neighborhoods={neighborhoods}
        action={createEvent}
      />
    </>
  );
}
