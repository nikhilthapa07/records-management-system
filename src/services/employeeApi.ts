import type { Employee, NewEmployee } from '../types/employee'

/**
 * API service layer — the only place fetch calls may live.
 *
 * Data source: DummyJSON (public REST API) which returns a large, real dataset
 * (~160 users) with department + role fields and supports POST / DELETE, so the
 * app can demonstrate genuine CRUD against an external service. The base URL is
 * configured via environment variables (no credentials / secrets in code).
 */

const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'https://dummyjson.com'

const USERS_ENDPOINT = `?limit=160&select=id,firstName,lastName,email,company`

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch {
    throw new ApiError('Network error — check your connection and try again.', 0)
  }

  if (!response.ok) {
    throw new ApiError(
      `The request failed (${response.status}). Please try again.`,
      response.status,
    )
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('The server returned an unreadable response.', response.status)
  }
}

interface DummyCompany {
  department?: string | null
  title?: string | null
}

interface DummyUser {
  id?: number
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  company?: DummyCompany | null
}

interface DummyUserResponse {
  users?: DummyUser[]
}

function normalizeUser(user: DummyUser, index: number): Employee | null {
  const id = typeof user.id === 'number' ? user.id : NaN
  const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : ''
  const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : ''
  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  const department =
    typeof user.company?.department === 'string' && user.company.department.trim()
      ? user.company.department.trim()
      : 'General'
  const role =
    typeof user.company?.title === 'string' && user.company.title.trim()
      ? user.company.title.trim()
      : 'Employee'

  // Drop malformed / untrusted records rather than rendering them.
  if (!Number.isFinite(id) || !firstName || !lastName || !email) {
    return null
  }

  // DummyJSON has no status field — derive deterministically so the dataset is
  // mixed and stable across reloads.
  const status = (index + 1) % 6 === 0 ? 'Inactive' : 'Active'

  return { id, firstName, lastName, email, department, role, status }
}

export async function fetchEmployees(): Promise<Employee[]> {
  const response = await request<DummyUserResponse>(
    `${API_BASE_URL}/users${USERS_ENDPOINT}`,
  )
  if (!Array.isArray(response?.users)) {
    throw new ApiError('The server returned an unexpected data shape.', 500)
  }
  const employees = response.users
    .map((user, index) => normalizeUser(user, index))
    .filter((employee): employee is Employee => employee !== null)
  return employees
}

export async function createEmployee(input: NewEmployee): Promise<Employee> {
  const response = await request<DummyUser & { id?: number }>(
    `${API_BASE_URL}/users/add`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        company: {
          department: input.department,
          title: input.role,
        },
      }),
    },
  )

  if (typeof response?.id !== 'number') {
    throw new ApiError('The server did not confirm the new record.', 500)
  }

  return {
    id: response.id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    department: input.department,
    role: input.role,
    status: input.status,
  }
}

export async function updateEmployee(
  id: number,
  input: NewEmployee,
): Promise<Employee> {
  let response: DummyUser & { id?: number }
  try {
    response = await request<DummyUser & { id?: number }>(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        company: {
          department: input.department,
          title: input.role,
        },
      }),
    })
  } catch (error) {
    // Records created earlier in this session may not be known to the mock
    // server, so a PUT can 404. Keep the local dataset coherent instead of
    // surfacing a confusing error for a change we already have client-side.
    if (error instanceof ApiError && error.status === 404) {
      return {
        id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        department: input.department,
        role: input.role,
        status: input.status,
      }
    }
    throw error
  }

  if (typeof response?.id !== 'number') {
    throw new ApiError('The server did not confirm the changes.', 500)
  }

  return {
    id: response.id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    department: input.department,
    role: input.role,
    status: input.status,
  }
}

export async function deleteEmployee(id: number): Promise<void> {
  try {
    await request<unknown>(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' })
  } catch (error) {
    // Treat "not found" as already-deleted so local state can still be cleaned
    // up (server mock may not know about locally-created records).
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error
    }
  }
}