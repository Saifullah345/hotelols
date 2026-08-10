export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-5 space-y-3">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-7 w-16 rounded" />
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="skeleton h-4 w-32 rounded" />
        </div>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="px-6 py-4 grid grid-cols-5 gap-4 items-center border-b border-gray-50 last:border-0">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
