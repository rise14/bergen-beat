"use client";

import { useState } from "react";

export function SendTestDigest({ adminEmail }: { adminEmail: string }) {
  const [loading, setLoading] = useState<"weekly" | "weekend" | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function send(type: "weekly" | "weekend") {
    setLoading(type);
    setResult(null);
    try {
      const res = await fetch("/api/admin/send-test-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: `✓ ${type === "weekly" ? "Weekly" : "Weekend"} digest sent to ${adminEmail} (${data.eventCount} events)` });
      } else {
        setResult({ ok: false, message: data.error ?? "Something went wrong." });
      }
    } catch {
      setResult({ ok: false, message: "Network error — check your Resend API key." });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-gray-700">Send test digest</h2>
      <p className="mb-4 text-xs text-gray-400">
        Preview how the digest looks in your inbox. Sends to <span className="font-medium text-gray-600">{adminEmail}</span> only.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => send("weekly")}
          disabled={loading !== null}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading === "weekly" ? "Sending…" : "📬 Weekly digest"}
        </button>
        <button
          onClick={() => send("weekend")}
          disabled={loading !== null}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading === "weekend" ? "Sending…" : "🗓 This weekend"}
        </button>
      </div>

      {result && (
        <p className={`mt-3 text-sm ${result.ok ? "text-green-600" : "text-red-500"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
