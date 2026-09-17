import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { DebouncedFunction } from '../utils/helpers'
import { debounce } from '../utils/helpers'

interface SearchBarProps {
  onSearchChange: (query: string) => void
  placeholder?: string
}

export function SearchBar({ onSearchChange, placeholder }: SearchBarProps) {
  const [draft, setDraft] = useState('')
  const callbackRef = useRef(onSearchChange)
  const notifyRef = useRef<DebouncedFunction<(value: string) => void> | undefined>(
    undefined,
  )

  useEffect(() => {
    callbackRef.current = onSearchChange
  }, [onSearchChange])

  useEffect(() => {
    const notify = debounce((value: string) => callbackRef.current(value), 400)
    notifyRef.current = notify
    return () => {
      notify.cancel()
    }
  }, [])

  const handleChange = (value: string) => {
    setDraft(value)
    notifyRef.current?.(value)
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder ?? 'Search name, email or role…'}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        aria-label="Search employees by name, email or role"
      />
      {draft.length > 0 && (
        <button
          type="button"
          onClick={() => handleChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}