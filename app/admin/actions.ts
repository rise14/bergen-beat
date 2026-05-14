"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendSubmissionApproved, sendSubmissionRejected, sendEventAlert } from "@/lib/email";
import { fireEventWebhook } from "@/lib/webhook";

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
      banner_url:          formData.get("banner_url") as string || null,
      featured:            formData.get("featured") === "on",
      featured_until:      formData.get("featured_until") as string || null,
      is_sponsored:        formData.get("is_sponsored") === "on",
      is_outside_bergen:   formData.get("is_outside_bergen") === "on",
      source:              "admin",
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
      banner_url:          formData.get("banner_url") as string || null,
      featured:            formData.get("featured") === "on",
      featured_until:      formData.get("featured_until") as string || null,
      is_sponsored:        formData.get("is_sponsored") === "on",
      is_outside_bergen:   formData.get("is_outside_bergen") === "on",
      published_at:        status === "published" ? new Date().toISOString() : null,
      updated_at:          new Date().toISOString(),
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
  const { data: updatedSub } = await supabase
    .from("event_submissions")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", submissionId)
    .select("edit_token")
    .single();

  // Email the organizer (include edit link if we got the token)
  await sendSubmissionApproved({
    to:            sub.organizer_email,
    organizerName: sub.organizer_name,
    eventTitle:    sub.title,
    eventSlug:     slug,
    editToken:     updatedSub?.edit_token ?? null,
  });

  // Fetch the newly created event + its category/venue for alerts & webhook
  const { data: newEvent } = await supabase
    .from("events")
    .select(`
      id, title, slug, start_date, end_date, is_free, price_range,
      short_description, banner_url, organizer_name,
      category:categories(id, name, slug, icon),
      venue:venues(name, city)
    `)
    .eq("slug", slug)
    .single();

  if (newEvent) {
    const cat  = newEvent.category as unknown as { id: string; name: string; slug: string; icon: string | null } | null;
    const ven  = newEvent.venue    as unknown as { name: string; city: string | null } | null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

    // ── Social webhook ──────────────────────────────────────────────────────
    await fireEventWebhook({
      event_title:       newEvent.title,
      event_url:         `${siteUrl}/events/${newEvent.slug}`,
      event_slug:        newEvent.slug,
      start_date:        newEvent.start_date,
      end_date:          newEvent.end_date,
      is_free:           newEvent.is_free,
      price_range:       newEvent.price_range,
      short_description: newEvent.short_description,
      banner_url:        newEvent.banner_url,
      venue_name:        ven?.name ?? null,
      venue_city:        ven?.city ?? null,
      category_name:     cat?.name ?? null,
      category_icon:     cat?.icon ?? null,
      organizer_name:    newEvent.organizer_name,
    });

    // ── Event alerts ─────────────────────────────────────────────────────────
    // Find confirmed subscribers who have this category or neighborhood in prefs
    const { data: alertSubs } = await supabase
      .from("newsletter_subscribers")
      .select("email, token, preferences")
      .eq("confirmed", true)
      .is("unsubscribed_at", null);

    if (alertSubs?.length && cat) {
      const eligibleAlerts = alertSubs.filter((s) => {
        const prefs = (s.preferences as { categories?: string[] } | null) ?? {};
        return prefs.categories?.includes(cat.slug);
      });

      for (const sub of eligibleAlerts) {
        await sendEventAlert({
          to:    sub.email,
          token: sub.token,
          event: {
            title:             newEvent.title,
            slug:              newEvent.slug,
            start_date:        newEvent.start_date,
            is_free:           newEvent.is_free,
            price_range:       newEvent.price_range,
            banner_url:        newEvent.banner_url,
            short_description: newEvent.short_description,
            venue:             ven,
            category:          cat,
          },
        }).catch((err) =>
          console.error(`[approveSubmission] Alert to ${sub.email} failed:`, err)
        );
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin/submissions");

  redirect("/admin/submissions?approved=1");
}

// ─── Bulk approve submissions ─────────────────────────────────────────────────
// Approves multiple pending submissions at once.
// Sends approval emails but skips event alerts + webhooks (to avoid flooding).

export async function bulkApproveSubmissions(ids: string[]): Promise<{ approved: number }> {
  if (!ids.length) return { approved: 0 };

  const supabase = createAdminSupabaseClient();
  let approved = 0;

  for (const submissionId of ids) {
    try {
      const { data: sub } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("id", submissionId)
        .eq("status", "pending")   // only process pending ones
        .single();

      if (!sub) continue;

      const slug = buildSlug(sub.title, sub.start_date);

      let venueId: string | null = null;
      if (sub.venue_name) {
        venueId = await resolveVenueId(supabase, sub.venue_name, sub.venue_address ?? "", "", null);
      }

      const { error: insertError } = await supabase.from("events").insert({
        title:          sub.title,
        slug,
        description:    sub.description,
        status:         "published",
        is_free:        sub.is_free,
        price_range:    sub.price_range,
        external_url:   sub.external_url,
        category_id:    sub.category_id,
        venue_id:       venueId,
        start_date:     sub.start_date,
        end_date:       sub.end_date,
        organizer_name: sub.organizer_name,
        organizer_email:sub.organizer_email,
        banner_url:     sub.banner_url,
        source:         "submission",
        submission_id:  sub.id,
        published_at:   new Date().toISOString(),
      });

      if (insertError) {
        console.error(`[bulkApprove] Failed to insert event for submission ${submissionId}:`, insertError.message);
        continue;
      }

      const { data: updatedSub } = await supabase
        .from("event_submissions")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", submissionId)
        .select("edit_token")
        .single();

      await sendSubmissionApproved({
        to:            sub.organizer_email,
        organizerName: sub.organizer_name,
        eventTitle:    sub.title,
        eventSlug:     slug,
        editToken:     updatedSub?.edit_token ?? null,
      }).catch((err) =>
        console.error(`[bulkApprove] Email to ${sub.organizer_email} failed:`, err)
      );

      approved++;
    } catch (err) {
      console.error(`[bulkApprove] Error processing submission ${submissionId}:`, err);
    }
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin/submissions");

  return { approved };
}

// ─── Reject submission ────────────────────────────────────────────────────────

// ─── Update submission (inline edit) ──────────────────────────────────────────

export async function updateSubmission(formData: FormData) {
  const supabase = createAdminSupabaseClient();

  const id = formData.get("submission_id") as string;
  if (!id) throw new Error("Missing submission_id");

  const startRaw = formData.get("start_date") as string;
  const endRaw   = formData.get("end_date")   as string;

  const { error } = await supabase
    .from("event_submissions")
    .update({
      title:         (formData.get("title")         as string).trim(),
      description:   (formData.get("description")   as string) || null,
      venue_name:    (formData.get("venue_name")     as string).trim(),
      venue_address: (formData.get("venue_address")  as string) || null,
      start_date:    startRaw ? new Date(startRaw).toISOString() : undefined,
      end_date:      endRaw   ? new Date(endRaw).toISOString()   : null,
      is_free:       formData.get("is_free") === "true",
      price_range:   (formData.get("price_range")    as string) || null,
      external_url:  (formData.get("external_url")   as string) || null,
      banner_url:    (formData.get("banner_url")     as string) || null,
      category_id:   (formData.get("category_id")   as string) || null,
      admin_notes:   (formData.get("admin_notes")    as string) || null,
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update submission: ${error.message}`);

  revalidatePath("/admin/submissions");
  redirect(`/admin/submissions?edited=${id}`);
}

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

// ─── Re-send organizer edit link ──────────────────────────────────────────────

export async function resendEditLink(formData: FormData): Promise<void> {
  const submissionId = formData.get("submission_id") as string;
  if (!submissionId) throw new Error("Missing submission_id");

  const supabase = createAdminSupabaseClient();

  // Fetch submission + edit_token
  const { data: sub } = await supabase
    .from("event_submissions")
    .select("id, edit_token, organizer_email, organizer_name, title")
    .eq("id", submissionId)
    .single();

  if (!sub) throw new Error("Submission not found");
  if (!sub.edit_token) throw new Error("No edit token found for this submission");

  // Find the linked published event's slug
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("submission_id", sub.id)
    .single();

  if (!event) throw new Error("No published event linked to this submission");

  await sendSubmissionApproved({
    to:            sub.organizer_email,
    organizerName: sub.organizer_name,
    eventTitle:    sub.title,
    eventSlug:     event.slug,
    editToken:     sub.edit_token,
  });

  revalidatePath("/admin/submissions");
  redirect("/admin/submissions?resentedit=1");
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

// ─── Update venue ─────────────────────────────────────────────────────────────

export async function updateVenue(id: string, formData: FormData) {
  const supabase = createAdminSupabaseClient();

  const name  = (formData.get("name") as string).trim();
  const slug  = (formData.get("slug") as string).trim();
  if (!name) throw new Error("Venue name is required.");
  if (!slug) throw new Error("Slug is required.");

  const neighborhoodId = (formData.get("neighborhood_id") as string) || null;
  const lat = formData.get("lat") ? parseFloat(formData.get("lat") as string) : null;
  const lng = formData.get("lng") ? parseFloat(formData.get("lng") as string) : null;

  const { error } = await supabase
    .from("venues")
    .update({
      name,
      slug,
      address:         (formData.get("address") as string)  || null,
      city:            (formData.get("city")    as string)  || null,
      state:           (formData.get("state")   as string)  || "NJ",
      zip:             (formData.get("zip")     as string)  || null,
      lat:             isNaN(lat as number) ? null : lat,
      lng:             isNaN(lng as number) ? null : lng,
      website:         (formData.get("website")     as string) || null,
      description:     (formData.get("description") as string) || null,
      hero_url:        (formData.get("hero_url")    as string) || null,
      neighborhood_id: neighborhoodId,
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update venue: ${error.message}`);

  revalidatePath("/admin/venues");
  revalidatePath(`/venues/${slug}`);
  revalidatePath("/venues");

  redirect(`/admin/venues/${id}/edit?saved=1`);
}

// ─── Delete venue ─────────────────────────────────────────────────────────────

export async function deleteVenue(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminSupabaseClient();

  // Check for attached events before deleting
  const { count } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("venue_id", id)
    .neq("status", "archived");

  if ((count ?? 0) > 0) {
    return { ok: false, error: `Cannot delete: ${count} active event${count !== 1 ? "s" : ""} are linked to this venue.` };
  }

  const { error } = await supabase.from("venues").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/venues");
  revalidatePath("/venues");

  return { ok: true };
}

// ─── Merge venues ─────────────────────────────────────────────────────────────
// Reassigns all events from `fromId` to `toId`, then deletes `fromId`.

export async function mergeVenues(fromId: string, toId: string): Promise<{ count: number }> {
  if (fromId === toId) throw new Error("Cannot merge a venue into itself.");

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("events")
    .update({ venue_id: toId })
    .eq("venue_id", fromId)
    .select("id");

  if (error) throw new Error(`Failed to reassign events: ${error.message}`);

  // Delete the now-empty source venue (ignore error if it still has archived events)
  await supabase.from("venues").delete().eq("id", fromId);

  revalidatePath("/admin/venues");
  revalidatePath("/venues");
  revalidatePath("/");

  return { count: data?.length ?? 0 };
}

// ─── Update neighborhood ──────────────────────────────────────────────────────

export async function updateNeighborhood(id: string, formData: FormData) {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("neighborhoods")
    .update({
      description: (formData.get("description") as string) || null,
      hero_url:    (formData.get("hero_url")    as string) || null,
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update neighborhood: ${error.message}`);

  const slug = (formData.get("slug") as string) || id;
  revalidatePath("/admin/neighborhoods");
  revalidatePath(`/neighborhoods/${slug}`);
  revalidatePath("/neighborhoods");

  redirect(`/admin/neighborhoods/${id}/edit?saved=1`);
}

// ─── Duplicate event ──────────────────────────────────────────────────────────

export async function duplicateEvent(id: string): Promise<{ ok: boolean; newId?: string; error?: string }> {
  const supabase = createAdminSupabaseClient();

  const { data: source, error: fetchErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !source) {
    return { ok: false, error: "Event not found." };
  }

  // Build a unique slug for the copy
  const baseSlug = `${source.slug}-copy`;
  let newSlug = baseSlug;
  let attempt = 1;
  while (true) {
    const { data: conflict } = await supabase
      .from("events")
      .select("id")
      .eq("slug", newSlug)
      .maybeSingle();
    if (!conflict) break;
    attempt++;
    newSlug = `${baseSlug}-${attempt}`;
  }

  // Strip fields that shouldn't be copied
  const { id: _id, created_at: _ca, updated_at: _ua, published_at: _pa,
          external_id: _eid, submission_id: _sid, ...rest } = source;

  const { data: newEvent, error: insertErr } = await supabase
    .from("events")
    .insert({
      ...rest,
      slug:       newSlug,
      title:      `${source.title} (copy)`,
      status:     "draft",
      source:     "admin",
      featured:   false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !newEvent) {
    return { ok: false, error: insertErr?.message ?? "Insert failed." };
  }

  revalidatePath("/admin/events");
  return { ok: true, newId: newEvent.id };
}

// ─── iCal source management ───────────────────────────────────────────────────

export async function addIcalSource(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminSupabaseClient();
  const name           = (formData.get("name")           as string)?.trim();
  const url            = (formData.get("url")            as string)?.trim();
  const category_guess = (formData.get("category_guess") as string)?.trim() || null;
  const source_type    = (formData.get("source_type")    as string)?.trim() === "rss" ? "rss" : "ical";

  if (!name) return { ok: false, error: "Name is required." };
  if (!url)  return { ok: false, error: "URL is required." };

  const { error } = await supabase
    .from("ical_sources")
    .insert({ name, url, category_guess, source_type });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/import");
  return { ok: true };
}

export async function toggleIcalSource(id: string, enabled: boolean): Promise<void> {
  const supabase = createAdminSupabaseClient();
  await supabase.from("ical_sources").update({ enabled }).eq("id", id);
  revalidatePath("/admin/import");
}

export async function deleteIcalSource(id: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  await supabase.from("ical_sources").delete().eq("id", id);
  revalidatePath("/admin/import");
}
