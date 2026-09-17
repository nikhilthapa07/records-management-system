import type { Employee } from '../types/employee'

/**
 * Export utilities for the currently visible (filtered) dataset.
 *
 * Security: CSV export neutralises spreadsheet formula injection — cells that
 * begin with =, +, -, or @ are prefixed with a single quote so a spreadsheet
 * app treats them as text rather than executing them as formulas.
 */

const FORMULA_SIGNS = ['=', '+', '-', '@']
const COMMA_QUOTE_OR_NEWLINE = /[",\r\n]/

function neutralizeFormula(value: string): string {
  const trimmed = value.trim()
  if (FORMULA_SIGNS.some((sign) => trimmed.startsWith(sign))) {
    return `'${value}`
  }
  return value
}

function csvEscape(value: string): string {
  // RFC 4180: fields containing commas, quotes or newlines must be quoted.
  if (COMMA_QUOTE_OR_NEWLINE.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsvRow(values: string[]): string {
  return values.map((value) => csvEscape(neutralizeFormula(value))).join(',')
}

function buildCsv(employees: Employee[]): string {
  const header: string[] = [
    'ID',
    'First Name',
    'Last Name',
    'Email',
    'Department',
    'Role',
    'Status',
  ]
  const rows = employees.map((employee) => [
    String(employee.id),
    employee.firstName,
    employee.lastName,
    employee.email,
    employee.department,
    employee.role,
    employee.status,
  ])
  return [toCsvRow(header), ...rows.map(toCsvRow)].join('\r\n')
}

function triggerDownload(content: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  // Keep the element out of the document flow — it is only a download trigger.
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function exportCsv(employees: Employee[]): void {
  triggerDownload(buildCsv(employees), 'employees.csv', 'text/csv;charset=utf-8')
}

export function exportJson(employees: Employee[]): void {
  const serialized = JSON.stringify(employees, null, 2)
  triggerDownload(serialized, 'employees.json', 'application/json')
}