'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

interface Props {
  /** Current page (1-based). Clamped internally, so callers can store it freely. */
  page: number
  onPage: (page: number) => void
  perPage: number
  onPerPage: (n: number) => void
  /** Number of rows after filtering. */
  total: number
  /** Plural noun for the summary line, e.g. "booking" / "payment". */
  noun: string
}

/** Rows-per-page + numbered pager, shared by the admin list screens. */
export default function Pagination({ page, onPage, perPage, onPerPage, total, noun }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * perPage

  // First, last, and a window around the current page.
  const pageNumbers = useMemo(() => {
    const out: (number | 'â€¦')[] = []
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) out.push(i)
      else if (out[out.length - 1] !== 'â€¦') out.push('â€¦')
    }
    return out
  }, [totalPages, safePage])

  if (!total) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-500">
        Showing{' '}
        <span className="font-semibold text-gray-700">
          {start + 1}â€“{Math.min(start + perPage, total)}
        </span>{' '}
        of <span className="font-semibold text-gray-700">{total}</span> {noun}
        {total !== 1 ? 's' : ''}
      </p>

      <div className="flex items-center gap-3">
        <select
          value={perPage}
          onChange={e => onPerPage(Number(e.target.value))}
          aria-label={`${noun}s per page`}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          {PER_PAGE_OPTIONS.map(n => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPage(safePage - 1)}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:hover:bg-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {pageNumbers.map((p, i) =>
              p === 'â€¦' ? (
                <span key={`gap-${i}`} className="px-1 text-xs text-gray-400 select-none">â€¦</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPage(p)}
                  aria-current={p === safePage ? 'page' : undefined}
                  className={`inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-lg text-xs font-semibold transition-colors ${
                    p === safePage
                      ? 'bg-primary-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => onPage(safePage + 1)}
              disabled={safePage === totalPages}
              aria-label="Next page"
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:hover:bg-white"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}