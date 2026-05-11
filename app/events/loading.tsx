export default function EventsLoading() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Filter bar placeholder */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-gray-200" />
        ))}
      </div>

      {/* Event grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="h-44 bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="h-5 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-1/3 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
