export default function RoomsLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-6 w-32 rounded" />
          <div className="skeleton h-3 w-48 rounded" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>

      <div className="flex gap-3">
        <div className="skeleton h-10 w-56 rounded-xl" />
        <div className="skeleton h-10 w-28 rounded-xl" />
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton h-40 w-full rounded-none" />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
              <div className="flex gap-2 pt-1">
                <div className="skeleton h-8 flex-1 rounded-lg" />
                <div className="skeleton h-8 flex-1 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
