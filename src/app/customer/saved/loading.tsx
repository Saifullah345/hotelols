export default function SavedHotelsLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-7 w-40 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton h-48 w-full" />
            <div className="p-4 space-y-3">
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="flex gap-2">
                <div className="skeleton h-3 w-16 rounded" />
                <div className="skeleton h-3 w-16 rounded" />
              </div>
              <div className="skeleton h-4 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
