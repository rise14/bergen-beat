"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function updateEventByToken(token: string, formData: FormData) {
  if (!token) throw new Error("Missing edit token");

  const supabase = createAdminSupabaseClient();

  // Look up the submission by token
  const { data: subFull, error: subFullErr } = await supabase
    .from("event_submissions")
    .select("id")
    .eq("edit_token", token)
    .single();

  if (subFullErr || !subFull) throw new Error("Invalid or expired edit link");

  // Find the published event linked to this submission
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, slug, status")
    .eq("submission_id", subFull.id)
    .single();

  if (eventErr || !event) throw new Error("Event not found");
  if (event.status === "archived") throw new Error("This event has been archived and can no longer be edited.");

  const startRaw = formData.get("start_date") as string;
  const endRaw   = formData.get("end_date")   as string;

  const updates: Record<string, unknown> = {
    title:             (formData.get("title") as string).trim(),
    short_description: (formData.get("short_description") as string) || null,
    description:       (formData.get("description") as string) || null,
    start_date:        startRaw ? new Date(startRaw).toISOString() : undefined,
    end_date:          endRaw   ? new Date(endRaw).toISOString()   : null,
    is_free:           formData.get("is_free") === "on",
    price_range:       (formData.get("price_range") as string) || null,
    external_url:      (formData.get("external_url") as string) || null,
    banner_url:        (formData.get("banner_url") as string) || null,
    organizer_name:    (formData.get("organizer_name") as string) || null,
    organizer_email:   (formData.get("organizer_email") as string) || null,
    updated_at:        new Date().toISOString(),
  };

  const { error: updateErr } = await supabase
    .from("events")
    .update(updates)
    .eq("id", event.id);

  if (updateErr) throw new Error(`Failed to update event: ${updateErr.message}`);

  // Also keep submission in sync for the key public fields
  await supabase
    .from("event_submissions")
    .update({
      title:         updates.title as string,
      description:   updates.description as string | null,
      start_date:    updates.start_date as string,
      end_date:      updates.end_date as string | null,
      is_free:       updates.is_free as boolean,
      price_range:   updates.price_range as string | null,
      external_url:  updates.external_url as string | null,
      banner_url:    updates.banner_url as string | null,
      organizer_name:  updates.organizer_name as string | null,
      organizer_email: updates.organizer_email as string | null,
    })
    .eq("id", subFull.id);

  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/events");

  redirect(`/edit-event/${token}?saved=1`);
}
