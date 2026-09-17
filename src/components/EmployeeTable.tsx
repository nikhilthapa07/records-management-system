import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { getScrollbarSize, List } from 'react-window'
import {
  AlertTriangle,
  Loader2,
  Pencil,
  RefreshCw,
  SearchX,
  Trash2,
  UserPlus,
} from 'lucide-react'
import type { Employee, EmployeesState } from '../types/employee'
import { Loading } from './Loading'

const ROW_HEIGHT = 56
const ROW_GAP = '0.75rem'
const ROW_PADDING_X = '1rem'
// Shared grid template keeps the fixed header and every virtualized row aligned
// to the same column boundaries.
const COLUMN_GRID =
  'minmax(60px,0.5fr) minmax(150px,1.4fr) minmax(190px,1.8fr) minmax(130px,1.2fr) minmax(130px,1.2fr) minmax(90px,0.8fr) 136px'

interface RowData {
  employees: Employee[]
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  isDeleting: boolean
  deletingId: number | null
}

interface RowRenderArgs {
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
  index: number
  style: CSSProperties
}

interface EmployeeRowProps {
  employee: Employee
  ariaAttributes: RowRenderArgs['ariaAttributes']
  style: CSSProperties
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  isDeleting: boolean
  deletingId: number | null
}

const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status: Employee['status']
}) {
  const styles =
    status === 'Active'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-500'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {status}
    </span>
  )
})

const EmployeeRow = memo(function EmployeeRow(props: EmployeeRowProps) {
  const { employee, ariaAttributes, style, onEdit, onDelete, isDeleting, deletingId } =
    props
  const rowDeleting = isDeleting && deletingId === employee.id

  return (
    <div
      role={ariaAttributes.role}
      aria-posinset={ariaAttributes['aria-posinset']}
      aria-setsize={ariaAttributes['aria-setsize']}
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: COLUMN_GRID,
        gap: ROW_GAP,
        alignItems: 'center',
        paddingLeft: ROW_PADDING_X,
        paddingRight: ROW_PADDING_X,
      }}
      className="border-b border-slate-100 transition-colors hover:bg-indigo-50/50"
    >
      <span className="text-sm tabular-nums text-slate-500">{employee.id}</span>
      <span className="truncate text-sm font-medium text-slate-900">
        {employee.firstName} {employee.lastName}
      </span>
      <span className="truncate text-sm text-slate-600">{employee.email}</span>
      <span className="truncate text-sm text-slate-600">{employee.department}</span>
      <span className="truncate text-sm text-slate-600">{employee.role}</span>
      <StatusBadge status={employee.status} />
      <span className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onEdit(employee.id)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600"
          aria-label={`Edit ${employee.firstName} ${employee.lastName}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(employee.id)}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Delete ${employee.firstName} ${employee.lastName}`}
        >
          {rowDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Delete
        </button>
      </span>
    </div>
  )
})

function TableHeader() {
  const scrollbarWidth = getScrollbarSize()
  return (
    <div
      className="border-b border-slate-200 bg-slate-50 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMN_GRID,
        gap: ROW_GAP,
        alignItems: 'center',
        paddingLeft: ROW_PADDING_X,
        paddingRight: scrollbarWidth
          ? `calc(${ROW_PADDING_X} + ${scrollbarWidth}px)`
          : ROW_PADDING_X,
      }}
    >
      <span>ID</span>
      <span>Name</span>
      <span>Email</span>
      <span>Department</span>
      <span>Role</span>
      <span>Status</span>
      <span className="text-right">Actions</span>
    </div>
  )
}

interface EmployeeTableProps {
  employees: Employee[]
  status: EmployeesState['status']
  error: string | null
  hasActiveFilters: boolean
  onRetry: () => void
  onClearFilters: () => void
  onAdd: () => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  isDeleting: boolean
  deletingId: number | null
}

export function EmployeeTable(props: EmployeeTableProps) {
  const {
    employees,
    status,
    error,
    hasActiveFilters,
    onRetry,
    onClearFilters,
    onAdd,
    onEdit,
    onDelete,
    isDeleting,
    deletingId,
  } = props

  // Stable callbacks — the virtualizer warns against inline functions here.
  // Declared before the early returns so the hook order is always identical.
  const rowKey = useCallback(
    (index: number, data: RowData) => data.employees[index]?.id ?? index,
    [],
  )

  const rowComponent = useCallback(
    (args: RowRenderArgs & RowData) => (
      <EmployeeRow
        employee={args.employees[args.index]}
        ariaAttributes={args.ariaAttributes}
        style={args.style}
        onEdit={args.onEdit}
        onDelete={args.onDelete}
        isDeleting={args.isDeleting}
        deletingId={args.deletingId}
      />
    ),
    [],
  )

  const rowProps = useMemo<RowData>(
    () => ({ employees, onEdit, onDelete, isDeleting, deletingId }),
    [employees, onEdit, onDelete, isDeleting, deletingId],
  )

  // The list fills whatever vertical space the layout leaves it (the page itself
  // never scrolls), so the virtualizer's height is measured rather than fixed.
  const listAreaRef = useRef<HTMLDivElement>(null)
  const [availableHeight, setAvailableHeight] = useState(640)

  useLayoutEffect(() => {
    const measure = () => {
      const height = listAreaRef.current?.clientHeight
      if (height) {
        setAvailableHeight((previous) =>
          Math.abs(height - previous) > 1 ? height : previous,
        )
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    if (listAreaRef.current) observer.observe(listAreaRef.current)
    return () => observer.disconnect()
  }, [])

  const listHeight = Math.min(employees.length * ROW_HEIGHT, availableHeight)

  if (status === 'loading') {
    return <Loading />
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden="true" />
        <h3 className="text-base font-semibold text-slate-900">
          We couldn’t load employee records
        </h3>
        <p className="max-w-md text-sm text-slate-600">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    )
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
        {hasActiveFilters ? (
          <>
            <SearchX className="h-10 w-10 text-slate-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-900">
              No matching records
            </h3>
            <p className="max-w-md text-sm text-slate-600">
              No employees match the current search or department filters.
            </p>
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear filters
            </button>
          </>
        ) : (
          <>
            <UserPlus className="h-10 w-10 text-slate-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-900">
              No employees yet
            </h3>
            <p className="max-w-md text-sm text-slate-600">
              Get started by adding your first employee record.
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add employee
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-full min-w-[760px] flex-col">
        <TableHeader />
        <div ref={listAreaRef} className="min-h-0 flex-1">
          <List<RowData>
            rowCount={employees.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={rowComponent}
            rowProps={rowProps}
            rowKey={rowKey}
            overscanCount={6}
            style={{ height: listHeight, width: '100%' }}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}