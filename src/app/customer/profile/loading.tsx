export default function ProfileLoading() {
  return (
    <div className="max-w-2xl space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="skeleton w-24 h-24 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-5 w-36 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
        </div>
      </div>

      {/* Form fields */}
      <div className="card p-6 space-y-5">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="skeleton h-10 w-32 rounded-lg mt-2" />
      </div>
    </div>
  )
}
