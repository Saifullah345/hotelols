export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="skeleton h-32 rounded-2xl" />

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-7 w-16 rounded" />
              </div>
              <div className="skeleton w-10 h-10 rounded-xl" />
            </div>
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Chart + today's overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 pt-5 pb-4 flex items-start justify-between border-b border-gray-100">
            <div className="space-y-2">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-3 w-20 rounded" />
            </div>
            <div className="skeleton h-6 w-24 rounded" />
          </div>
          <div className="p-5">
            <div className="skeleton h-56 w-full rounded-xl" />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="skeleton h-4 w-32 rounded" />
          </div>
          <div className="p-5 space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="skeleton h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Recent bookings table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="skeleton h-4 w-36 rounded" />
        </div>
        <div className="divide-y divide-gray-100">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="px-6 py-4 grid grid-cols-6 gap-4 items-center">
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
