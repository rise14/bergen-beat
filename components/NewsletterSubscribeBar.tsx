"use client";

import { useState } from "react";

interface Props {
  /** "inline" = horizontal bar (events list); "card" = stacked card (sidebar) */
  variant?: "inline" | "card";
}

export function NewsletterSubscribeBar({ variant = "inline" }: Props) {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMsg(data.error ?? "Something went wrong.");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
      setMsg("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className={`rounded-2xl border border-green-200 bg-green-50 text-center ${
        variant === "card" ? "p-5" : "px-6 py-4"
      }`}>
        <p className="text-sm font-semibold text-green-800">✅ Check your inbox!</p>
        <p className="mt-0.5 text-xs text-green-700">Confirm your email to start receiving events.</p>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="rounded-2xl border border-cream-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-walnut/60 mb-1">
          Stay in the loop
        </p>
        <p className="text-sm font-semibold text-navy-800">
          Get Bergen County events in your inbox
        </p>
        <p className="mt-1 text-xs text-walnut/60">
          Weekly digest every Wednesday. No spam.
        </p>
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm text-navy-800 placeholder-walnut/40 focus:border-navy-800 focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-xl bg-navy-800 py-2 text-sm font-semibold text-white hover:bg-navy-700 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Subscribing…" : "Subscribe free →"}
          </button>
        </form>
        {status === "error" && (
          <p className="mt-2 text-xs text-red-600">{msg}</p>
        )}
      </div>
    );
  }

  // inline variant
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-navy-800">
            🎵 Get Bergen County events in your inbox
          </p>
          <p className="mt-0.5 text-xs text-walnut/60">
            Weekly digest every Wednesday + weekend preview on Fridays. Free.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex shrink-0 gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-52 rounded-xl border border-cream-200 px-3 py-2 text-sm text-navy-800 placeholder-walnut/40 focus:border-navy-800 focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-xl bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {status === "loading" ? "…" : "Subscribe →"}
          </button>
        </form>
      </div>
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">{msg}</p>
      )}
    </div>
  );
}
