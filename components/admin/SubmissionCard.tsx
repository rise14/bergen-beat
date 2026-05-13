"use client";

import { useState } from "react";
import { approveSubmission, rejectSubmission, updateSubmission, resendEditLink } from "@/app/admin/actions";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export interface SubmissionRow {
  id: string;
  title: string;
  description: string | null;
  organizer_name: string;
  organizer_email: string;
  start_date: string;
  end_date: string | null;
  venue_name: string;
  venue_address: string | null;
  status: string;
  admin_notes: string | null;
  external_url: string | null;
  banner_url: string | null;
  is_free: boolean;
  price_range: string | null;
  category_id: string | null;
  edit_token: string | null;
}

interface Props {
  submission: SubmissionRow;
  categories: Category[];
  compact?: boolean;
  highlightId?: string;
}

// Datetime-local input expects "YYYY-MM-DDTHH:mm"
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export function SubmissionCard({ submission: s, categories, compact = false, highlightId }: Props) {
  const [editing, setEditing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const isHighlighted = highlightId === s.id;

  const statusColor =
    s.status === "approved"
      ? "bg-green-100 text-green-700"
      : s.status === "rejected"
      ? "bg-red-100 text-red-600"
      : "bg-amber-100 text-amber-700";

  const dateLabel = new Date(s.start_date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
  });

  return (
    <div className={`rounded-xl border bg-white p-5 transition-all
      ${isHighlighted ? "border-green-400 ring-2 ring-green-200" : "border-gray-100"}`}
    >
      {/* ── Read view ── */}
      {!editing && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 truncate">{s.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                  {s.status}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                {dateLabel} · {s.venue_name}
                {s.is_free ? " · Free" : s.price_range ? ` · ${s.price_range}` : ""}
              </p>
              <p className="mt-0.5 text-sm text-gray-400">
                {s.organizer_name} · {s.organizer_email}
              </p>
              {s.description && !compact && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{s.description}</p>
              )}
            </div>

            {!compact && (
              <button
                onClick={() => setEditing(true)}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Edit
              </button>
            )}
          </div>

          {/* Actions for pending */}
          {!compact && s.status === "pending" && (
            <div className="mt-4 space-y-3">
              {s.external_url && (
                <a href={s.external_url} target="_blank" rel="noopener noreferrer"
                  className="inline-block text-sm text-accent-orange hover:underline">
                  View original event page →
                </a>
              )}
              <div className="flex flex-wrap gap-3 items-start">
                {/* Approve */}
                <form action={approveSubmission}>
                  <input type="hidden" name="submission_id" value={s.id} />
                  <button type="submit"
                    className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700">
                    Approve & Publish
                  </button>
                </form>

                {/* Reject */}
                {!rejectOpen ? (
                  <button onClick={() => setRejectOpen(true)}
                    className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    Reject
                  </button>
                ) : (
                  <form action={rejectSubmission} className="flex items-center gap-2">
                    <input type="hidden" name="submission_id" value={s.id} />
                    <input type="text" name="admin_note" autoFocus
                      placeholder="Reason (optional)"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-navy-800"
                    />
                    <button type="submit"
                      className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                      Confirm reject
                    </button>
                    <button type="button" onClick={() => setRejectOpen(false)}
                      className="text-xs text-gray-400 hover:text-gray-600">
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {s.admin_notes && (
            <p className="mt-3 text-sm italic text-gray-400">Note: {s.admin_notes}</p>
          )}

          {/* Re-send edit link — only for approved submissions with an edit token */}
          {!compact && s.status === "approved" && s.edit_token && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <form action={resendEditLink}>
                <input type="hidden" name="submission_id" value={s.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-accent-orange transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Re-send edit link to organizer
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* ── Edit view ── */}
      {editing && (
        <form action={updateSubmission} className="space-y-4">
          <input type="hidden" name="submission_id" value={s.id} />

          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-700">Editing submission</h3>
            <button type="button" onClick={() => setEditing(false)}
              className="text-xs text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Title *</label>
            <input name="title" required defaultValue={s.title}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none" />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Description</label>
            <textarea name="description" rows={3} defaultValue={s.description ?? ""}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none resize-none" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Start date *</label>
              <input name="start_date" type="datetime-local" required
                defaultValue={toDatetimeLocal(s.start_date)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">End date</label>
              <input name="end_date" type="datetime-local"
                defaultValue={toDatetimeLocal(s.end_date)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none" />
            </div>
          </div>

          {/* Venue */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Venue name *</label>
              <input name="venue_name" required defaultValue={s.venue_name}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Venue address</label>
              <input name="venue_address" defaultValue={s.venue_address ?? ""}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none" />
            </div>
          </div>

          {/* Category + Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Category</label>
              <select name="category_id" defaultValue={s.category_id ?? ""}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none">
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Pricing</label>
              <div className="flex gap-2">
                <select name="is_free" defaultValue={s.is_free ? "true" : "false"}
                  className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-navy-800 focus:outline-none">
                  <option value="true">Free</option>
                  <option value="false">Paid</option>
                </select>
                <input name="price_range" placeholder="e.g. $10–$20"
                  defaultValue={s.price_range ?? ""}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* External URL + Banner */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Event URL</label>
              <input name="external_url" type="url" placeholder="https://"
                defaultValue={s.external_url ?? ""}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Banner image URL</label>
              <input name="banner_url" type="url" placeholder="https://"
                defaultValue={s.banner_url ?? ""}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none" />
            </div>
          </div>

          {/* Admin notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Admin notes</label>
            <input name="admin_notes" defaultValue={s.admin_notes ?? ""}
              placeholder="Internal notes — not shown to organizer"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400">
              {s.organizer_name} · {s.organizer_email}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)}
                className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit"
                className="rounded-lg bg-navy-800 px-5 py-1.5 text-sm font-semibold text-white hover:bg-navy-700">
                Save changes
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
