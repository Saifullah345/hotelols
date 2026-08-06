export default function BillingLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-6 w-28 rounded" />
        <div className="skeleton h-3 w-52 rounded" />
      </div>

      {/* Current plan banner */}
      <div className="skeleton h-24 w-full rounded-2xl" />

      {/* Toggle */}
      <div className="flex justify-center">
        <div className="skeleton h-10 w-48 rounded-full" />
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="card p-6 space-y-4">
            <div className="skeleton h-5 w-28 rounded" />
            <div className="skeleton h-8 w-24 rounded" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map(j => (
                <div key={j} className="skeleton h-3 w-full rounded" />
              ))}
            </div>
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
