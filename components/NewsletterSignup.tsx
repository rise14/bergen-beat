"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Something went wrong. Try again.");
      } else {
        setStatus("success");
        setEmail("");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-50 px-8 py-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-orange mb-3">
        Weekly digest
      </p>
      <h2 className="font-serif text-2xl font-semibold text-navy-800">
        Never miss a local event
      </h2>
      <p className="mt-2 text-sm text-walnut">
        The best events in Bergen County, delivered every Monday morning.
      </p>

      {status === "success" ? (
        <p className="mt-6 font-medium text-navy-800">
          Check your inbox to confirm your subscription!
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full rounded-lg border border-cream-200 bg-white px-4 py-2 text-sm focus:border-walnut focus:outline-none sm:w-72"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-lg bg-navy-800 px-6 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-60 transition-colors"
          >
            {status === "loading" ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-3 text-sm text-red-500">{errorMsg}</p>
      )}

      <p className="mt-4 text-xs text-gray-400">No spam, unsubscribe anytime.</p>
    </div>
  );
}
