"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendSubmissionApproved, sendSubmissionRejected } from "@/lib/email";

// ─── Slug helper ──────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildSlug(title: string, startDate: string): string {
  const date = new Date(startDate).toISOString().slice(0, 10); // YYYY-MM-DD
  return `${slugify(title)}-${date}`;
}

// ─── Venue helper ─────────────────────────────────────────────────────────────
// Looks up a venue by name+city, or creates one if it doesn't exist.

async function resolveVenueId(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  venueName: string,
  venueAddress: string,
  venueCity: string,
  neighborhoodId: string | null
): Promise<string | null> {
  if (!venueName.trim()) return null;

  // Try to find existing venue by name and city
  const { data: existing } = await supabase
    .from("venues")
    .select("id")
    .ilike("name", venueName.trim())
    .eq("city", venueCity.trim() || "")
    .maybeSingle();

  if (existing) return existing.id;

  // Create new venue with a slug derived from name + city
  const venueSlugBase = slugify(venueName.trim() + (venueCity.trim() ? `-${venueCity.trim()}` : ""));
  // Ensure uniqueness by appending a short random suffix if needed
  const { data: slugConflict } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", venueSlugBase)
    .maybeSingle();
  const venueSlug = slugConflict
    ? `${venueSlugBase}-${Math.random().toString(36).slice(2, 7)}`
    : venueSlugBase;

  const { data: created } = await supabase
    .from("venues")
    .insert({
      name: venueName.trim(),
      slug: venueSlug,
      address: venueAddress.trim() || null,
      city: venueCity.trim() || null,
      neighborhood_id: neighborhoodId || null,
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

// ─── Create event ─────────────────────────────────────────────────────────────

export async function createEvent(formData: FormData) {
  const supabase = createAdminSupabaseClient();

  const title      = formData.get("title") as string;
  const startDate  = formData.get("start_date") as string;
  const categoryId = formData.get("category_id") as string || null;
  const neighborhoodId = formData.get("neighborhood_id") as string || null;

  const venueId = await resolveVenueId(
    supabase,
    formData.get("venue_name") as string || "",
    formData.get("venue_address") as string || "",
    formData.get("venue_city") as string || "",
    neighborhoodId,
  );

  const slug = formData.get("slug") as string || buildSlug(title, startDate);
  const status = formData.get("status") as string || "draft";

  const { data, error } = await supabase
    .from("events")
    .insert({
      title,
      slug,
      short_description: formData.get("short_description") as string || null,
      description:       formData.get("description") as string || null,
      status,
      is_free:           formData.get("is_free") === "on",
      price_range:       formData.get("price_range") as string || null,
      external_url:      formData.get("external_url") as string || null,
      category_id:       categoryId || null,
      venue_id:          venueId,
      neighborhood_id:   neighborhoodId || null,
      start_date:        new Date(startDate).toISOString(),
      end_date:          formData.get("end_date")
                           ? new Date(formData.get("end_date") as string).toISOString()
                           : null,
      is_recurring:      formData.get("is_recurring") === "on",
      recurrence_note:   formData.get("recurrence_note") as string || null,
      organizer_name:    formData.get("organizer_name") as string || null,
      organizer_email:   formData.get("organizer_email") as string || null,
      banner_url:        formData.get("banner_url") as string || null,
      featured:          formData.get("featured") === "on",
      source:            "admin",
      published_at:      status === "published" ? new Date().toISOString() : null,
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(`Failed to create event: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin/events");

  redirect(`/admin/events/${data.id}/edit?created=1`);
}

// ─── Update event ─────────────────────────────────────────────────────────────

export async function updateEvent(id: string, formData: FormData) {
  const supabase = createAdminSupabaseClient();

  const startDate      = formData.get("start_date") as string;
  const neighborhoodId = formData.get("neighborhood_id") as string || null;
  const status         = formData.get("status") as string || "draft";

  const venueId = await resolveVenueId(
    supabase,
    formData.get("venue_name") as string || "",
    formData.get("venue_address") as string || "",
    formData.get("venue_city") as string || "",
    neighborhoodId,
  );

  const { error } = await supabase
    .from("events")
    .update({
      title:             formData.get("title") as string,
      slug:              formData.get("slug") as string,
      short_description: formData.get("short_description") as string || null,
      description:       formData.get("description") as string || null,
      status,
      is_free:           formData.get("is_free") === "on",
      price_range:       formData.get("price_range") as string || null,
      external_url:      formData.get("external_url") as string || null,
      category_id:       formData.get("category_id") as string || null,
      venue_id:          venueId,
      neighborhood_id:   neighborhoodId || null,
      start_date:        new Date(startDate).toISOString(),
      end_date:          formData.get("end_date")
                           ? new Date(formData.get("end_date") as string).toISOString()
                           : null,
      is_recurring:      formData.get("is_recurring") === "on",
      recurrence_note:   formData.get("recurrence_note") as string || null,
      organizer_name:    formData.get("organizer_name") as string || null,
      organizer_email:   formData.get("organizer_email") as string || null,
      banner_url:        formData.get("banner_url") as string || null,
      featured:          formData.get("featured") === "on",
      published_at:      status === "published" ? new Date().toISOString() : null,
      updated_at:        new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update event: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${formData.get("slug")}`);
  revalidatePath("/admin/events");

  redirect(`/admin/events/${id}/edit?saved=1`);
}

// ─── Approve submission ───────────────────────────────────────────────────────

export async function approveSubmission(formData: FormData) {
  const supabase = createAdminSupabaseClient();

  const submissionId = formData.get("submission_id") as string;

  // Fetch the full submission
  const { data: sub, error: fetchError } = await supabase
    .from("event_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (fetchError || !sub) throw new Error("Submission not found");

  // Build slug from title + date
  const slug = buildSlug(sub.title, sub.start_date);

  // Create a venue record from the submission's raw text fields
  let venueId: string | null = null;
  if (sub.venue_name) {
    venueId = await resolveVenueId(
      supabase,
      sub.venue_name,
      sub.venue_address ?? "",
      "",
      null,
    );
  }

  // Create the event
  const { error: insertError } = await supabase.from("events").insert({
    title:             sub.title,
    slug,
    description:       sub.description,
    status:            "published",
    is_free:           sub.is_free,
    price_range:       sub.price_range,
    external_url:      sub.external_url,
    category_id:       sub.category_id,
    venue_id:          venueId,
    start_date:        sub.start_date,
    end_date:          sub.end_date,
    organizer_name:    sub.organizer_name,
    organizer_email:   sub.organizer_email,
    banner_url:        sub.banner_url,
    source:            "submission",
    submission_id:     sub.id,
    published_at:      new Date().toISOString(),
  });

  if (insertError) throw new Error(`Failed to create event: ${insertError.message}`);

  // Mark the submission as approved
  await supabase
    .from("event_submissions")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", submissionId);

  // Email the organizer
  await sendSubmissionApproved({
    to:            sub.organizer_email,
    organizerName: sub.organizer_name,
    eventTitle:    sub.title,
    eventSlug:     slug,
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin/submissions");

  redirect("/admin/submissions?approved=1");
}

// ─── Reject submission ────────────────────────────────────────────────────────

export async function rejectSubmission(formData: FormData) {
  const supabase = createAdminSupabaseClient();

  const submissionId = formData.get("submission_id") as string;
  const adminNote    = formData.get("admin_note") as string || null;

  const { data: sub } = await supabase
    .from("event_submissions")
    .select("organizer_email, organizer_name, title")
    .eq("id", submissionId)
    .single();

  await supabase
    .from("event_submissions")
    .update({
      status:      "rejected",
      admin_notes: adminNote,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (sub) {
    await sendSubmissionRejected({
      to:            sub.organizer_email,
      organizerName: sub.organizer_name,
      eventTitle:    sub.title,
      adminNote,
    });
  }

  revalidatePath("/admin/submissions");
  redirect("/admin/submissions?rejected=1");
}

// ─── Bulk publish ─────────────────────────────────────────────────────────────

export async function bulkPublishEvents(ids: string[]): Promise<{ count: number }> {
  if (!ids.length) return { count: 0 };

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .update({ status: "published", published_at: now })
    .in("id", ids)
    .eq("status", "draft")   // only promote drafts, never touch already-published
    .select("id");

  if (error) throw new Error(error.message);

  revalidatePath("/admin/events");
  revalidatePath("/");
  revalidatePath("/events");

  return { count: data?.length ?? 0 };
}

// ─── Delete subscriber ────────────────────────────────────────────────────────

export async function deleteSubscriber(id: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/subscribers");
}

// ─── Archive past events ──────────────────────────────────────────────────────

export async function archivePastEvents(): Promise<{ count: number }> {
  const supabase = createAdminSupabaseClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [{ data: d1, error: e1 }, { data: d2, error: e2 }] = await Promise.all([
    // Events with an end_date past the cutoff
    supabase
      .from("events")
      .update({ status: "archived", updated_at: now })
      .eq("status", "published")
      .lt("end_date", cutoff)
      .select("id"),
    // Events with no end_date whose start_date is past the cutoff
    supabase
      .from("events")
      .update({ status: "archived", updated_at: now })
      .eq("status", "published")
      .is("end_date", null)
      .lt("start_date", cutoff)
      .select("id"),
  ]);

  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const count = (d1?.length ?? 0) + (d2?.length ?? 0);

  revalidatePath("/admin/events");
  revalidatePath("/admin");

  return { count };
}

// ─── Bulk delete (drafts only) ────────────────────────────────────────────────

export async function bulkDeleteDraftEvents(ids: string[]): Promise<{ count: number }> {
  if (!ids.length) return { count: 0 };

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("events")
    .delete()
    .in("id", ids)
    .eq("status", "draft")   // safety: never bulk-delete published events
    .select("id");

  if (error) throw new Error(error.message);

  revalidatePath("/admin/events");

  return { count: data?.length ?? 0 };
}

// ─── Bulk archive (any status) ────────────────────────────────────────────────

export async function bulkArchiveEvents(ids: string[]): Promise<{ count: number }> {
  if (!ids.length) return { count: 0 };

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .update({ status: "archived", updated_at: now })
    .in("id", ids)
    .in("status", ["published", "draft"])
    .select("id");

  if (error) throw new Error(error.message);

  revalidatePath("/admin/events");
  revalidatePath("/");
  revalidatePath("/events");

  return { count: data?.length ?? 0 };
}

// ─── Bulk unpublish (published → draft) ──────────────────────────────────────

export async function bulkUnpublishEvents(ids: string[]): Promise<{ count: number }> {
  if (!ids.length) return { count: 0 };

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .update({ status: "draft", published_at: null, updated_at: now })
    .in("id", ids)
    .eq("status", "published")
    .select("id");

  if (error) throw new Error(error.message);

  revalidatePath("/admin/events");
  revalidatePath("/");
  revalidatePath("/events");

  return { count: data?.length ?? 0 };
}
