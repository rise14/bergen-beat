import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/categories";
import { getNeighborhoods } from "@/lib/neighborhoods";
import { EventForm } from "@/components/admin/EventForm";
import { updateEvent, duplicateEvent } from "@/app/admin/actions";

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

  // Duplicate action — bound server action, redirects to new event on success
  async function handleDuplicate() {
    "use server";
    const result = await duplicateEvent(params.id);
    if (result.ok && result.newId) {
      redirect(`/admin/events/${result.newId}/edit?created=1`);
    }
  }

  return (
    <>
      <div className="mb-6">
        <a href="/admin/events" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to events
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Event</h1>
        <p className="mt-1 text-sm text-gray-400">{event.title}</p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        {event.status === "published" ? (
          <a
            href={`/events/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="10" cy="10" r="4" />
            </svg>
            View live event
          </a>
        ) : (
          <a
            href={`/events/${event.slug}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            Preview draft
          </a>
        )}
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize
          ${event.status === "published" ? "bg-green-100 text-green-700"
          : event.status === "draft" ? "bg-yellow-100 text-yellow-700"
          : event.status === "archived" ? "bg-gray-100 text-gray-500"
          : "bg-red-100 text-red-700"}`}>
          {event.status}
        </span>

        {/* Duplicate button */}
        <form action={handleDuplicate} className="ml-auto">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
        </form>
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
