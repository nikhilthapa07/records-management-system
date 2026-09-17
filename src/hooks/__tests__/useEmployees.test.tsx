import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
} from '../../services/employeeApi'
import { useEmployees } from '../useEmployees'
import type { Employee, NewEmployee } from '../../types/employee'

vi.mock('../../services/employeeApi', () => ({
  fetchEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
}))

const mockedFetch = vi.mocked(fetchEmployees)
const mockedCreate = vi.mocked(createEmployee)
const mockedUpdate = vi.mocked(updateEmployee)
const mockedDelete = vi.mocked(deleteEmployee)

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    department: 'Engineering',
    role: 'Developer',
    status: 'Active',
    ...overrides,
  }
}

const newEmployeeInput: NewEmployee = {
  firstName: 'Grace',
  lastName: 'Hopper',
  email: 'grace@example.com',
  department: 'Engineering',
  role: 'Engineer',
  status: 'Active',
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      // The hook sets retry: 1; zero the retry delay so auto-retries in tests
      // resolve immediately instead of waiting on the exponential backoff.
      queries: { retry: false, retryDelay: 0 },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe('useEmployees', () => {
  beforeEach(() => {
    mockedFetch.mockReset()
    mockedCreate.mockReset()
    mockedUpdate.mockReset()
    mockedDelete.mockReset()
  })

  it('maps the fetch to loading and then success with data', async () => {
    mockedFetch.mockResolvedValue([makeEmployee(), makeEmployee({ id: 2 })])
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.employees).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('surfaces a user-friendly error message', async () => {
    mockedFetch.mockRejectedValue(
      new Error('Network error — check your connection and try again.'),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('Network error — check your connection and try again.')
    expect(result.current.employees).toHaveLength(0)
  })

  it('handles an empty dataset without filters as an empty state', async () => {
    mockedFetch.mockResolvedValue([])
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.employees).toEqual([])
    expect(result.current.filteredEmployees).toEqual([])
    expect(result.current.showingLabel).toBe('Showing 0 records')
  })

  it('applies the debounced-flavoured search and department filters together', async () => {
    mockedFetch.mockResolvedValue([
      makeEmployee(),
      makeEmployee({
        id: 2,
        firstName: 'Grace',
        email: 'grace@example.com',
        department: 'Support',
        role: 'Analyst',
      }),
    ])
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('success'))

    act(() => {
      result.current.setSearchQuery('grace')
    })
    expect(result.current.filteredEmployees.map((e) => e.id)).toEqual([2])

    act(() => {
      result.current.toggleDepartment('Engineering')
    })
    expect(result.current.filteredEmployees).toHaveLength(0)
    expect(result.current.activeFilters).toBe(true)

    act(() => {
      result.current.clearFilters()
    })
    expect(result.current.filteredEmployees).toHaveLength(2)
    expect(result.current.activeFilters).toBe(false)
  })

  it('refetches via retry after a failure', async () => {
    // First attempt fails; the hook auto-retries (retry: 1) which also fails;
    // only the manual refetch resolves.
    mockedFetch
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([makeEmployee()])
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => {
      result.current.retry()
    })
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.employees).toHaveLength(1)
  })

  it('reconciles the active page when the dataset shrinks below it', async () => {
    const many = Array.from(
      { length: 30 },
      (_, index) => makeEmployee({ id: index + 1 }),
    )
    mockedFetch.mockResolvedValue(many)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.totalPages).toBe(2)

    act(() => {
      result.current.goToPage(2)
    })
    expect(result.current.currentPage).toBe(2)
    expect(result.current.pageEmployees[0]?.id).toBe(26)

    mockedDelete.mockResolvedValue(undefined)
    await act(async () => {
      for (const id of [26, 27, 28, 29, 30]) await result.current.removeEmployee(id)
    })
    await waitFor(() => expect(result.current.employees).toHaveLength(25))
    expect(result.current.currentPage).toBe(1)
    expect(result.current.showingLabel).toBe('Showing 1–25 of 25')
  })

  it('serves departments derived from the dataset', async () => {
    mockedFetch.mockResolvedValue([
      makeEmployee({ department: 'Support' }),
      makeEmployee({ id: 2, department: 'Engineering' }),
      makeEmployee({ id: 3, department: 'Support' }),
    ])
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.departments).toEqual(['Engineering', 'Support'])
  })

  it('appends created records into the cached dataset', async () => {
    mockedFetch.mockResolvedValue([makeEmployee()])
    mockedCreate.mockResolvedValue(makeEmployee({ id: 99, ...newEmployeeInput }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('success'))

    await act(async () => {
      await result.current.addEmployee(newEmployeeInput)
    })
    expect(result.current.employees).toHaveLength(2)
    expect(result.current.employees[1]).toMatchObject({ id: 99, firstName: 'Grace' })
  })

  it('maps updates into the cached dataset', async () => {
    mockedFetch.mockResolvedValue([makeEmployee()])
    mockedUpdate.mockResolvedValue(
      makeEmployee({ firstName: 'Updated', role: 'Staff Engineer' }),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('success'))

    await act(async () => {
      await result.current.updateEmployee(1, { ...newEmployeeInput, firstName: 'Updated' })
    })
    expect(result.current.employees[0]).toMatchObject({
      firstName: 'Updated',
      role: 'Staff Engineer',
    })
  })

  it('removes deleted records and tracks the deleting id', async () => {
    mockedFetch.mockResolvedValue([makeEmployee(), makeEmployee({ id: 2 })])
    // Keep the request pending so the in-flight state is observable.
    let settleDelete!: () => void
    mockedDelete.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          settleDelete = resolve
        }),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('success'))

    let pending: Promise<void>
    act(() => {
      pending = result.current.removeEmployee(2)
    })
    await waitFor(() => expect(result.current.isDeleting).toBe(true))
    expect(result.current.deletingId).toBe(2)

    await act(async () => {
      settleDelete()
      await pending
    })
    await waitFor(() => expect(result.current.employees.map((e) => e.id)).toEqual([1]))
    expect(result.current.isDeleting).toBe(false)
    expect(result.current.deletingId).toBeNull()
  })

  it('keeps the modal action error surfaced when a mutation fails', async () => {
    mockedFetch.mockResolvedValue([makeEmployee()])
    mockedCreate.mockRejectedValue(new Error('Could not add the record.'))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEmployees(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('success'))

    let failure: unknown
    await act(async () => {
      try {
        await result.current.addEmployee(newEmployeeInput)
      } catch (error) {
        failure = error
      }
    })
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe('Could not add the record.')
    await waitFor(() =>
      expect(result.current.actionError).toBe('Could not add the record.'),
    )

    act(() => {
      result.current.clearActionError()
    })
    await waitFor(() => expect(result.current.actionError).toBeNull())
  })
})