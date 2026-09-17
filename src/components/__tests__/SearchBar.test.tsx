import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchBar } from '../SearchBar'

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not emit while typing and fires once after the debounce window', () => {
    const onChange = vi.fn()
    render(<SearchBar onSearchChange={onChange} />)
    const input = screen.getByRole('searchbox')

    fireEvent.change(input, { target: { value: 'ada' } })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(onChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('ada')
  })

  it('coalesces rapid typing into a single trailing call', () => {
    const onChange = vi.fn()
    render(<SearchBar onSearchChange={onChange} />)
    const input = screen.getByRole('searchbox')

    for (const value of ['a', 'ad', 'ada', 'ada l']) {
      fireEvent.change(input, { target: { value } })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('ada l')
  })

  it('cancels the pending call on unmount', () => {
    const onChange = vi.fn()
    const { unmount } = render(<SearchBar onSearchChange={onChange} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ada' } })
    unmount()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clear button notifies an empty query after the debounce window', () => {
    const onChange = vi.fn()
    render(<SearchBar onSearchChange={onChange} />)
    const input = screen.getByRole('searchbox')

    fireEvent.change(input, { target: { value: 'ada' } })
    fireEvent.click(screen.getByLabelText('Clear search'))
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(onChange).toHaveBeenCalledWith('')
  })
})