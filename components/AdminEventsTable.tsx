"use client";

import { useState, useTransition } from "react";
import { bulkPublishEvents, bulkDeleteDraftEvents } from "@/app/admin/actions";
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

export function AdminEventsTable({ events }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const draftEvents = events.filter((e) => e.status === "draft");
  const selectedDrafts = [...selected].filter((id) =>
    draftEvents.some((e) => e.id === id)
  );

  function toggleAll() {
    if (selected.size === draftEvents.length && draftEvents.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(draftEvents.map((e) => e.id)));
    }
  }

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

  function handleBulkPublish() {
    if (!selectedDrafts.length) return;
    startTransition(async () => {
      try {
        const { count } = await bulkPublishEvents(selectedDrafts);
        setSelected(new Set());
        showToast("success", `Published ${count} event${count !== 1 ? "s" : ""}.`);
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Publish failed.");
      }
    });
  }

  function handleBulkDelete() {
    if (!selectedDrafts.length) return;
    if (!confirm(`Delete ${selectedDrafts.length} draft event${selectedDrafts.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        const { count } = await bulkDeleteDraftEvents(selectedDrafts);
        setSelected(new Set());
        showToast("success", `Deleted ${count} draft${count !== 1 ? "s" : ""}.`);
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  const allDraftsSelected = draftEvents.length > 0 && selected.size === draftEvents.length;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Bulk action bar — only visible when something is selected */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-600">
            <span className="font-semibold">{selected.size}</span> draft
            {selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleBulkPublish}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? "Publishing…" : "Publish selected"}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isPending}
              className="rounded-lg bg-red-50 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Delete selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-3">
                {draftEvents.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allDraftsSelected}
                    onChange={toggleAll}
                    title="Select all drafts"
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                  />
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
            {events.map((event) => {
              const isDraft = event.status === "draft";
              const isSelected = selected.has(event.id);

              return (
                <tr
                  key={event.id}
                  className={`hover:bg-gray-50 ${isSelected ? "bg-brand-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    {isDraft && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(event.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {event.title}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {event.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatEventDate(event.start_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {SOURCE_LABELS[event.source] ?? event.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        event.status === "published"
                          ? "bg-green-100 text-green-700"
                          : event.status === "draft"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {event.featured ? "⭐" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/events/${event.id}/edit`}
                      className="text-brand-600 hover:underline"
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            No events yet.{" "}
            <a href="/admin/events/new" className="text-brand-600 hover:underline">
              Create one →
            </a>
          </div>
        )}
      </div>

      {draftEvents.length > 0 && selected.size === 0 && (
        <p className="mt-3 text-xs text-gray-400">
          {draftEvents.length} draft{draftEvents.length !== 1 ? "s" : ""} — check the boxes to bulk publish or delete.
        </p>
      )}
    </div>
  );
}
