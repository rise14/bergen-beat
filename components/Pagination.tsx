interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Build a URL for a given page number — caller owns the other params */
  buildHref: (page: number) => string;
}

export function Pagination({ page, totalPages, total, pageSize, buildHref }: Props) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Generate the page numbers to show: always first, last, current ±2, with "…" gaps
  function getPages(): (number | "…")[] {
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    const pages: (number | "…")[] = [1];
    if (range[0] > 2) pages.push("…");
    pages.push(...range);
    if (range[range.length - 1] < totalPages - 1) pages.push("…");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }

  const pages = getPages();

  const linkClass = (active: boolean, disabled = false) =>
    [
      "flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
      active
        ? "bg-brand-600 text-white"
        : disabled
        ? "cursor-default text-gray-300"
        : "border border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
    ].join(" ");

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      {/* Page count summary */}
      <p className="text-sm text-gray-400">
        Showing {from}–{to} of {total} event{total !== 1 ? "s" : ""}
      </p>

      {/* Page links */}
      <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5">
        {/* Previous */}
        {page > 1 ? (
          <a href={buildHref(page - 1)} className={linkClass(false)} aria-label="Previous page">
            ←
          </a>
        ) : (
          <span className={linkClass(false, true)} aria-disabled>←</span>
        )}

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">…</span>
          ) : (
            <a
              key={p}
              href={buildHref(p)}
              aria-current={p === page ? "page" : undefined}
              className={linkClass(p === page)}
            >
              {p}
            </a>
          )
        )}

        {/* Next */}
        {page < totalPages ? (
          <a href={buildHref(page + 1)} className={linkClass(false)} aria-label="Next page">
            →
          </a>
        ) : (
          <span className={linkClass(false, true)} aria-disabled>→</span>
        )}
      </nav>
    </div>
  );
}
