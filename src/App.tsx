import { lazy, Suspense, useCallback, useState } from 'react'
import {
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { EmployeeTable } from './components/EmployeeTable'
import { FilterPanel } from './components/FilterPanel'
import { Modal } from './components/Modal'
import { Pagination } from './components/Pagination'
import { SearchBar } from './components/SearchBar'
import { useEmployees } from './hooks/useEmployees'
import type { Employee, NewEmployee } from './types/employee'
import { exportCsv, exportJson } from './utils/exportUtils'

// Heavy interactive surface is loaded on demand (code-splitting / lean path).
const EmployeeForm = lazy(() =>
  import('./components/EmployeeForm').then((module) => ({ default: module.EmployeeForm })),
)

type FormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; employee: Employee }

function App() {
  const {
    employees,
    status,
    error,
    retry,
    departments,
    searchQuery,
    setSearchQuery,
    selectedDepartments,
    toggleDepartment,
    clearFilters,
    activeFilters,
    filteredEmployees,
    currentPage,
    totalPages,
    pageEmployees,
    goToPage,
    showingLabel,
    isSaving,
    isDeleting,
    deletingId,
    actionError,
    clearActionError,
    addEmployee,
    updateEmployee,
    removeEmployee,
  } = useEmployees()

  const [formState, setFormState] = useState<FormState>({ kind: 'closed' })
  const [formNonce, setFormNonce] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [resetSignal, setResetSignal] = useState(0)

  const openCreate = useCallback(() => {
    setFormState({ kind: 'create' })
    setFormNonce((nonce) => nonce + 1)
  }, [])

  const openEditModal = useCallback(
    (id: number) => {
      const employee = employees.find((candidate) => candidate.id === id)
      if (employee) {
        setFormState({ kind: 'edit', employee })
        setFormNonce((nonce) => nonce + 1)
      }
    },
    [employees],
  )

  const handleClearFilters = useCallback(() => {
    clearFilters()
    setResetSignal((signal) => signal + 1)
  }, [clearFilters])

  const handleFormSubmit = useCallback(
    async (values: NewEmployee) => {
      if (formState.kind === 'edit') {
        await updateEmployee(formState.employee.id, values)
      } else {
        await addEmployee(values)
      }
      setFormState({ kind: 'closed' })
    },
    [formState, addEmployee, updateEmployee],
  )

  const requestDelete = useCallback(
    (id: number) => {
      const target = employees.find((candidate) => candidate.id === id)
      if (target) setDeleteTarget(target)
    },
    [employees],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await removeEmployee(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // Dialog stays open; the error banner reflects the failure.
    }
  }, [deleteTarget, removeEmployee])

  const handleExportCsv = useCallback(() => exportCsv(filteredEmployees), [filteredEmployees])
  const handleExportJson = useCallback(() => exportJson(filteredEmployees), [filteredEmployees])

  const exportDisabled = filteredEmployees.length === 0

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Employee Records</h1>
              <p className="text-sm text-slate-500">
                {status === 'success' ? `${employees.length} records in the system` : 'Manage your team'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add employee
          </button>
        </header>

        {actionError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1">{actionError}</p>
            <button
              type="button"
              onClick={clearActionError}
              className="rounded p-0.5 text-red-400 transition hover:bg-red-100 hover:text-red-600"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="w-full sm:w-72 lg:w-80">
              <SearchBar
                key={resetSignal}
                onSearchChange={setSearchQuery}
                placeholder="Search name, email or role…"
              />
            </div>
            <FilterPanel
              departments={departments}
              selectedDepartments={selectedDepartments}
              onToggle={toggleDepartment}
              onClear={handleClearFilters}
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-sm font-medium text-indigo-600 underline-offset-2 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exportDisabled}
              title={exportDisabled ? 'No records to export' : 'Export filtered records as CSV'}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={exportDisabled}
              title={exportDisabled ? 'No records to export' : 'Export filtered records as JSON'}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileJson className="h-4 w-4" aria-hidden="true" />
              JSON
            </button>
          </div>
        </div>

        {selectedDepartments.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {selectedDepartments.map((department) => (
              <span
                key={department}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 py-1 pl-3 pr-1.5 text-xs font-medium text-indigo-700"
              >
                {department}
                <button
                  type="button"
                  onClick={() => toggleDepartment(department)}
                  className="rounded-full p-0.5 transition hover:bg-indigo-200"
                  aria-label={`Remove ${department} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {activeFilters && (
          <p className="mb-3 text-sm text-slate-500">
            {filteredEmployees.length} of {employees.length} records match your
            current search and filters.
          </p>
        )}

        <section aria-label="Employee list">
          <EmployeeTable
            employees={pageEmployees}
            status={status}
            error={error}
            hasActiveFilters={activeFilters}
            onRetry={retry}
            onClearFilters={handleClearFilters}
            onAdd={openCreate}
            onEdit={openEditModal}
            onDelete={requestDelete}
            isDeleting={isDeleting}
            deletingId={deletingId}
          />
        </section>

        {status === 'success' && filteredEmployees.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            showingLabel={showingLabel}
          />
        )}
      </main>

      {formState.kind !== 'closed' && (
        <Modal
          title={formState.kind === 'edit' ? 'Edit employee' : 'Add employee'}
          onClose={() => {
            if (!isSaving) setFormState({ kind: 'closed' })
          }}
        >
          <Suspense
            fallback={
              <div className="py-8 text-center text-sm text-slate-500">
                Loading form…
              </div>
            }
          >
            <EmployeeForm
              key={formNonce}
              mode={formState.kind === 'edit' ? 'edit' : 'create'}
              initialValues={formState.kind === 'edit' ? formState.employee : null}
              departments={departments}
              isSubmitting={isSaving}
              onSubmit={handleFormSubmit}
              onCancel={() => setFormState({ kind: 'closed' })}
            />
          </Suspense>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete employee" onClose={() => setDeleteTarget(null)}>
          <div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">
                {deleteTarget.firstName} {deleteTarget.lastName}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default App