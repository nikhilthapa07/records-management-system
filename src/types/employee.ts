export type EmployeeStatus = 'Active' | 'Inactive'

export interface Employee {
  id: number
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  status: EmployeeStatus
}

export type NewEmployee = Omit<Employee, 'id'>

export interface EmployeeFormState extends Record<keyof NewEmployee, string> {
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  status: EmployeeStatus
}

export interface EmployeeFormErrors {
  firstName?: string
  lastName?: string
  email?: string
  department?: string
  role?: string
}

export type TableStatus = 'loading' | 'success' | 'error'

export interface EmployeesState {
  employees: Employee[]
  status: TableStatus
  error: string | null
}