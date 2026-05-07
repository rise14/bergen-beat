"use client";

import { useState, useTransition } from "react";
import { archivePastEvents } from "@/app/admin/actions";

interface Props {
  count: number;
}

export function ArchivePastButton({ count }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleArchive() {
    if (
      !confirm(
        `Archive ${count} past event${count !== 1 ? "s" : ""}?\n\nThis sets them to "archived" status. They'll stay in the database but won't appear publicly.`
      )
    )
      return;

    startTransition(async () => {
      try {
        const { count: archived } = await archivePastEvents();
        setResult(`Archived ${archived} event${archived !== 1 ? "s" : ""}.`);
        setTimeout(() => setResult(null), 5000);
      } catch (err) {
        setResult(err instanceof Error ? err.message : "Archive failed.");
        setTimeout(() => setResult(null), 5000);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-sm text-green-700">{result}</span>
      )}
      <button
        onClick={handleArchive}
        disabled={isPending}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending ? "Archiving…" : `Archive ${count} past`}
      </button>
    </div>
  );
}
