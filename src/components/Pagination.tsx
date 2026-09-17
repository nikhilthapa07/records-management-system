import { memo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clamp } from '../utils/helpers'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showingLabel: string
}

function pageWindow(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = []
  const WINDOW = 2

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) pages.push(page)
    return pages
  }

  const start = Math.max(1, currentPage - WINDOW)
  const end = Math.min(totalPages, currentPage + WINDOW)

  if (start > 2) pages.push('ellipsis')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push('ellipsis')
  return pages
}

function PaginationBase(props: PaginationProps) {
  const { currentPage, totalPages, onPageChange, showingLabel } = props
  const [jumpValue, setJumpValue] = useState('')

  const handlePageChange = (page: number) => {
    setJumpValue('')
    onPageChange(page)
  }

  const handleJump = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = Number.parseInt(jumpValue, 10)
    if (Number.isFinite(parsed)) {
      handlePageChange(clamp(parsed, 1, totalPages))
    } else {
      setJumpValue('')
    }
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-600">{showingLabel}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Prev
        </button>

        {pageWindow(currentPage, totalPages).map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => handlePageChange(item)}
              aria-current={item === currentPage ? 'page' : undefined}
              className={`min-w-9 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                item === currentPage
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <form
          onSubmit={handleJump}
          className="ml-1 flex items-center gap-2"
          aria-label="Jump to page"
        >
          <label htmlFor="jump-page" className="text-sm text-slate-600">
            Go to
          </label>
          <input
            id="jump-page"
            type="number"
            min={1}
            max={totalPages}
            value={jumpValue}
            onChange={(event) => setJumpValue(event.target.value)}
            className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            aria-label="Page number"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  )
}

export const Pagination = memo(PaginationBase)