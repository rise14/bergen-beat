"use client";

import { useState, useTransition } from "react";
import {
  bulkPublishEvents,
  bulkArchiveEvents,
  bulkUnpublishEvents,
  bulkDeleteDraftEvents,
} from "@/app/admin/actions";
import { formatEventDate } from "@/lib/dates";
import type { EventRow } from "@/app/admin/events/page";

interface Props {
  events: EventRow[];
}

const SOURCE_LABELS: Record<string, string> = {
  admin:        "Manual",
  submission:   "Submission",
  ticketmaster: "Ticketmaster",
  predicthq:    "PredictHQ",
};

function statusBadgeClass(status: string) {
  return status === "published"
    ? "bg-green-100 text-green-700"
    : status === "draft"
    ? "bg-yellow-100 text-yellow-700"
    : "bg-gray-100 text-gray-500";
}

export function AdminEventsTable({ events }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [query,        setQuery]        = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const filteredEvents = events.filter((e) => {
    if (query        && !e.title.toLowerCase().includes(query.toLowerCase())) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
    return true;
  });

  // Unique sources present in the full list
  const sources = [...new Set(events.map((e) => e.source))].sort();

  const selectedEvents = events.filter((e) => selected.has(e.id));
  const selectedDraftIds     = selectedEvents.filter((e) => e.status === "draft").map((e) => e.id);
  const selectedPublishedIds = selectedEvents.filter((e) => e.status === "published").map((e) => e.id);
  const selectedArchivableIds = selectedEvents
    .filter((e) => e.status === "draft" || e.status === "published")
    .map((e) => e.id);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function run(action: () => Promise<{ count: number }>, msg: (n: number) => string) {
    startTransition(async () => {
      try {
        const { count } = await action();
        setSelected(new Set());
        showToast("success", msg(count));
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Action failed.");
      }
    });
  }

  function handlePublish() {
    if (!selectedDraftIds.length) return;
    run(() => bulkPublishEvents(selectedDraftIds), (n) => `Published ${n} event${n !== 1 ? "s" : ""}.`);
  }

  function handleUnpublish() {
    if (!selectedPublishedIds.length) return;
    if (!confirm(`Move ${selectedPublishedIds.length} published event${selectedPublishedIds.length !== 1 ? "s" : ""} back to draft?`)) return;
    run(() => bulkUnpublishEvents(selectedPublishedIds), (n) => `Moved ${n} event${n !== 1 ? "s" : ""} to draft.`);
  }

  function handleArchive() {
    if (!selectedArchivableIds.length) return;
    if (!confirm(`Archive ${selectedArchivableIds.length} event${selectedArchivableIds.length !== 1 ? "s" : ""}? They'll be hidden from the public site.`)) return;
    run(() => bulkArchiveEvents(selectedArchivableIds), (n) => `Archived ${n} event${n !== 1 ? "s" : ""}.`);
  }

  function handleDelete() {
    if (!selectedDraftIds.length) return;
    if (!confirm(`Permanently delete ${selectedDraftIds.length} draft${selectedDraftIds.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    run(() => bulkDeleteDraftEvents(selectedDraftIds), (n) => `Deleted ${n} draft${n !== 1 ? "s" : ""}.`);
  }

  const allSelected  = filteredEvents.length > 0 && filteredEvents.every((e) => selected.has(e.id));
  const someSelected = filteredEvents.some((e) => selected.has(e.id)) && !allSelected;

  function toggleAll() {
    const ids = filteredEvents.map((e) => e.id);
    const allChecked = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search events…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-navy-800 focus:outline-none w-56"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-navy-800 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-navy-800 focus:outline-none"
        >
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-gray-400">
          {filteredEvents.length} of {events.length}
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${toast.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {toast.message}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <span className="mr-1 text-sm text-gray-600">
            <span className="font-semibold">{selected.size}</span> selected
          </span>

          {selectedDraftIds.length > 0 && (
            <button onClick={handlePublish} disabled={isPending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              Publish {selectedDraftIds.length !== selected.size && `${selectedDraftIds.length} `}draft{selectedDraftIds.length !== 1 ? "s" : ""}
            </button>
          )}

          {selectedPublishedIds.length > 0 && (
            <button onClick={handleUnpublish} disabled={isPending}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Move to draft
            </button>
          )}

          {selectedArchivableIds.length > 0 && (
            <button onClick={handleArchive} disabled={isPending}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Archive
            </button>
          )}

          {selectedDraftIds.length > 0 && (
            <button onClick={handleDelete} disabled={isPending}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
              Delete drafts
            </button>
          )}

          <button onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-gray-400 hover:text-gray-600">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-3">
                {filteredEvents.length > 0 && (
                  <input type="checkbox" checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll} title="Select all"
                    className="h-4 w-4 rounded border-gray-300 accent-navy-800" />
                )}
              </th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEvents.map((event) => {
              const isSelected  = selected.has(event.id);
              const effectiveEnd = event.end_date ?? event.start_date;
              const isPast = new Date(effectiveEnd) < new Date();
              return (
                <tr key={event.id}
                  className={`hover:bg-gray-50 transition-colors ${isSelected ? "bg-navy-50" : ""} ${isPast && event.status !== "archived" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(event.id)}
                      className="h-4 w-4 rounded border-gray-300 accent-navy-800" />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {event.title}
                    {isPast && event.status !== "archived" && (
                      <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">past</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{event.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{formatEventDate(event.start_date)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {SOURCE_LABELS[event.source] ?? event.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{event.featured ? "⭐" : "—"}</td>
                  <td className="px-4 py-3">
                    <a href={`/admin/events/${event.id}/edit`} className="text-accent-orange hover:underline">Edit</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredEvents.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            {events.length === 0 ? (
              <>No events yet.{" "}
                <a href="/admin/events/new" className="text-accent-orange hover:underline">Create one →</a>
              </>
            ) : (
              "No events match your filters."
            )}
          </div>
        )}
      </div>

      {selected.size === 0 && filteredEvents.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Select rows to bulk publish, archive, move to draft, or delete.
        </p>
      )}
    </div>
  );
}
