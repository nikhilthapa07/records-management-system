import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FilterPanel } from '../FilterPanel'

const departments = ['Engineering', 'Support', 'Human Resources']

function renderPanel(
  selectedDepartments: string[] = [],
  onToggle = vi.fn(),
  onClear = vi.fn(),
) {
  return render(
    <FilterPanel
      departments={departments}
      selectedDepartments={selectedDepartments}
      onToggle={onToggle}
      onClear={onClear}
    />,
  )
}

describe('FilterPanel', () => {
  it('opens the panel and lists every department as an option', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /Departments/i }))
    expect(screen.getByText('Filter by department')).toBeInTheDocument()
    for (const department of departments) {
      expect(screen.getByRole('option', { name: department })).toBeInTheDocument()
    }
  })

  it('toggles a department and reflects the selection', () => {
    const onToggle = vi.fn()
    const { rerender } = renderPanel([], onToggle)
    fireEvent.click(screen.getByRole('button', { name: /Departments/i }))
    fireEvent.click(screen.getByRole('option', { name: 'Support' }))
    expect(onToggle).toHaveBeenCalledWith('Support')

    rerender(
      <FilterPanel
        departments={departments}
        selectedDepartments={['Support']}
        onToggle={onToggle}
        onClear={vi.fn()}
      />,
    )
    expect(screen.getByRole('option', { name: 'Support' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('button', { name: /Departments/i })).toHaveTextContent('1')
  })

  it('selects only the unchecked departments via Select all', () => {
    const onToggle = vi.fn()
    renderPanel(['Engineering'], onToggle)
    fireEvent.click(screen.getByRole('button', { name: /Departments/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }))
    expect(onToggle).toHaveBeenCalledWith('Support')
    expect(onToggle).toHaveBeenCalledWith('Human Resources')
    expect(onToggle).not.toHaveBeenCalledWith('Engineering')
  })

  it('offers Clear all when every department is selected', () => {
    const onClear = vi.fn()
    renderPanel(departments, vi.fn(), onClear)
    fireEvent.click(screen.getByRole('button', { name: /Departments/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('closes the panel when clicking outside', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /Departments/i }))
    expect(screen.getByText('Filter by department')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Filter by department')).not.toBeInTheDocument()
  })
})