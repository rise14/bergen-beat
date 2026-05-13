"use client";

import { useState, useTransition } from "react";
import { SubmissionCard } from "./SubmissionCard";
import type { SubmissionRow } from "./SubmissionCard";
import { bulkApproveSubmissions } from "@/app/admin/actions";

interface Props {
  pending: SubmissionRow[];
  categories: { id: string; name: string; icon: string | null }[];
  highlightId?: string;
}

export function PendingSubmissionsPanel({ pending, categories, highlightId }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [bulkResult, setBulkResult] = useState<{ approved: number } | null>(null);

  const allSelected = pending.length > 0 && selected.size === pending.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((s) => s.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkApprove() {
    if (!selected.size) return;
    if (!confirm(`Approve ${selected.size} submission${selected.size > 1 ? "s" : ""}? This will publish the events immediately.`)) return;

    startTransition(async () => {
      const result = await bulkApproveSubmissions(Array.from(selected));
      setBulkResult(result);
      setSelected(new Set());
    });
  }

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Needs review
        </h2>

        {/* Select all + bulk approve */}
        {pending.length > 1 && (
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="accent-navy-800"
              />
              Select all
            </label>
            {selected.size > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={isPending}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {isPending
                  ? "Approving…"
                  : `✓ Approve selected (${selected.size})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk result flash */}
      {bulkResult && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          ✓ {bulkResult.approved} submission{bulkResult.approved !== 1 ? "s" : ""} approved and published.
        </div>
      )}

      <div className="space-y-4">
        {pending.map((sub) => (
          <div key={sub.id} className="relative">
            {/* Checkbox overlay */}
            {pending.length > 1 && (
              <div className="absolute left-3 top-3 z-10">
                <input
                  type="checkbox"
                  checked={selected.has(sub.id)}
                  onChange={() => toggle(sub.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 accent-navy-800 cursor-pointer"
                  aria-label={`Select ${sub.title}`}
                />
              </div>
            )}
            <div className={pending.length > 1 ? "pl-8" : ""}>
              <SubmissionCard
                submission={sub}
                categories={categories}
                highlightId={highlightId}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
