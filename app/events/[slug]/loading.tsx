export default function EventDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Banner */}
      <div className="mb-8 h-64 rounded-2xl bg-gray-200 sm:h-80" />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-4 lg:col-span-2">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-9 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
          <div className="mt-6 space-y-2">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-4 w-4/6 rounded bg-gray-200" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="h-12 w-full rounded-xl bg-gray-200" />
          <div className="h-24 w-full rounded-xl bg-gray-200" />
          <div className="h-32 w-full rounded-xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
