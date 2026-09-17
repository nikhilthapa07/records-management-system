import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import {
  createEmployee as apiCreateEmployee,
  deleteEmployee as apiDeleteEmployee,
  fetchEmployees,
  updateEmployee as apiUpdateEmployee,
} from '../services/employeeApi'
import type { Employee, NewEmployee } from '../types/employee'

/**
 * Several employees per page makes the virtualized table (and the pagination
 * "jump" control) meaningful on the ~160-record dataset.
 */
const PAGE_SIZE = 25

const EMPLOYEES_KEY = ['employees'] as const

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export interface UseEmployeesReturn {
  employees: Employee[]
  status: 'loading' | 'success' | 'error'
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
  const queryClient = useQueryClient()

  // ----- Fetch (server state) ----------------------------------------------
  const employeesQuery = useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: fetchEmployees,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  })

  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data])
  const status: 'loading' | 'success' | 'error' = employeesQuery.isPending
    ? 'loading'
    : employeesQuery.isError
      ? 'error'
      : 'success'
  const error = employeesQuery.error
    ? messageFrom(employeesQuery.error, 'Something went wrong.')
    : null
  const retry = useCallback(() => {
    void employeesQuery.refetch()
  }, [employeesQuery])

  // ----- Local UI state (search / filter / pagination) ----------------------
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // ----- Mutation metadata ---------------------------------------------------
  const [actionError, setActionError] = useState<string | null>(null)
  const clearActionError = useCallback(() => setActionError(null), [])

  const addMutation = useMutation({ mutationFn: apiCreateEmployee })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: NewEmployee }) =>
      apiUpdateEmployee(id, input),
  })
  const deleteMutation = useMutation({ mutationFn: apiDeleteEmployee })

  // ----- Derived state -------------------------------------------------------
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

  // ----- Mutations (write server state back into the cache) ------------------
  const addEmployee = useCallback(
    async (input: NewEmployee) => {
      setActionError(null)
      try {
        const created = await addMutation.mutateAsync(input)
        queryClient.setQueryData<Employee[]>(EMPLOYEES_KEY, (previous) => [
          ...(previous ?? []),
          created,
        ])
        goToPage(1)
      } catch (mutationError) {
        setActionError(
          messageFrom(mutationError, 'Could not add the record.'),
        )
        throw mutationError
      }
    },
    [addMutation, queryClient, goToPage],
  )

  const updateEmployee = useCallback(
    async (id: number, input: NewEmployee) => {
      setActionError(null)
      try {
        const updated = await updateMutation.mutateAsync({ id, input })
        queryClient.setQueryData<Employee[]>(EMPLOYEES_KEY, (previous) =>
          (previous ?? []).map((employee) =>
            employee.id === updated.id ? updated : employee,
          ),
        )
      } catch (mutationError) {
        setActionError(
          messageFrom(mutationError, 'Could not save the changes.'),
        )
        throw mutationError
      }
    },
    [updateMutation, queryClient],
  )

  const removeEmployee = useCallback(
    async (id: number) => {
      setActionError(null)
      try {
        await deleteMutation.mutateAsync(id)
        queryClient.setQueryData<Employee[]>(EMPLOYEES_KEY, (previous) =>
          (previous ?? []).filter((employee) => employee.id !== id),
        )
      } catch (mutationError) {
        setActionError(
          messageFrom(mutationError, 'Could not delete the record.'),
        )
        throw mutationError
      }
    },
    [deleteMutation, queryClient],
  )

  return {
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
    prevPage,
    nextPage,
    showingLabel,

    isSaving: addMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    deletingId: deleteMutation.isPending ? deleteMutation.variables : null,
    actionError,
    clearActionError,
    addEmployee,
    updateEmployee,
    removeEmployee,
  }
}