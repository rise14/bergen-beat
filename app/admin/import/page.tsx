"use client";

import { useState, useEffect, useCallback } from "react";
import { addIcalSource, toggleIcalSource, deleteIcalSource } from "@/app/admin/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportSource = "ticketmaster" | "predicthq" | "ical";

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
  sources?: Array<{ name: string; fetched: number; error: string | null }>;
}

interface IcalSource {
  id: string;
  name: string;
  url: string;
  category_guess: string | null;
  enabled: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

// ─── API import sources (Ticketmaster / PredictHQ) ───────────────────────────

const API_SOURCES: { id: "ticketmaster" | "predicthq"; label: string; description: string }[] = [
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

const CATEGORY_OPTIONS = [
  "music", "arts", "sports", "food", "community", "education",
  "family", "fitness", "government", "library", "networking", "theater",
];

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────────────

function ResultPanel({ result }: { result: ImportResult }) {
  return (
    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
      {result.error && !result.success ? (
        <p className="text-red-600">❌ {result.error}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 text-gray-700">
            <span><span className="font-semibold">{result.fetched}</span> fetched</span>
            <span className="text-green-700"><span className="font-semibold">{result.imported}</span> imported</span>
            <span className="text-gray-500"><span className="font-semibold">{result.skipped}</span> skipped</span>
            {result.errors > 0 && (
              <span className="text-red-600"><span className="font-semibold">{result.errors}</span> errors</span>
            )}
          </div>

          {/* Per-source breakdown for iCal */}
          {result.sources && result.sources.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.sources.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={s.error ? "text-red-500" : "text-green-600"}>
                    {s.error ? "✗" : "✓"}
                  </span>
                  <span className="font-medium">{s.name}</span>
                  {s.error
                    ? <span className="text-red-500">{s.error}</span>
                    : <span>{s.fetched} event{s.fetched !== 1 ? "s" : ""}</span>
                  }
                </div>
              ))}
            </div>
          )}

          {result.importedTitles.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                View {result.importedTitles.length} imported event{result.importedTitles.length !== 1 ? "s" : ""}
              </summary>
              <ul className="mt-2 space-y-1 pl-4 text-gray-600">
                {result.importedTitles.map((title, i) => (
                  <li key={i} className="list-disc">{title}</li>
                ))}
              </ul>
            </details>
          )}

          {result.errorMessages.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-red-600 hover:text-red-800">
                View {result.errorMessages.length} error{result.errorMessages.length !== 1 ? "s" : ""}
              </summary>
              <ul className="mt-2 space-y-1 pl-4 text-red-600">
                {result.errorMessages.map((msg, i) => (
                  <li key={i} className="list-disc text-xs">{msg}</li>
                ))}
              </ul>
            </details>
          )}

          {result.imported > 0 && (
            <a href="/admin/events" className="mt-3 block text-accent-orange hover:underline">
              → Review imported events in admin
            </a>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  // API sources state
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ImportResult | null>>({
    ticketmaster: null,
    predicthq: null,
    ical: null,
  });
  const [autoPublish, setAutoPublish] = useState(false);

  // iCal sources state
  const [icalSources, setIcalSources] = useState<IcalSource[]>([]);
  const [icalLoading, setIcalLoading] = useState(true);
  const [addingSource, setAddingSource] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", url: "", category_guess: "" });
  const [addError, setAddError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sourceImportResult, setSourceImportResult] = useState<Record<string, ImportResult | null>>({});

  // Load iCal sources
  const loadIcalSources = useCallback(async () => {
    setIcalLoading(true);
    try {
      const res = await fetch("/api/admin/ical-sources");
      if (res.ok) {
        const data = await res.json();
        setIcalSources(data.sources ?? []);
      }
    } finally {
      setIcalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIcalSources();
  }, [loadIcalSources]);

  // Run API import (Ticketmaster / PredictHQ)
  async function runImport(source: "ticketmaster" | "predicthq") {
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
          success: false, source, fetched: 0, imported: 0, skipped: 0, errors: 1,
          importedTitles: [], errorMessages: [err instanceof Error ? err.message : "Unknown error"],
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }));
    } finally {
      setLoading(null);
    }
  }

  // Run iCal import (all sources)
  async function runIcalImportAll() {
    setLoading("ical");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "ical", autoPublish }),
      });
      const data = (await res.json()) as ImportResult;
      setResults((prev) => ({ ...prev, ical: data }));
      await loadIcalSources(); // refresh last_fetched_at
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        ical: {
          success: false, source: "ical", fetched: 0, imported: 0, skipped: 0, errors: 1,
          importedTitles: [], errorMessages: [err instanceof Error ? err.message : "Unknown error"],
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }));
    } finally {
      setLoading(null);
    }
  }

  // Run iCal import (one source)
  async function runIcalImportOne(sourceId: string) {
    setLoading(`ical-${sourceId}`);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "ical", sourceId, autoPublish }),
      });
      const data = (await res.json()) as ImportResult;
      setSourceImportResult((prev) => ({ ...prev, [sourceId]: data }));
      await loadIcalSources(); // refresh last_fetched_at
    } catch (err) {
      setSourceImportResult((prev) => ({
        ...prev,
        [sourceId]: {
          success: false, source: "ical", fetched: 0, imported: 0, skipped: 0, errors: 1,
          importedTitles: [], errorMessages: [err instanceof Error ? err.message : "Unknown error"],
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }));
    } finally {
      setLoading(null);
    }
  }

  // Add iCal source
  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddingSource(true);
    try {
      const fd = new FormData();
      fd.set("name", addForm.name);
      fd.set("url", addForm.url);
      fd.set("category_guess", addForm.category_guess);
      const result = await addIcalSource(fd);
      if (!result.ok) {
        setAddError(result.error ?? "Failed to add source");
      } else {
        setAddForm({ name: "", url: "", category_guess: "" });
        await loadIcalSources();
      }
    } finally {
      setAddingSource(false);
    }
  }

  // Toggle enabled
  async function handleToggle(id: string, enabled: boolean) {
    setTogglingId(id);
    try {
      await toggleIcalSource(id, enabled);
      setIcalSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled } : s))
      );
    } finally {
      setTogglingId(null);
    }
  }

  // Delete source
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteIcalSource(id);
      setIcalSources((prev) => prev.filter((s) => s.id !== id));
      setSourceImportResult((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setDeletingId(null);
    }
  }

  const anyLoading = loading !== null;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Events</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pull events from external APIs and calendar feeds into Bergen Beat. Imported events
          land as <span className="font-medium text-yellow-700">drafts</span> for review before
          publishing, unless auto-publish is on.
        </p>
      </div>

      {/* Auto-publish toggle */}
      <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
        <input
          id="auto-publish"
          type="checkbox"
          checked={autoPublish}
          onChange={(e) => setAutoPublish(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-accent-orange"
        />
        <label htmlFor="auto-publish" className="text-sm text-yellow-800">
          <span className="font-semibold">Auto-publish imported events</span> — skip draft
          review and publish immediately. Use with care.
        </label>
      </div>

      {/* ── API Sources ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">API Sources</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {API_SOURCES.map((src) => {
            const result = results[src.id];
            const isLoading = loading === src.id;
            return (
              <div key={src.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">{src.label}</h3>
                <p className="mt-1 text-sm text-gray-500">{src.description}</p>
                <button
                  onClick={() => runImport(src.id)}
                  disabled={anyLoading}
                  className="mt-4 w-full rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner /> Importing…
                    </span>
                  ) : (
                    `Import from ${src.label}`
                  )}
                </button>
                {result && <ResultPanel result={result} />}
              </div>
            );
          })}
        </div>

        {/* API setup instructions */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">API Key Setup</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add to <code className="rounded bg-gray-100 px-1 text-xs">.env.local</code> and Vercel env vars:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-200">
            {`TICKETMASTER_API_KEY=your_ticketmaster_consumer_key\nPREDICTHQ_ACCESS_TOKEN=your_predicthq_access_token`}
          </pre>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Ticketmaster:</span> Free app at{" "}
              <a href="https://developer.ticketmaster.com/products-and-docs/apis/getting-started/" target="_blank" rel="noopener noreferrer" className="text-accent-orange hover:underline">
                developer.ticketmaster.com
              </a>{" "}
              — copy the <strong>Consumer Key</strong>.
            </p>
            <p>
              <span className="font-medium">PredictHQ:</span> Token at{" "}
              <a href="https://control.predicthq.com/tokens" target="_blank" rel="noopener noreferrer" className="text-accent-orange hover:underline">
                control.predicthq.com/tokens
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ── iCal / .ics Feed Sources ─────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">iCal / .ics Feeds</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Free public calendar feeds from libraries, government, venues, and community orgs.
            </p>
          </div>
          <button
            onClick={runIcalImportAll}
            disabled={anyLoading || icalSources.filter((s) => s.enabled).length === 0}
            className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === "ical" ? (
              <span className="flex items-center gap-2"><Spinner /> Importing…</span>
            ) : (
              `Import all (${icalSources.filter((s) => s.enabled).length} enabled)`
            )}
          </button>
        </div>

        {/* All-sources import result */}
        {results.ical && <ResultPanel result={results.ical} />}

        {/* Source list */}
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {icalLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400">
              <Spinner /> Loading sources…
            </div>
          ) : icalSources.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No iCal sources added yet. Add one below.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Name / URL</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Last fetched</th>
                  <th className="px-4 py-3 text-center">Enabled</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {icalSources.map((src) => {
                  const isImporting = loading === `ical-${src.id}`;
                  const isToggling = togglingId === src.id;
                  const isDeleting = deletingId === src.id;
                  const srcResult = sourceImportResult[src.id];

                  return (
                    <>
                      <tr key={src.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{src.name}</p>
                          <p className="mt-0.5 max-w-xs truncate text-xs text-gray-400" title={src.url}>
                            {src.url}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {src.category_guess ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {src.last_fetched_at
                            ? new Date(src.last_fetched_at).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                              })
                            : <span className="text-gray-300">Never</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggle(src.id, !src.enabled)}
                            disabled={isToggling || anyLoading}
                            title={src.enabled ? "Disable" : "Enable"}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                              src.enabled ? "bg-green-500" : "bg-gray-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                src.enabled ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => runIcalImportOne(src.id)}
                              disabled={anyLoading || !src.enabled}
                              title="Import this source"
                              className="rounded bg-navy-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isImporting ? <Spinner /> : "Import"}
                            </button>
                            <button
                              onClick={() => handleDelete(src.id, src.name)}
                              disabled={isDeleting || anyLoading}
                              title="Delete source"
                              className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-40"
                            >
                              {isDeleting ? <Spinner /> : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {srcResult && (
                        <tr key={`${src.id}-result`}>
                          <td colSpan={5} className="px-4 pb-3">
                            <ResultPanel result={srcResult} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Add source form */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Add iCal Feed</h3>
          <form onSubmit={handleAddSource} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Source name <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Hackensack Library"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Category (optional)
                </label>
                <select
                  value={addForm.category_guess}
                  onChange={(e) => setAddForm((f) => ({ ...f, category_guess: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                >
                  <option value="">— none —</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                .ics feed URL <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="url"
                placeholder="https://example.com/events/calendar.ics"
                value={addForm.url}
                onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Must be a publicly accessible .ics URL (no login required).
              </p>
            </div>

            {addError && (
              <p className="text-sm text-red-600">❌ {addError}</p>
            )}

            <button
              type="submit"
              disabled={addingSource}
              className="rounded-lg bg-accent-orange px-5 py-2 text-sm font-semibold text-white hover:bg-walnut disabled:opacity-50 transition-colors"
            >
              {addingSource ? (
                <span className="flex items-center gap-2"><Spinner /> Adding…</span>
              ) : (
                "Add feed"
              )}
            </button>
          </form>
        </div>

        {/* iCal tips */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-cream-50 p-5">
          <h3 className="mb-2 text-sm font-semibold text-navy-800">Where to find .ics feeds</h3>
          <ul className="space-y-1 text-sm text-walnut">
            <li>🏛 <strong>Bergen County libraries</strong> — check their events/calendar page for an "Add to calendar" or iCal export link</li>
            <li>🏛 <strong>Municipal websites</strong> — many NJ towns publish government event calendars as .ics feeds</li>
            <li>🎭 <strong>Venues & arts orgs</strong> — theaters, arts councils, and performing arts centers often expose calendar feeds</li>
            <li>🌐 <strong>Google Calendar</strong> — any public Google Calendar has an ICAL link in its settings</li>
          </ul>
          <p className="mt-3 text-xs text-gray-400">
            Note: Recurring events (RRULE) are currently skipped to avoid calendar spam.
          </p>
        </div>
      </section>
    </div>
  );
}
