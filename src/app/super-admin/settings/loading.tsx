export default function Loading() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="skeleton h-6 w-40 rounded" />
      <div className="card p-6 space-y-5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="skeleton h-10 w-28 rounded-lg" />
      </div>
    </div>
  )
}
