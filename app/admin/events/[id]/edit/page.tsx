import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/categories";
import { getNeighborhoods } from "@/lib/neighborhoods";
import { EventForm } from "@/components/admin/EventForm";
import { updateEvent } from "@/app/admin/actions";

interface Props {
  params: { id: string };
  searchParams: { saved?: string; created?: string };
}

export default async function EditEventPage({ params, searchParams }: Props) {
  const supabase = createAdminSupabaseClient();

  const [{ data: event }, categories, neighborhoods] = await Promise.all([
    supabase
      .from("events")
      .select("*, venue:venues(name, address, city)")
      .eq("id", params.id)
      .single(),
    getCategories(),
    getNeighborhoods(),
  ]);

  if (!event) notFound();

  // Flatten venue fields so EventForm can pre-fill them
  const initialValues = {
    ...event,
    venue_name:    event.venue?.name ?? "",
    venue_address: event.venue?.address ?? "",
    venue_city:    event.venue?.city ?? "",
  };

  // Bind the event id into the update action
  const updateThisEvent = updateEvent.bind(null, params.id);

  return (
    <>
      <div className="mb-6">
        <a href="/admin/events" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to events
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Event</h1>
        <p className="mt-1 text-sm text-gray-400">{event.title}</p>
      </div>

      <div className="mb-4">
        <a
          href={`/events/${event.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-600 hover:underline"
        >
          View public page →
        </a>
      </div>

      <EventForm
        categories={categories}
        neighborhoods={neighborhoods}
        initialValues={initialValues}
        action={updateThisEvent}
        saved={searchParams.saved === "1"}
        created={searchParams.created === "1"}
      />
    </>
  );
}
