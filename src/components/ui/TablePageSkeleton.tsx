export function TablePageSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-3 w-56 rounded" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>

      {/* Filters / search bar */}
      <div className="flex gap-3">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-10 w-32 rounded-xl" />
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Header row */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="skeleton h-3 w-20 rounded" />
          ))}
        </div>

        {/* Data rows */}
        <div className="divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="px-4 py-4 grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
              {Array.from({ length: cols }).map((_, c) => (
                <div
                  key={c}
                  className="skeleton rounded"
                  style={{ height: 14, width: c === cols - 1 ? '60%' : c === 0 ? '85%' : '75%' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
