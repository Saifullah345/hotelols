export default function BookingsLoading() {
  return (
    <div className="space-y-6">
      {/* Tab pills */}
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="skeleton h-9 w-28 rounded-full" />
        ))}
      </div>

      {/* Booking cards */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="skeleton h-5 w-48 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
            </div>
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-full rounded" />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="skeleton h-9 w-28 rounded-lg" />
            <div className="skeleton h-9 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
