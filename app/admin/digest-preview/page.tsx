"use client";

import { useState } from "react";

export default function DigestPreviewPage() {
  const [loading, setLoading] = useState(false);
  const [html, setHtml]       = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function loadPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/digest-preview");
      if (!res.ok) { setError("Failed to load preview"); return; }
      const text = await res.text();
      setHtml(text);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Digest Preview</h1>
          <p className="mt-1 text-sm text-gray-500">
            See exactly what this week&apos;s Wednesday email will look like before it sends.
          </p>
        </div>
        <button
          onClick={loadPreview}
          disabled={loading}
          className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading…
            </>
          ) : (
            "Load preview"
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {!html && !loading && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-20 text-center text-gray-400">
          <p className="text-lg">Click &ldquo;Load preview&rdquo; to see this week&apos;s digest</p>
          <p className="mt-1 text-sm">Shows all published events for the next 7 days, plus any active sponsored slot.</p>
        </div>
      )}

      {html && (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
            <p className="text-xs font-medium text-gray-500">Email preview — 600px wide</p>
            <button
              onClick={loadPreview}
              className="text-xs text-accent-orange hover:underline"
            >
              Refresh
            </button>
          </div>
          <iframe
            srcDoc={html}
            className="w-full"
            style={{ height: "800px", border: "none" }}
            title="Digest preview"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </>
  );
}
