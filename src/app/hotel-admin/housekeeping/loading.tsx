export default function HousekeepingLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-6 w-36 rounded" />
          <div className="skeleton h-3 w-52 rounded" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>

      {/* Stat chips */}
      <div className="flex gap-3 flex-wrap">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="skeleton h-9 w-28 rounded-xl" />
        ))}
      </div>

      {/* Task cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-3 w-40 rounded" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="flex items-center justify-between pt-1">
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-7 w-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
