"use client";

import { useState } from "react";

type ImportSource = "ticketmaster" | "predicthq";

interface ImportResult {
  success: boolean;
  source: ImportSource;
  fetched: number;
  imported: number;
  skipped: number;
  errors: number;
  importedTitles: string[];
  errorMessages: string[];
  error?: string;
}

const SOURCES: { id: ImportSource; label: string; description: string }[] = [
  {
    id: "ticketmaster",
    label: "Ticketmaster",
    description: "Pulls concerts, sports, and shows from Ticketmaster within 15 miles of Bergen County. Best for large ticketed events.",
  },
  {
    id: "predicthq",
    label: "PredictHQ",
    description: "Pulls festivals, community events, performing arts, and more within 15 miles of Bergen County.",
  },
];

export default function ImportPage() {
  const [loading, setLoading] = useState<ImportSource | null>(null);
  const [results, setResults] = useState<Record<ImportSource, ImportResult | null>>({
    ticketmaster: null,
    predicthq: null,
  });
  const [autoPublish, setAutoPublish] = useState(false);

  async function runImport(source: ImportSource) {
    setLoading(source);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, autoPublish }),
      });
      const data = (await res.json()) as ImportResult;
      setResults((prev) => ({ ...prev, [source]: data }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [source]: {
          success: false,
          source,
          fetched: 0,
          imported: 0,
          skipped: 0,
          errors: 1,
          importedTitles: [],
          errorMessages: [err instanceof Error ? err.message : "Unknown error"],
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Events</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pull events from external APIs into Bergen Beat. Imported events land
          as <span className="font-medium text-yellow-700">drafts</span> for you
          to review before publishing, unless auto-publish is on.
        </p>
      </div>

      {/* Auto-publish toggle */}
      <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
        <input
          id="auto-publish"
          type="checkbox"
          checked={autoPublish}
          onChange={(e) => setAutoPublish(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-600"
        />
        <label htmlFor="auto-publish" className="text-sm text-yellow-800">
          <span className="font-semibold">Auto-publish imported events</span> — skip
          draft review and publish immediately. Use with care.
        </label>
      </div>

      {/* Source cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {SOURCES.map((src) => {
          const result = results[src.id];
          const isLoading = loading === src.id;

          return (
            <div
              key={src.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {src.label}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{src.description}</p>
                </div>
              </div>

              <button
                onClick={() => runImport(src.id)}
                disabled={isLoading || loading !== null}
                className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Importing…
                  </span>
                ) : (
                  `Import from ${src.label}`
                )}
              </button>

              {/* Result panel */}
              {result && (
                <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
                  {result.error && !result.success ? (
                    <p className="text-red-600">
                      ❌ {result.error}
                    </p>
                  ) : (
                    <>
                      <div className="flex gap-4 text-gray-700">
                        <span>
                          <span className="font-semibold">{result.fetched}</span> fetched
                        </span>
                        <span className="text-green-700">
                          <span className="font-semibold">{result.imported}</span> imported
                        </span>
                        <span className="text-gray-500">
                          <span className="font-semibold">{result.skipped}</span> skipped
                        </span>
                        {result.errors > 0 && (
                          <span className="text-red-600">
                            <span className="font-semibold">{result.errors}</span> errors
                          </span>
                        )}
                      </div>

                      {result.importedTitles.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                            View {result.importedTitles.length} imported event
                            {result.importedTitles.length !== 1 ? "s" : ""}
                          </summary>
                          <ul className="mt-2 space-y-1 pl-4 text-gray-600">
                            {result.importedTitles.map((title, i) => (
                              <li key={i} className="list-disc">
                                {title}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {result.errorMessages.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-red-600 hover:text-red-800">
                            View {result.errorMessages.length} error
                            {result.errorMessages.length !== 1 ? "s" : ""}
                          </summary>
                          <ul className="mt-2 space-y-1 pl-4 text-red-600">
                            {result.errorMessages.map((msg, i) => (
                              <li key={i} className="list-disc text-xs">
                                {msg}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {result.imported > 0 && (
                        <a
                          href="/admin/events"
                          className="mt-3 block text-brand-600 hover:underline"
                        >
                          → Review imported events in admin
                        </a>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Setup instructions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Setup</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add these to your <code className="rounded bg-gray-100 px-1 text-xs">.env.local</code> file
          (and to Vercel environment variables):
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-200">
          {`TICKETMASTER_API_KEY=your_ticketmaster_consumer_key
PREDICTHQ_ACCESS_TOKEN=your_predicthq_access_token`}
        </pre>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">Ticketmaster:</span> Create a free app at{" "}
            <a
              href="https://developer.ticketmaster.com/products-and-docs/apis/getting-started/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              developer.ticketmaster.com
            </a>{" "}
            — copy the <strong>Consumer Key</strong> from your app dashboard.
          </p>
          <p>
            <span className="font-medium">PredictHQ:</span> Sign up and generate a token at{" "}
            <a
              href="https://control.predicthq.com/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              control.predicthq.com/tokens
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
