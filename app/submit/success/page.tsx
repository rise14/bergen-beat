import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Event Submitted — Bergen Beat",
  description: "Thanks for submitting your event to Bergen Beat! We'll review it shortly.",
  robots: { index: false },
};

export default function SubmitSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      {/* Icon */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
        🎉
      </div>

      <h1 className="font-serif text-3xl font-semibold text-navy-800">
        Submission received!
      </h1>

      <p className="mt-4 text-base text-walnut leading-relaxed">
        Thanks for sharing your event with the Bergen County community.
        Our team reviews every submission — you&apos;ll hear back within{" "}
        <strong className="text-navy-800">2 business days</strong>.
      </p>

      {/* What happens next */}
      <div className="mt-8 rounded-2xl border border-cream-200 bg-white p-6 text-left space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-walnut/60">
          What happens next
        </h2>

        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
              1
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-800">We review your submission</p>
              <p className="mt-0.5 text-sm text-walnut/70">
                Our team checks the details and confirms the event is a good fit for Bergen County.
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
              2
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-800">You get an email</p>
              <p className="mt-0.5 text-sm text-walnut/70">
                We&apos;ll email you at the address you provided to confirm approval or
                let you know if anything needs to be adjusted.
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
              3
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-800">Your event goes live</p>
              <p className="mt-0.5 text-sm text-walnut/70">
                Once approved, your event is published on Bergen Beat and included in our
                weekly newsletter. Your approval email will include a private link to
                update the details at any time.
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/events"
          className="rounded-xl bg-navy-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors"
        >
          Browse upcoming events
        </Link>
        <Link
          href="/submit"
          className="rounded-xl border border-cream-200 bg-white px-6 py-2.5 text-sm font-semibold text-navy-800 hover:border-navy-800 transition-colors"
        >
          Submit another event
        </Link>
      </div>
    </div>
  );
}
