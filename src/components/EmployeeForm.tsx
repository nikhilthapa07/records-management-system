import { useState } from 'react'
import type {
  Employee,
  EmployeeFormErrors,
  EmployeeStatus,
  NewEmployee,
} from '../types/employee'
import { sanitizeEmail, sanitizeText } from '../utils/sanitize'

interface EmployeeFormProps {
  mode: 'create' | 'edit'
  initialValues?: Employee | null
  departments: string[]
  isSubmitting: boolean
  onSubmit: (values: NewEmployee) => Promise<void>
  onCancel: () => void
}

interface FormValues {
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  status: EmployeeStatus
}

const inputClass = (invalid: boolean) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 ${
    invalid
      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
      : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
  }`

function errorTextFor(value: string, field: string): string | undefined {
  try {
    sanitizeText(value, field)
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid value.'
  }
}

export function EmployeeForm(props: EmployeeFormProps) {
  const { mode, initialValues, departments, isSubmitting, onSubmit, onCancel } = props

  const [values, setValues] = useState<FormValues>({
    firstName: initialValues?.firstName ?? '',
    lastName: initialValues?.lastName ?? '',
    email: initialValues?.email ?? '',
    department: initialValues?.department ?? '',
    role: initialValues?.role ?? '',
    status: initialValues?.status ?? 'Active',
  })
  const [errors, setErrors] = useState<EmployeeFormErrors>({})

  const updateField = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: EmployeeFormErrors = {}

    const firstNameError = errorTextFor(values.firstName, 'First name')
    const lastNameError = errorTextFor(values.lastName, 'Last name')
    const departmentError = errorTextFor(values.department, 'Department')
    const roleError = errorTextFor(values.role, 'Role')

    if (firstNameError) nextErrors.firstName = firstNameError
    if (lastNameError) nextErrors.lastName = lastNameError
    if (departmentError) nextErrors.department = departmentError
    if (roleError) nextErrors.role = roleError

    let email = ''
    try {
      email = sanitizeEmail(values.email)
    } catch (error) {
      nextErrors.email = error instanceof Error ? error.message : 'Invalid email.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    await onSubmit({
      firstName: sanitizeText(values.firstName, 'First name'),
      lastName: sanitizeText(values.lastName, 'Last name'),
      email,
      department: sanitizeText(values.department, 'Department'),
      role: sanitizeText(values.role, 'Role'),
      status: values.status,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="first-name" className="mb-1 block text-sm font-medium text-slate-700">
            First name
          </label>
          <input
            id="first-name"
            type="text"
            autoComplete="given-name"
            value={values.firstName}
            onChange={(event) => updateField('firstName', event.target.value)}
            className={inputClass(Boolean(errors.firstName))}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? 'first-name-error' : undefined}
            maxLength={100}
          />
          {errors.firstName && (
            <p id="first-name-error" className="mt-1 text-xs text-red-600">
              {errors.firstName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="last-name" className="mb-1 block text-sm font-medium text-slate-700">
            Last name
          </label>
          <input
            id="last-name"
            type="text"
            autoComplete="family-name"
            value={values.lastName}
            onChange={(event) => updateField('lastName', event.target.value)}
            className={inputClass(Boolean(errors.lastName))}
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? 'last-name-error' : undefined}
            maxLength={100}
          />
          {errors.lastName && (
            <p id="last-name-error" className="mt-1 text-xs text-red-600">
              {errors.lastName}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => updateField('email', event.target.value)}
          className={inputClass(Boolean(errors.email))}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          maxLength={100}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-red-600">
            {errors.email}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="department" className="mb-1 block text-sm font-medium text-slate-700">
            Department
          </label>
          <input
            id="department"
            type="text"
            list="department-options"
            value={values.department}
            onChange={(event) => updateField('department', event.target.value)}
            className={inputClass(Boolean(errors.department))}
            aria-invalid={Boolean(errors.department)}
            aria-describedby={errors.department ? 'department-error' : undefined}
            maxLength={100}
            autoComplete="off"
          />
          <datalist id="department-options">
            {departments.map((department) => (
              <option key={department} value={department} />
            ))}
          </datalist>
          {errors.department && (
            <p id="department-error" className="mt-1 text-xs text-red-600">
              {errors.department}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
            Role
          </label>
          <input
            id="role"
            type="text"
            value={values.role}
            onChange={(event) => updateField('role', event.target.value)}
            className={inputClass(Boolean(errors.role))}
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? 'role-error' : undefined}
            maxLength={100}
            autoComplete="off"
          />
          {errors.role && (
            <p id="role-error" className="mt-1 text-xs text-red-600">
              {errors.role}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">
          Status
        </label>
        <select
          id="status"
          value={values.status}
          onChange={(event) => updateField('status', event.target.value)}
          className={inputClass(false)}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add employee'}
        </button>
      </div>
    </form>
  )
}