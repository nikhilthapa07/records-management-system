import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createEmployee as apiCreateEmployee,
  deleteEmployee as apiDeleteEmployee,
  fetchEmployees,
  updateEmployee as apiUpdateEmployee,
} from '../services/employeeApi'
import type {
  Employee,
  EmployeesState,
  NewEmployee,
} from '../types/employee'

/**
 * Several employees per page makes the virtualized table (and the pagination
 * "jump" control) meaningful on the ~160-record dataset.
 */
const PAGE_SIZE = 25

export interface UseEmployeesReturn {
  employees: Employee[]
  status: EmployeesState['status']
  error: string | null
  retry: () => void

  departments: string[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedDepartments: string[]
  toggleDepartment: (department: string) => void
  clearFilters: () => void
  activeFilters: boolean

  filteredEmployees: Employee[]
  currentPage: number
  totalPages: number
  pageEmployees: Employee[]
  goToPage: (page: number) => void
  prevPage: () => void
  nextPage: () => void
  showingLabel: string

  isSaving: boolean
  isDeleting: boolean
  deletingId: number | null
  actionError: string | null
  clearActionError: () => void
  addEmployee: (input: NewEmployee) => Promise<void>
  updateEmployee: (id: number, input: NewEmployee) => Promise<void>
  removeEmployee: (id: number) => Promise<void>
}

export function useEmployees(): UseEmployeesReturn {
  const [state, setState] = useState<EmployeesState>({
    employees: [],
    status: 'loading',
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const retry = useCallback(() => {
    setState((previous) => ({ ...previous, status: 'loading', error: null }))
    setReloadKey((key) => key + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchEmployees()
      .then((result) => {
        if (!cancelled) {
          setState({ employees: result, status: 'success', error: null })
        }
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Something went wrong.'
        if (!cancelled) {
          setState({ employees: [], status: 'error', error: message })
        }
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const employees = state.employees

  const departments = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => employee.department))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [employees],
  )

  // Derived, never duplicated: the visible dataset falls out of the source
  // data, the search query and the department selection.
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const departmentSet = new Set(selectedDepartments)

    return employees.filter((employee) => {
      const matchesDepartments =
        departmentSet.size === 0 || departmentSet.has(employee.department)
      const matchesQuery =
        query.length === 0 ||
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(query) ||
        employee.firstName.toLowerCase().includes(query) ||
        employee.lastName.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query)
      return matchesDepartments && matchesQuery
    })
  }, [employees, searchQuery, selectedDepartments])

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE))

  // Derived-state reconciliation (React-recommended "adjust state during
  // render" pattern): whenever the visible dataset shrinks below the current
  // page — deleting the last row on a page, tightening filters — pull the page
  // back in bounds without a wasted extra render cycle or effect.
  if (currentPage > totalPages) {
    setCurrentPage(totalPages)
  }

  const toggleDepartment = useCallback((department: string) => {
    setSelectedDepartments((current) =>
      current.includes(department)
        ? current.filter((item) => item !== department)
        : [...current, department],
    )
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedDepartments([])
    setCurrentPage(1)
  }, [])

  const activeFilters = searchQuery.trim().length > 0 || selectedDepartments.length > 0

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.min(Math.max(page, 1), totalPages)
      setCurrentPage((current) => (current === clamped ? current : clamped))
    },
    [totalPages],
  )

  const prevPage = useCallback(() => {
    setCurrentPage((current) => Math.max(current - 1, 1))
  }, [])

  const nextPage = useCallback(() => {
    setCurrentPage((current) => Math.min(current + 1, totalPages))
  }, [totalPages])

  // If the active page no longer exists (e.g. the last record on the last page
  // was deleted), fall back to the final valid page — derived, not stored.
  const pageEmployees = useMemo(() => {
    const clampedPage = Math.min(currentPage, totalPages)
    const start = (clampedPage - 1) * PAGE_SIZE
    return filteredEmployees.slice(start, start + PAGE_SIZE)
  }, [filteredEmployees, currentPage, totalPages])

  const showingLabel = useMemo(() => {
    if (filteredEmployees.length === 0) return 'Showing 0 records'
    const clampedPage = Math.min(currentPage, totalPages)
    const start = (clampedPage - 1) * PAGE_SIZE + 1
    const end = Math.min(clampedPage * PAGE_SIZE, filteredEmployees.length)
    return `Showing ${start}–${end} of ${filteredEmployees.length}`
  }, [filteredEmployees.length, currentPage, totalPages])

  const addEmployee = useCallback(
    async (input: NewEmployee) => {
      setIsSaving(true)
      setActionError(null)
      try {
        const created = await apiCreateEmployee(input)
        setState((previous) => ({
          ...previous,
          employees: [...previous.employees, created],
        }))
        goToPage(1)
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Could not add the record.',
        )
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [goToPage],
  )

  const updateEmployee = useCallback(async (id: number, input: NewEmployee) => {
    setIsSaving(true)
    setActionError(null)
    try {
      const updated = await apiUpdateEmployee(id, input)
      setState((previous) => ({
        ...previous,
        employees: previous.employees.map((employee) =>
          employee.id === id ? updated : employee,
        ),
      }))
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not save the changes.',
      )
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [])

  const removeEmployee = useCallback(async (id: number) => {
    setDeletingId(id)
    setIsDeleting(true)
    setActionError(null)
    try {
      await apiDeleteEmployee(id)
      setState((previous) => ({
        ...previous,
        employees: previous.employees.filter((employee) => employee.id !== id),
      }))
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not delete the record.',
      )
      throw error
    } finally {
      setDeletingId(null)
      setIsDeleting(false)
    }
  }, [])

  const clearActionError = useCallback(() => setActionError(null), [])

  return {
    employees,
    status: state.status,
    error: state.error,
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
    prevPage,
    nextPage,
    showingLabel,

    isSaving,
    isDeleting,
    deletingId,
    actionError,
    clearActionError,
    addEmployee,
    updateEmployee,
    removeEmployee,
  }
}