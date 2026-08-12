import { Suspense } from "react";
import { SponsorClient } from "@/components/SponsorClient";

interface Props {
  searchParams: { event?: string; cancelled?: string };
}

export default function SponsorPage({ searchParams }: Props) {
  // Read on the server so the shell (including the <h1>) is prerendered.
  // Previously this page was a client component calling useSearchParams()
  // without a Suspense boundary, which opted the whole route out of
  // prerendering — crawlers received markup with no heading at all.
  const prefilledSlug = searchParams.event ?? "";
  const cancelled     = searchParams.cancelled === "1";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-orange">
          Advertising
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-navy-800">
          Sponsor your event
        </h1>
        <p className="mt-2 text-walnut">
          Get your event in front of Bergen County locals for just{" "}
          <strong className="text-navy-800">$25 / week</strong>.
        </p>
      </div>

      {cancelled && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          Payment was cancelled — no charge was made. You can try again below.
        </div>
      )}

      {/* What you get */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: "🏠", title: "Homepage carousel", desc: "Featured in the rotating hero on the front page" },
          { icon: "📧", title: "Email digest", desc: "Priority sponsored slot in the weekly Bergen Beat newsletter" },
          { icon: "🏷️", title: "Sponsored badge", desc: "Orange Sponsored badge on every event card and listing" },
        ].map((benefit) => (
          <div key={benefit.title} className="rounded-xl border border-cream-200 bg-white p-4 text-center">
            <p className="text-2xl">{benefit.icon}</p>
            <p className="mt-2 text-sm font-semibold text-navy-800">{benefit.title}</p>
            <p className="mt-1 text-xs text-walnut">{benefit.desc}</p>
          </div>
        ))}
      </div>

      {/* Event search + checkout (interactive) */}
      <Suspense
        fallback={
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-400">Loading sponsorship options…</p>
          </div>
        }
      >
        <SponsorClient prefilledSlug={prefilledSlug} />
      </Suspense>

      {/* FAQ */}
      <div className="mt-8 space-y-4 text-sm text-walnut">
        <div>
          <p className="font-semibold text-navy-800">When does my event get sponsored?</p>
          <p className="mt-1">Immediately after payment confirms — the badge and carousel placement go live within seconds.</p>
        </div>
        <div>
          <p className="font-semibold text-navy-800">What if my event isn&apos;t listed yet?</p>
          <p className="mt-1">
            <a href="/submit" className="text-accent-orange hover:underline">Submit it free</a> first.
            Once it&apos;s approved and published (usually same day), come back here to sponsor it.
          </p>
        </div>
        <div>
          <p className="font-semibold text-navy-800">Is this a recurring charge?</p>
          <p className="mt-1">No — it&apos;s a one-time $25 payment for 7 days of sponsored placement.</p>
        </div>
      </div>
    </div>
  );
}
