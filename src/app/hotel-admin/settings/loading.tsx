export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <div className="skeleton h-6 w-28 rounded" />
        <div className="skeleton h-3 w-52 rounded" />
      </div>

      {[0, 1, 2].map(i => (
        <div key={i} className="card p-6 space-y-4">
          <div className="skeleton h-4 w-36 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(j => (
              <div key={j} className="space-y-2">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="skeleton h-11 w-32 rounded-xl" />
    </div>
  )
}
