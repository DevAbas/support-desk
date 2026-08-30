import { useState, type SubmitEventHandler } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Input } from '@harness-sample/ui'
import { MIN_PASSWORD_LENGTH } from '@harness-sample/shared'
import { toErrorMessage } from '@/lib/api/http'
import { AuthCard } from './AuthCard'
import { DEFAULT_LANDING } from './nextPath'
import { useSession } from './useSession'
import { useSignUp } from './useSignUp'

interface FormValues {
  name: string
  email: string
  password: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const emptyValues: FormValues = { name: '', email: '', password: '' }

/**
 * The same bounds `registerBodySchema` enforces, said in sentences.
 *
 * The server is still the boundary — this runs so that a correctable mistake is
 * corrected without a round trip, not so that the server can trust the browser.
 */
function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (values.name.trim() === '') {
    errors.name = 'Enter your name so your colleagues know who is on a ticket.'
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${String(MIN_PASSWORD_LENGTH)} characters.`
  }

  return errors
}

export function RegisterPage() {
  const navigate = useNavigate()
  const session = useSession()
  const signUp = useSignUp()
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [errors, setErrors] = useState<FormErrors>({})

  if (session.isSuccess) {
    return <Navigate to={DEFAULT_LANDING} replace />
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    signUp.mutate(
      {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      },
      { onSuccess: () => navigate(DEFAULT_LANDING, { replace: true }) },
    )
  }

  return (
    <AuthCard
      title="Create an account"
      description="New here? Set up an account to work the support queue."
      error={signUp.isError ? toErrorMessage(signUp.error, 'Could not create your account.') : null}
      submitLabel="Create account"
      pendingLabel="Creating account…"
      isPending={signUp.isPending}
      onSubmit={handleSubmit}
      footer={<>Already have an account? <Link to="/login">Sign in</Link>.</>}
    >
      <Input
        label="Name"
        autoComplete="name"
        value={values.name}
        error={errors.name}
        onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="username"
        value={values.email}
        error={errors.email}
        onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        value={values.password}
        error={errors.password}
        hint={`At least ${String(MIN_PASSWORD_LENGTH)} characters.`}
        onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
      />
    </AuthCard>
  )
}
