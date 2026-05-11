import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { EventGrid } from "@/components/EventGrid";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import type { Event } from "@/types";

export const revalidate = 86400; // archive pages rarely change

interface Props {
  params: { id: string };
}

interface ArchiveRow {
  id: string;
  type: "weekly" | "weekend";
  week_label: string;
  sent_at: string;
  sent_count: number;
  event_ids: string[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("newsletter_archive")
    .select("type, week_label")
    .eq("id", params.id)
    .single();

  if (!data) return {};
  const label = data.type === "weekend" ? "Weekend digest" : "Weekly digest";
  return {
    title: `${label}: ${data.week_label}`,
    description: `Bergen Beat ${label.toLowerCase()} for ${data.week_label} — events in Bergen County, NJ.`,
  };
}

export default async function NewsletterEditionPage({ params }: Props) {
  const supabase = createAdminSupabaseClient();

  const { data: edition } = await supabase
    .from("newsletter_archive")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!edition) notFound();

  const ed = edition as ArchiveRow;

  // Fetch the events that were in this edition
  let events: Event[] = [];
  if (ed.event_ids.length > 0) {
    const { data: eventRows } = await supabase
      .from("events")
      .select(`
        id, title, slug, start_date, end_date, is_free, price_range,
        banner_url, short_description, status,
        venue:venues(id, name, slug, address, city, state, lat, lng),
        category:categories(id, name, slug, icon, color, sort_order),
        neighborhood:neighborhoods(id, name, slug, city, description, hero_url)
      `)
      .in("id", ed.event_ids)
      .order("start_date", { ascending: true });

    events = (eventRows ?? []) as unknown as Event[];
  }

  const sentDate = new Date(ed.sent_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

  const typeLabel = ed.type === "weekend" ? "Weekend Digest" : "Weekly Digest";
  const typeEmoji = ed.type === "weekend" ? "🏖" : "🎵";

  return (
    <div>
      <a href="/newsletter" className="text-sm text-gray-400 hover:text-gray-600">
        ← Newsletter archive
      </a>

      <div className="mt-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-walnut">
          <span>{typeEmoji}</span>
          <span className="uppercase tracking-wider font-semibold">{typeLabel}</span>
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-navy-800">
          {ed.week_label}
        </h1>
        <p className="mt-2 text-sm text-walnut">
          Sent {sentDate} to {ed.sent_count.toLocaleString()} subscriber{ed.sent_count !== 1 ? "s" : ""}
        </p>
      </div>

      {events.length > 0 ? (
        <>
          <p className="mb-6 text-walnut">
            Here are the {events.length} event{events.length !== 1 ? "s" : ""} featured in this edition.
          </p>
          <EventGrid events={events} />
        </>
      ) : (
        <p className="text-gray-400">
          The events from this edition are no longer in our database.
        </p>
      )}

      {/* Subscribe CTA */}
      <div className="mt-16 rounded-2xl bg-navy-800 px-6 py-7 max-w-xl">
        <p className="mb-4 font-serif text-lg font-semibold text-white">
          Get the next edition in your inbox
        </p>
        <NewsletterSignup />
      </div>
    </div>
  );
}
