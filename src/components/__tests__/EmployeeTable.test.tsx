import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Employee } from '../../types/employee'
import { EmployeeTable } from '../EmployeeTable'

// jsdom has no layout engine, so the virtualizer measures 0-sized boxes. Give
// every element a plausible viewport so react-window computes a visible window.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    value: 900,
  })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 640,
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    value: 900,
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    value: 640,
  })
})

const makeEmployee = (id: number): Employee => ({
  id,
  firstName: `First${id}`,
  lastName: `Last${id}`,
  email: `first${id}@example.com`,
  department: 'Engineering',
  role: 'Developer',
  status: 'Active',
})

const makeMany = (count: number): Employee[] =>
  Array.from({ length: count }, (_, index) => makeEmployee(index + 1))

function renderTable(
  props: Partial<Parameters<typeof EmployeeTable>[0]> = {},
  employees: Employee[],
) {
  return render(
    <EmployeeTable
      employees={employees}
      status="success"
      error={null}
      hasActiveFilters={false}
      onRetry={vi.fn()}
      onClearFilters={vi.fn()}
      onAdd={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      isDeleting={false}
      deletingId={null}
      {...props}
    />,
  )
}

describe('EmployeeTable', () => {
  it('renders the loading state', () => {
    renderTable({ status: 'loading' }, [])
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading employee records')).toBeInTheDocument()
  })

  it('renders the error state with a user-friendly message and retry', () => {
    const onRetry = vi.fn()
    renderTable({ status: 'error', error: 'The request failed (500).', onRetry }, [])
    expect(screen.getByText("We couldn’t load employee records")).toBeInTheDocument()
    expect(screen.getByText('The request failed (500).')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders the empty state with an add action when there are no filters', () => {
    const onAdd = vi.fn()
    renderTable({ onAdd }, [])
    expect(screen.getByText('No employees yet')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('renders the no-results state with a clear action when filters hide everything', () => {
    const onClearFilters = vi.fn()
    renderTable({ hasActiveFilters: true, onClearFilters }, [])
    expect(screen.getByText('No matching records')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })

  it('renders the header and only a virtualized subset of the rows', () => {
    renderTable({}, makeMany(100))
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()

    const rows = document.querySelectorAll('[role="listitem"]')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThan(100)
  })

  it('wires up Edit and Delete actions via accessible labels', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderTable({ onEdit, onDelete }, makeMany(10))

    fireEvent.click(screen.getByLabelText('Edit First3 Last3'))
    expect(onEdit).toHaveBeenCalledWith(3)

    fireEvent.click(screen.getByLabelText('Delete First4 Last4'))
    expect(onDelete).toHaveBeenCalledWith(4)
  })

  it('disables actions while a deletion is in flight', () => {
    renderTable({ isDeleting: true, deletingId: 2 }, makeMany(5))
    expect(screen.getByLabelText('Delete First2 Last2')).toBeDisabled()
    expect(screen.getByLabelText('Edit First2 Last2')).toBeEnabled()
  })
})