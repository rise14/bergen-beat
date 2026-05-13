import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/dates";

export const metadata: Metadata = { title: "My Events | Bergen Beat Organizer Portal" };
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export default async function OrganizerDashboardPage() {
  // Require a logged-in session
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/organizer/login");
  }

  const email = user.email!;
  const admin = createAdminSupabaseClient();

  // Fetch all submissions for this email
  const { data: submissions } = await admin
    .from("event_submissions")
    .select("id, title, start_date, status, slug, edit_token, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false });

  // Fetch any published events linked to this email as organizer
  const { data: ownedEvents } = await admin
    .from("events")
    .select("id, title, slug, start_date, status, is_sponsored, featured_until, is_free, price_range")
    .eq("organizer_email", email)
    .order("start_date", { ascending: false })
    .limit(50);

  const subs    = submissions ?? [];
  const events  = (ownedEvents ?? []) as {
    id: string; title: string; slug: string; start_date: string;
    status: string; is_sponsored: boolean; featured_until: string | null;
    is_free: boolean; price_range: string | null;
  }[];

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending:  "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-600",
      published:"bg-green-100 text-green-700",
      draft:    "bg-gray-100 text-gray-500",
      archived: "bg-gray-100 text-gray-400",
    };
    return map[status] ?? "bg-gray-100 text-gray-500";
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-orange">
            Organizer Portal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy-800">My Events</h1>
          <p className="mt-1 text-sm text-walnut">{email}</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/submit"
            className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900"
          >
            + Submit event
          </a>
          <form action="/api/organizer/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Published / live events */}
      {events.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
            Live events
          </h2>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <a
                    href={`${siteUrl}/events/${e.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-medium text-navy-800 hover:text-accent-orange"
                  >
                    {e.title}
                  </a>
                  <p className="mt-0.5 text-xs text-walnut">
                    {formatEventDate(e.start_date)}
                    {e.is_free ? " · Free" : e.price_range ? ` · ${e.price_range}` : ""}
                  </p>
                  {e.is_sponsored && (
                    <p className="mt-0.5 text-xs font-semibold text-accent-orange">
                      ★ Sponsored
                      {e.featured_until ? ` until ${new Date(e.featured_until).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(e.status)}`}>
                    {e.status}
                  </span>
                  {!e.is_sponsored && (
                    <a
                      href={`/sponsor?event=${e.slug}`}
                      className="rounded-full border border-accent-orange px-3 py-1 text-xs font-semibold text-accent-orange hover:bg-accent-orange hover:text-white transition-colors"
                    >
                      Sponsor $25
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Submissions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
          Submissions
        </h2>

        {subs.length === 0 ? (
          <div className="rounded-xl border border-gray-100 py-12 text-center text-gray-400">
            <p className="text-lg">No submissions yet.</p>
            <a
              href="/submit"
              className="mt-4 inline-block rounded-full bg-accent-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-walnut"
            >
              Submit your first event →
            </a>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-800">{s.title}</p>
                  <p className="mt-0.5 text-xs text-walnut">
                    {s.start_date ? formatEventDate(s.start_date) : "Date TBD"} ·{" "}
                    Submitted {new Date(s.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(s.status as string)}`}>
                    {s.status}
                  </span>
                  {s.edit_token && s.status === "pending" && (
                    <a
                      href={`/submit/edit/${s.edit_token}`}
                      className="text-xs font-medium text-accent-orange hover:underline"
                    >
                      Edit →
                    </a>
                  )}
                  {s.slug && s.status === "approved" && (
                    <a
                      href={`${siteUrl}/events/${s.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-accent-orange hover:underline"
                    >
                      View →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sponsor CTA */}
      <div className="mt-10 rounded-2xl border border-accent-orange/20 bg-orange-50 p-6">
        <p className="font-semibold text-navy-800">Want more visibility?</p>
        <p className="mt-1 text-sm text-walnut">
          Sponsor your event for $25/week — it gets a Sponsored badge on all event cards,
          priority placement in the weekly email digest, and a featured spot on the homepage carousel.
        </p>
        <a
          href="/sponsor"
          className="mt-4 inline-block rounded-full bg-accent-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-walnut transition-colors"
        >
          Sponsor an event →
        </a>
      </div>
    </div>
  );
}
