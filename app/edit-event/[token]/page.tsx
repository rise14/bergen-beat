import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { OrganizerEditForm } from "@/components/OrganizerEditForm";
import { updateEventByToken } from "./actions";

interface Props {
  params: { token: string };
  searchParams: { saved?: string };
}

export default async function EditEventPage({ params, searchParams }: Props) {
  const { token } = params;

  const supabase = createAdminSupabaseClient();

  // Look up the submission by token
  const { data: sub } = await supabase
    .from("event_submissions")
    .select("id, title, organizer_name, organizer_email")
    .eq("edit_token", token)
    .single();

  if (!sub) notFound();

  // Find the live event via submission_id
  const { data: event } = await supabase
    .from("events")
    .select(`
      id, title, slug, short_description, description,
      start_date, end_date, is_free, price_range,
      external_url, banner_url, organizer_name, organizer_email,
      status
    `)
    .eq("submission_id", sub.id)
    .single();

  if (!event) notFound();

  const action = updateEventByToken.bind(null, token);

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <header className="border-b border-cream-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <a href="/" className="text-xl font-bold font-serif text-navy-800">
            🎵 Bergen Beat
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {/* Saved banner */}
        {searchParams.saved === "1" && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            ✅ Your event has been updated successfully.{" "}
            <a
              href={`/events/${event.slug}`}
              className="font-semibold underline hover:no-underline"
            >
              View it live →
            </a>
          </div>
        )}

        {event.status === "archived" && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            ⚠️ This event has been archived and can no longer be edited.
          </div>
        )}

        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold text-navy-800">
            Edit your event
          </h1>
          <p className="mt-1 text-sm text-walnut/70">
            Update the details for <strong>{event.title}</strong>.
            Changes go live immediately.
          </p>
        </div>

        {event.status !== "archived" && (
          <OrganizerEditForm event={event} action={action} />
        )}

        <div className="mt-8 text-center">
          <a
            href={`/events/${event.slug}`}
            className="text-sm text-walnut/60 hover:text-walnut hover:underline"
          >
            ← Back to event page
          </a>
        </div>
      </main>
    </div>
  );
}
