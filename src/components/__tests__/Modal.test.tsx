import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from '../Modal'

describe('Modal', () => {
  it('renders into the document body with the provided title', () => {
    render(
      <Modal title="Add employee" onClose={vi.fn()}>
        <p>form content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Add employee' })).toBeInTheDocument()
    expect(screen.getByText('form content')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal title="t" onClose={onClose}>
        <p>c</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes via the close button and focuses it on mount', () => {
    const onClose = vi.fn()
    render(
      <Modal title="t" onClose={onClose}>
        <p>c</p>
      </Modal>,
    )
    const closeButton = screen.getByLabelText('Close dialog')
    expect(closeButton).toHaveFocus()
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the overlay is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal title="t" onClose={onClose}>
        <p>c</p>
      </Modal>,
    )
    const overlay = [...document.querySelectorAll<HTMLElement>('div')].find((el) =>
      el.className.includes('bg-slate-900'),
    )
    expect(overlay).toBeDefined()
    fireEvent.click(overlay as HTMLElement)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('locks and then restores body scroll', () => {
    const { unmount } = render(
      <Modal title="t" onClose={vi.fn()}>
        <p>c</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})