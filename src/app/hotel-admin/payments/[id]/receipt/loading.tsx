// Streamed immediately on navigation so the receipt route doesn't block on its
// server-side data fetches. Mirrors the real receipt layout to avoid a jump.
export default function ReceiptLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="h-9 w-24 rounded-lg bg-gray-200" />
      </div>

      <div className="card overflow-hidden border-t-4 border-t-primary-600">
        <div className="flex items-start justify-between gap-4 p-8 pb-6">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-200 flex-shrink-0" />
            <div className="space-y-2">
              <div className="h-5 w-44 rounded bg-gray-200" />
              <div className="h-3 w-56 rounded bg-gray-100" />
              <div className="h-3 w-40 rounded bg-gray-100" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
            <div className="h-3 w-20 rounded bg-gray-100" />
          </div>
        </div>

        <div className="px-8 pb-8 space-y-6">
          <div className="h-px w-full bg-gray-100" />
          <div className="grid grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 rounded bg-gray-100" />
                <div className="h-4 w-32 rounded bg-gray-200" />
              </div>
            ))}
          </div>
          <div className="h-px w-full bg-gray-100" />
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-7 w-32 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}
