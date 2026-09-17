import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Employee } from '../../types/employee'
import { exportCsv, exportJson } from '../exportUtils'

const makeEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 1,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  department: 'Engineering',
  role: 'Developer',
  status: 'Active',
  ...overrides,
})

let capturedBlob: Blob | null = null

beforeEach(() => {
  capturedBlob = null
  // jsdom does not implement object URLs — stub them and capture the payload.
  const createObjectURL = vi.fn((blob: Blob) => {
    capturedBlob = blob
    return 'blob:test'
  })
  const revokeObjectURL = vi.fn()
  vi.stubGlobal(
    'URL',
    new Proxy(URL, {
      get(target, prop, receiver) {
        if (prop === 'createObjectURL') return createObjectURL
        if (prop === 'revokeObjectURL') return revokeObjectURL
        return Reflect.get(target, prop, receiver)
      },
    }),
  )
  // Prevent jsdom's "navigation to another Document" noise on anchor.click().
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('exportCsv', () => {
  it('emits a header row', async () => {
    exportCsv([makeEmployee()])
    const csv = await capturedBlob?.text()
    expect(csv?.split('\r\n')[0]).toBe('ID,First Name,Last Name,Email,Department,Role,Status')
  })

  it('neutralises = formula injection at the start of a cell', async () => {
    exportCsv([makeEmployee({ id: 1, firstName: "=cmd|' /C calc'!A0" })])
    const csv = await capturedBlob?.text()
    expect(csv).toContain("'=cmd|")
    expect(csv).not.toContain('\r\n1,=cmd|')
  })

  it('neutralises - and @ formula injection', async () => {
    exportCsv([
      makeEmployee({
        lastName: '-2+3',
        email: '+SUM(A1)@x.com',
      }),
    ])
    const csv = await capturedBlob?.text()
    expect(csv).toContain("-2+3,")
    expect(csv).toContain("'+SUM(A1)@x.com,")
  })

  it('neutralises + formula injection on department', async () => {
    exportCsv([makeEmployee({ department: '@SUM(A1)' })])
    const csv = await capturedBlob?.text()
    expect(csv).toContain("'@SUM(A1),")
  })

  it('quotes fields containing commas per RFC 4180', async () => {
    exportCsv([makeEmployee({ role: 'Developer, Senior' })])
    const csv = await capturedBlob?.text()
    expect(csv).toContain('"Developer, Senior"')
  })

  it('quotes and doubles embedded double quotes', async () => {
    exportCsv([makeEmployee({ role: 'He said "hi"' })])
    const csv = await capturedBlob?.text()
    expect(csv).toContain('"He said ""hi"""')
  })

  it('emits one data row per employee', async () => {
    const employees = Array.from({ length: 160 }, (_, index) =>
      makeEmployee({ id: index + 1 }),
    )
    exportCsv(employees)
    const csv = await capturedBlob?.text()
    expect(csv?.split('\r\n').filter(Boolean)).toHaveLength(161)
  })

  it('still writes the header when the dataset is empty', async () => {
    exportCsv([])
    const csv = await capturedBlob?.text()
    expect(csv).toBe('ID,First Name,Last Name,Email,Department,Role,Status')
  })
})

describe('exportJson', () => {
  it('serialises the employees as a JSON array', async () => {
    const employees = [makeEmployee(), makeEmployee({ id: 2, lastName: 'Babbage' })]
    exportJson(employees)
    const parsed = JSON.parse((await capturedBlob?.text()) ?? '')
    expect(parsed).toHaveLength(2)
    expect(parsed[1]).toMatchObject({ id: 2, lastName: 'Babbage' })
  })
})