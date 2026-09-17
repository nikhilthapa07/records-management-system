/**
 * Sanitization helpers — all API and user input should be treated as untrusted.
 *
 * React escapes injected HTML by default, but these helpers add defense-in-depth:
 * strip control characters / dangerous patterns, and coerce fields into the
 * narrow types the domain expects.
 */

const MAX_LENGTH = 100
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Returns true for characters that should never appear in user-entered text:
 * ASCII control characters and common zero-width / invisible whitespace.
 * Implemented without control-character regex literals for lint safety.
 */
function isIgnorableCode(code: number): boolean {
  return (
    code < 32 ||
    code === 127 ||
    code === 0x00a0 || // non-breaking space
    code === 0x200b || // zero-width space
    code === 0xfeff // BOM / zero-width non-breaking space
  )
}

function stripControlCharacters(value: string): string {
  return Array.from(value)
    .filter((char) => !isIgnorableCode(char.charCodeAt(0)))
    .join('')
}

export function sanitizeText(raw: unknown, field = 'value'): string {
  const value = typeof raw === 'string' ? raw : ''
  const cleaned = stripControlCharacters(value).trim()
  if (cleaned.length === 0) {
    throw new Error(`${field} must not be empty.`)
  }
  if (cleaned.length > MAX_LENGTH) {
    throw new Error(`${field} must be at most ${MAX_LENGTH} characters.`)
  }
  return cleaned
}

export function sanitizeEmail(raw: unknown): string {
  const email = sanitizeText(raw, 'Email')
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('Enter a valid email address, e.g. name@company.com.')
  }
  return email.toLowerCase()
}