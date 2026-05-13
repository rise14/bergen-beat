"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface EventOption {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  is_sponsored: boolean;
}

export default function SponsorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const prefilledSlug = searchParams.get("event") ?? "";
  const cancelled     = searchParams.get("cancelled") === "1";

  const [query, setQuery]           = useState(prefilledSlug);
  const [results, setResults]       = useState<EventOption[]>([]);
  const [searching, setSearching]   = useState(false);
  const [selected, setSelected]     = useState<EventOption | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // If a slug was pre-filled via ?event=, look it up immediately
  useEffect(() => {
    if (!prefilledSlug) return;
    fetch(`/api/sponsor/search?q=${encodeURIComponent(prefilledSlug)}&bySlug=1`)
      .then((r) => r.json())
      .then((data: EventOption[]) => {
        if (data.length === 1) setSelected(data[0]);
        else setResults(data);
      })
      .catch(() => {});
  }, [prefilledSlug]);

  async function handleSearch(q: string) {
    setQuery(q);
    setSelected(null);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/sponsor/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setSearching(false);
    }
  }

  async function handleCheckout() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: selected.slug }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      router.push(data.url);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

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

      {/* Event search */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-navy-800">
          1. Find your event
        </h2>

        {selected ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <div>
              <p className="font-medium text-navy-800">{selected.title}</p>
              <p className="text-xs text-walnut">
                {new Date(selected.start_date).toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                })}
              </p>
              {selected.is_sponsored && (
                <p className="mt-1 text-xs font-semibold text-accent-orange">
                  ★ Already sponsored
                </p>
              )}
            </div>
            <button
              onClick={() => { setSelected(null); setQuery(""); setResults([]); }}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for your event by title…"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-navy-700 focus:outline-none"
            />
            {searching && (
              <div className="absolute right-3 top-3">
                <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md">
                {results.map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={() => { setSelected(e); setResults([]); }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-cream-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-navy-800 line-clamp-1">{e.title}</p>
                        <p className="text-xs text-walnut">
                          {new Date(e.start_date).toLocaleDateString("en-US", {
                            month: "short", day: "numeric",
                          })}
                        </p>
                      </div>
                      {e.is_sponsored && (
                        <span className="shrink-0 text-xs font-semibold text-accent-orange">★ Sponsored</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.length >= 2 && !searching && results.length === 0 && (
              <p className="mt-2 text-xs text-gray-400">
                No published events match &ldquo;{query}&rdquo;.{" "}
                <a href="/submit" className="text-accent-orange hover:underline">Submit your event →</a>
              </p>
            )}
          </div>
        )}

        {/* Checkout */}
        <div className="mt-6 border-t border-gray-100 pt-6">
          <h2 className="mb-4 text-base font-semibold text-navy-800">
            2. Complete payment
          </h2>

          <div className="mb-4 flex items-center justify-between rounded-lg bg-cream-50 px-4 py-3 text-sm">
            <span className="text-walnut">7-day sponsored listing</span>
            <span className="font-bold text-navy-800">$25.00</span>
          </div>

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleCheckout}
            disabled={!selected || selected.is_sponsored || loading}
            className="w-full rounded-xl bg-accent-orange px-6 py-3.5 text-sm font-bold text-white hover:bg-walnut disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Redirecting to checkout…" : selected?.is_sponsored ? "Already sponsored" : "Pay $25 — Sponsor this event →"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            Secure payment via Stripe · No subscription · One-time charge
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-8 space-y-4 text-sm text-walnut">
        <div>
          <p className="font-semibold text-navy-800">When does my event get sponsored?</p>
          <p className="mt-1">Immediately after payment confirms — the badge and carousel placement go live within seconds.</p>
        </div>
        <div>
          <p className="font-semibold text-navy-800">What if my event isn't listed yet?</p>
          <p className="mt-1">
            <a href="/submit" className="text-accent-orange hover:underline">Submit it free</a> first.
            Once it's approved and published (usually same day), come back here to sponsor it.
          </p>
        </div>
        <div>
          <p className="font-semibold text-navy-800">Is this a recurring charge?</p>
          <p className="mt-1">No — it's a one-time $25 payment for 7 days of sponsored placement.</p>
        </div>
      </div>
    </div>
  );
}
