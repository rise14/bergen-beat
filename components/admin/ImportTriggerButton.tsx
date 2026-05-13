"use client";

import { useState } from "react";

type ImportSummary = {
  ticketmaster?: { fetched?: number; imported?: number; skipped?: number; error?: string };
  predicthq?:   { fetched?: number; imported?: number; skipped?: number; error?: string };
  ical?:        { total_fetched?: number; imported?: number; skipped?: number; error?: string };
  started_at?:  string;
  finished_at?: string;
  error?:       string;
};

export function ImportTriggerButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/trigger-import", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Import failed");
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function sourceSummary(s?: { fetched?: number; imported?: number; skipped?: number; error?: string } | null) {
    if (!s) return null;
    if (s.error) return <span className="text-red-500">Error: {s.error}</span>;
    return (
      <span className="text-gray-600">
        {s.fetched ?? 0} fetched · {s.imported ?? 0} imported · {s.skipped ?? 0} skipped
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={handleRun}
        disabled={loading}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Importing…
          </>
        ) : (
          <>⬇ Run import</>
        )}
      </button>

      {error && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
      )}

      {result && !error && (
        <div className="mt-2 rounded-lg border border-gray-100 bg-white p-3 text-xs space-y-1">
          <p className="font-semibold text-gray-700">Import complete</p>
          <p>Ticketmaster: {sourceSummary(result.ticketmaster)}</p>
          <p>PredictHQ: {sourceSummary(result.predicthq)}</p>
          <p>iCal: {result.ical?.error
            ? <span className="text-red-500">Error: {result.ical.error}</span>
            : <span className="text-gray-600">{result.ical?.total_fetched ?? 0} fetched · {result.ical?.imported ?? 0} imported</span>
          }</p>
          {result.finished_at && (
            <p className="text-gray-400 pt-1">
              Finished {new Date(result.finished_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
