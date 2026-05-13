import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sponsorship Confirmed | Bergen Beat" };

interface Props {
  searchParams: { slug?: string; session_id?: string };
}

export default async function SponsorSuccessPage({ searchParams }: Props) {
  const slug = searchParams.slug;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

  let eventTitle = "";
  let featuredUntil = "";

  if (slug) {
    const supabase = createAdminSupabaseClient();
    const { data } = await supabase
      .from("events")
      .select("title, featured_until")
      .eq("slug", slug)
      .single();

    if (data) {
      eventTitle = data.title as string;
      featuredUntil = data.featured_until
        ? new Date(data.featured_until as string).toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric",
          })
        : "";
    }
  }

  return (
    <div className="mx-auto max-w-lg text-center py-16">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="font-serif text-3xl font-bold text-navy-800">
        You&apos;re sponsored!
      </h1>
      {eventTitle && (
        <p className="mt-3 text-lg font-medium text-walnut">{eventTitle}</p>
      )}
      <p className="mt-4 text-walnut">
        Your event is now featured across Bergen Beat
        {featuredUntil ? ` through <strong>${featuredUntil}</strong>` : " for the next 7 days"}.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
        {[
          { icon: "🏠", label: "Homepage carousel", sub: "Live now" },
          { icon: "📧", label: "Weekly digest", sub: "Next send" },
          { icon: "🏷️", label: "Sponsored badge", sub: "On all cards" },
        ].map((b) => (
          <div key={b.label} className="rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="text-xl">{b.icon}</p>
            <p className="mt-1 font-semibold text-navy-800">{b.label}</p>
            <p className="text-xs text-green-700">{b.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        {slug && (
          <a
            href={`${siteUrl}/events/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-navy-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-900"
          >
            View your event →
          </a>
        )}
        <a
          href="/"
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Back to Bergen Beat
        </a>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        A confirmation email is on its way. Questions?{" "}
        <a href="mailto:hi@bergenbeat.net" className="text-accent-orange hover:underline">
          hi@bergenbeat.net
        </a>
      </p>
    </div>
  );
}
