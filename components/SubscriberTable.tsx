"use client";

import { useState, useTransition } from "react";
import { deleteSubscriber } from "@/app/admin/actions";

export type SubscriberRow = {
  id: string;
  email: string;
  confirmed: boolean;
  subscribed_at: string;
};

interface Props {
  subscribers: SubscriberRow[];
}

export function SubscriberTable({ subscribers: initial }: Props) {
  const [rows, setRows] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleDelete(id: string, email: string) {
    if (!confirm(`Remove ${email} from the subscriber list?`)) return;
    startTransition(async () => {
      try {
        await deleteSubscriber(id);
        setRows((prev) => prev.filter((r) => r.id !== id));
        showToast(`Removed ${email}.`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 py-16 text-center text-gray-400">
        No subscribers yet.
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {toast}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Subscribed</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {sub.email}
                </td>
                <td className="px-4 py-3">
                  {sub.confirmed ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Confirmed
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {formatDate(sub.subscribed_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(sub.id, sub.email)}
                    disabled={isPending}
                    className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
