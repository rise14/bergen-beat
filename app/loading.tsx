// Root loading skeleton — shown while any page-level data fetch is in progress.
// Displays a grid of placeholder cards matching the EventGrid layout.

export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Hero placeholder */}
      <div className="mb-10 h-64 rounded-2xl bg-gray-200 sm:h-80" />

      {/* Grid of card skeletons */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="h-44 bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="h-5 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
