export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-6 w-32 rounded" />
        <div className="skeleton h-3 w-48 rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-5 space-y-3">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-7 w-20 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="card p-5 space-y-4">
            <div className="skeleton h-4 w-36 rounded" />
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
