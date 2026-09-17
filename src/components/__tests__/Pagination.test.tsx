import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from '../Pagination'

function renderPagination(
  currentPage: number,
  totalPages: number,
  onChange = vi.fn(),
) {
  return {
    onChange,
    ...render(
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onChange}
        showingLabel={`Showing 1 of ${totalPages}`}
      />,
    ),
  }
}

describe('Pagination', () => {
  it('renders the showing label', () => {
    renderPagination(2, 10)
    expect(screen.getByText('Showing 1 of 10')).toBeInTheDocument()
  })

  it('calls onPageChange with the clicked page', () => {
    const { onChange } = renderPagination(3, 10)
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('disables Prev on the first page and Next on the last page', () => {
    const { rerender } = render(
      <Pagination
        currentPage={1}
        totalPages={10}
        onPageChange={vi.fn()}
        showingLabel="x"
      />,
    )
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()

    rerender(
      <Pagination
        currentPage={10}
        totalPages={10}
        onPageChange={vi.fn()}
        showingLabel="x"
      />,
    )
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('jumps to the clamped page from the input', () => {
    const { onChange } = renderPagination(1, 8)
    fireEvent.change(screen.getByLabelText('Page number'), {
      target: { value: '999' },
    })
    fireEvent.submit(screen.getByRole('form', { name: 'Jump to page' }))
    expect(onChange).toHaveBeenCalledWith(8)
  })

  it('shows an ellipsis for a large page range', () => {
    renderPagination(1, 10)
    expect(screen.getByText('…')).toBeInTheDocument()
  })
})