import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { NewsletterSignup } from "@/components/NewsletterSignup";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Newsletter Archive",
  description:
    "Browse past Bergen Beat weekly digests — concerts, markets, festivals, and local events in Bergen County, NJ.",
};

interface ArchiveRow {
  id: string;
  type: "weekly" | "weekend";
  week_label: string;
  sent_at: string;
  sent_count: number;
  event_ids: string[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

export default async function NewsletterArchivePage() {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("newsletter_archive")
    .select("id, type, week_label, sent_at, sent_count, event_ids")
    .order("sent_at", { ascending: false })
    .limit(52); // last ~year of editions

  const editions = (data ?? []) as ArchiveRow[];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
        Newsletter Archive
      </h1>
      <p className="mt-4 text-walnut">
        Every week we send Bergen County&apos;s best upcoming events straight to your inbox —
        concerts, markets, festivals, food, and more.
      </p>

      {/* Subscribe CTA */}
      <div className="mt-8 rounded-2xl bg-navy-800 px-6 py-7">
        <p className="mb-4 font-serif text-lg font-semibold text-white">
          Get the next edition in your inbox
        </p>
        <NewsletterSignup />
      </div>

      {/* Archive list */}
      <div className="mt-12">
        {editions.length === 0 ? (
          <p className="text-center text-gray-400">No editions yet — check back after the first newsletter sends.</p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {editions.map((ed) => (
              <li key={ed.id}>
                <a
                  href={`/newsletter/${ed.id}`}
                  className="flex items-center justify-between gap-4 py-4 hover:text-accent-orange transition-colors group"
                >
                  <div>
                    <p className="font-medium text-navy-800 group-hover:text-accent-orange transition-colors">
                      {ed.type === "weekend" ? "🏖 This Weekend — " : "🎵 Weekly Digest — "}
                      {ed.week_label}
                    </p>
                    <p className="mt-0.5 text-sm text-walnut">
                      {formatDate(ed.sent_at)} &nbsp;·&nbsp;{" "}
                      {ed.event_ids.length} event{ed.event_ids.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-gray-300 group-hover:text-accent-orange transition-colors">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
