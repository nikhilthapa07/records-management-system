import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clamp, debounce } from '../helpers'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays invocation until the quiet period elapses', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 400)
    debounced('a')
    vi.advanceTimersByTime(399)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('coalesces rapid calls into a single trailing invocation', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 400)
    debounced(1)
    debounced(2)
    debounced(3)
    vi.advanceTimersByTime(400)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(3)
  })

  it('can be cancelled before the timer fires', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 400)
    debounced(1)
    debounced.cancel()
    vi.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()
  })

  it('delivers the latest arguments after a restart', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 400)
    debounced('first')
    vi.advanceTimersByTime(200)
    debounced('second')
    vi.advanceTimersByTime(400)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
  })
})

describe('clamp', () => {
  it('returns the value when inside bounds', () => {
    expect(clamp(5, 1, 10)).toBe(5)
  })

  it('clamps below the min', () => {
    expect(clamp(0, 1, 10)).toBe(1)
  })

  it('clamps above the max', () => {
    expect(clamp(99, 1, 10)).toBe(10)
  })
})