import { useState, type SubmitEventHandler } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Input } from '@support-desk/ui'
import { toErrorMessage } from '@/lib/api/http'
import { AuthCard } from './AuthCard'
import { NEXT_PARAM, safeNextPath } from './nextPath'
import { useSession } from './useSession'
import { useSignIn } from './useSignIn'

interface FormValues {
  email: string
  password: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const emptyValues: FormValues = { email: '', password: '' }

/**
 * Only the two things that make the request impossible to send.
 *
 * Nothing here checks the shape of the password. The rules belong to
 * registration; applying them at sign-in would tell whoever typed a short one
 * that it cannot be anybody's password here, which is a fact about the accounts
 * on this server and not one to hand out.
 */
function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (values.email.trim() === '') {
    errors.email = 'Enter your email address.'
  }

  if (values.password === '') {
    errors.password = 'Enter your password.'
  }

  return errors
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const session = useSession()
  const signIn = useSignIn()
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [errors, setErrors] = useState<FormErrors>({})

  const next = safeNextPath(searchParams.get(NEXT_PARAM))

  // Already signed in — arriving here from a bookmark, or from the back button
  // after signing in. There is nothing to ask for.
  if (session.isSuccess) {
    return <Navigate to={next} replace />
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    signIn.mutate(
      { email: values.email.trim(), password: values.password },
      { onSuccess: () => navigate(next, { replace: true }) },
    )
  }

  return (
    <AuthCard
      title="Sign in"
      description="Sign in to work the support queue."
      error={
        signIn.isError ? toErrorMessage(signIn.error, 'Could not sign you in.') : null
      }
      submitLabel="Sign in"
      pendingLabel="Signing in…"
      isPending={signIn.isPending}
      onSubmit={handleSubmit}
      footer={<>No account yet? <Link to="/register">Create one</Link>.</>}
    >
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
        autoComplete="current-password"
        value={values.password}
        error={errors.password}
        onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
      />
    </AuthCard>
  )
}
