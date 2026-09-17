import { describe, expect, it } from 'vitest'
import { sanitizeEmail, sanitizeText } from '../sanitize'

describe('sanitizeEmail', () => {
  it('accepts a valid email and lowercases it', () => {
    expect(sanitizeEmail('Ada@Example.com')).toBe('ada@example.com')
  })

  it('rejects a string without @', () => {
    expect(() => sanitizeEmail('not-an-email')).toThrow(/valid email/)
  })

  it('rejects a one-part domain', () => {
    expect(() => sanitizeEmail('a@b')).toThrow(/valid email/)
  })

  it('rejects empty, null and whitespace input', () => {
    expect(() => sanitizeEmail('   ')).toThrow(/must not be empty/)
    expect(() => sanitizeEmail(null)).toThrow(/must not be empty/)
    expect(() => sanitizeEmail(undefined)).toThrow(/must not be empty/)
  })

  it('strips control characters before validation', () => {
    expect(sanitizeEmail('ada\u0007@example.com')).toBe('ada@example.com')
  })
})

describe('sanitizeText', () => {
  it('strips ASCII control characters', () => {
    expect(sanitizeText('Ada\u0000\u0007 Lovelace')).toBe('Ada Lovelace')
  })

  it('strips zero-width, BOM and non-breaking space characters', () => {
    // Ignorable whitespace is removed entirely, so the words join together.
    expect(sanitizeText('Ada\u200b\uFEFF\u00A0Lovelace')).toBe('AdaLovelace')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeText('  Ada  ')).toBe('Ada')
  })

  it('accepts up to 100 characters', () => {
    expect(sanitizeText('x'.repeat(100))).toHaveLength(100)
  })

  it('rejects over-length input with a clear message', () => {
    expect(() => sanitizeText('x'.repeat(101))).toThrow(/at most 100 characters/)
  })

  it('uses the field name in error messages', () => {
    expect(() => sanitizeText('', 'First name')).toThrow(
      'First name must not be empty.',
    )
  })

  it('treats non-string input as empty', () => {
    expect(() => sanitizeText(42)).toThrow(/must not be empty/)
  })
})