import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Subscription Confirmed",
  robots: { index: false },
};

type Status = "success" | "invalid" | "expired" | "error";

interface Props {
  searchParams: { status?: string };
}

const STATES: Record<Status, { emoji: string; heading: string; body: string }> = {
  success: {
    emoji: "🎉",
    heading: "You're subscribed!",
    body: "You'll get the Bergen Beat weekly events digest every week. See you in your inbox.",
  },
  invalid: {
    emoji: "🤔",
    heading: "That link didn't work",
    body: "The confirmation link is invalid or has already been used. Try subscribing again below.",
  },
  expired: {
    emoji: "⏰",
    heading: "Link expired",
    body: "Confirmation links are valid for 48 hours. Try subscribing again and we'll send a fresh one.",
  },
  error: {
    emoji: "😕",
    heading: "Something went wrong",
    body: "We couldn't confirm your subscription right now. Please try again in a moment.",
  },
};

export default function ConfirmSubscriptionPage({ searchParams }: Props) {
  const status = (searchParams.status ?? "invalid") as Status;
  const state = STATES[status] ?? STATES.invalid;
  const isSuccess = status === "success";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-5xl">{state.emoji}</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{state.heading}</h1>
      <p className="mt-2 max-w-sm text-gray-500">{state.body}</p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/events"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Browse events
        </Link>
        {!isSuccess && (
          <Link
            href="/#subscribe"
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Try again
          </Link>
        )}
      </div>
    </div>
  );
}
