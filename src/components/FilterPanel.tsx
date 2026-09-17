import { memo, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Filter } from 'lucide-react'

interface FilterPanelProps {
  departments: string[]
  selectedDepartments: string[]
  onToggle: (department: string) => void
  onClear: () => void
}

function FilterPanelBase(props: FilterPanelProps) {
  const { departments, selectedDepartments, onToggle, onClear } = props
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const allSelected =
    departments.length > 0 && selectedDepartments.length === departments.length

  useEffect(() => {
    if (!open) return
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const toggleAll = () => {
    if (allSelected) {
      onClear()
    } else {
      departments.forEach((department) => {
        if (!selectedDepartments.includes(department)) onToggle(department)
      })
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition ${
          selectedDepartments.length > 0
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Filter className="h-4 w-4" aria-hidden="true" />
        Departments
        {selectedDepartments.length > 0 && (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
            {selectedDepartments.length}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Filter by department
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          {departments.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-500">No departments available.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
              {departments.map((department) => {
                const checked = selectedDepartments.includes(department)
                return (
                  <li key={department}>
                    <button
                      type="button"
                      onClick={() => onToggle(department)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                      role="option"
                      aria-selected={checked}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                          checked
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                        aria-hidden="true"
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      {department}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export const FilterPanel = memo(FilterPanelBase)