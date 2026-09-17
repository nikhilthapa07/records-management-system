import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NewEmployee } from '../../types/employee'
import { EmployeeForm } from '../EmployeeForm'

function renderForm(overrides: Partial<Parameters<typeof EmployeeForm>[0]> = {}) {
  const onSubmit = vi
    .fn<(values: NewEmployee) => Promise<void>>()
    .mockResolvedValue(undefined)
  const onCancel = vi.fn()
  const view = render(
    <EmployeeForm
      mode="create"
      departments={['Engineering', 'Support']}
      isSubmitting={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  const form = view.container.querySelector('form') as HTMLFormElement
  return { onSubmit, onCancel, form, ...view }
}

function fillRequiredFields(values: Partial<NewEmployee>) {
  if (values.firstName !== undefined) {
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: values.firstName },
    })
  }
  if (values.lastName !== undefined) {
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: values.lastName },
    })
  }
  if (values.email !== undefined) {
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: values.email },
    })
  }
  if (values.department !== undefined) {
    fireEvent.change(screen.getByLabelText('Department'), {
      target: { value: values.department },
    })
  }
  if (values.role !== undefined) {
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: values.role },
    })
  }
}

describe('EmployeeForm', () => {
  it('shows five field errors and does not submit on an empty form', async () => {
    const { onSubmit, form } = renderForm()
    fireEvent.submit(form)
    await waitFor(() =>
      expect(screen.getAllByText(/must not be empty/)).toHaveLength(5),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('flags an invalid email alongside valid required fields', async () => {
    const { onSubmit, form } = renderForm()
    fillRequiredFields({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'not-an-email',
      department: 'Engineering',
      role: 'Developer',
    })
    fireEvent.submit(form)
    await waitFor(() =>
      expect(screen.getByText(/Enter a valid email address/)).toBeInTheDocument(),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits sanitized values on a valid create', async () => {
    const { onSubmit, form } = renderForm()
    fillRequiredFields({
      firstName: '  Ada  ',
      lastName: 'Lovelace',
      email: 'ADA@Example.com',
      department: 'Engineering',
      role: 'Developer',
    })
    fireEvent.submit(form)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      department: 'Engineering',
      role: 'Developer',
      status: 'Active',
    })
  })

  it('prefills values and labels the submit button in edit mode', async () => {
    const { onSubmit, form } = renderForm({
      mode: 'edit',
      initialValues: {
        id: 7,
        firstName: 'Charles',
        lastName: 'Babbage',
        email: 'charles@example.com',
        department: 'Engineering',
        role: 'Engineer',
        status: 'Inactive',
      },
    })
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe(
      'Charles',
    )
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe(
      'Inactive',
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()

    fireEvent.submit(form)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'charles@example.com', status: 'Inactive' }),
    )
  })

  it('calls onCancel when the Cancel button is clicked', () => {
    const { onCancel } = renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables controls while submitting', () => {
    renderForm({ isSubmitting: true })
    expect(screen.getByRole('button', { name: /Saving…/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})