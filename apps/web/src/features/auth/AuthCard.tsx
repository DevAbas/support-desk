import type { ReactNode, SubmitEventHandler } from 'react'
import { Alert, Button, Card, CardBody, CardFooter, CardHeader, Heading, Text } from '@support-desk/ui'

interface AuthCardProps {
  title: string
  description: string
  /** The server's refusal, already turned into a sentence. Null when there is none. */
  error: string | null
  submitLabel: string
  pendingLabel: string
  isPending: boolean
  onSubmit: SubmitEventHandler<HTMLFormElement>
  /** The way to the other page: register from login, and back again. */
  footer: ReactNode
  children: ReactNode
}

/**
 * The frame both authentication screens sit in.
 *
 * They are outside the app shell — no header, no nav — because there is nothing
 * to navigate to yet, and a sidebar linking to four screens that will all bounce
 * you back here is a menu of dead ends.
 *
 * Extracted because the two pages differ by three fields and a verb, and the
 * alternative was the same card, the same centring and the same error band
 * written twice and then maintained twice.
 */
export function AuthCard({
  title,
  description,
  error,
  submitLabel,
  pendingLabel,
  isPending,
  onSubmit,
  footer,
  children,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <Heading level="page">Support Desk</Heading>
          <Text tone="muted">{description}</Text>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <Card>
            <CardHeader title={title} level="section" />

            {error ? (
              <Alert tone="danger" variant="band">
                {error}
              </Alert>
            ) : null}

            <CardBody className="flex flex-col gap-4">{children}</CardBody>

            <CardFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? pendingLabel : submitLabel}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <Text tone="muted" className="text-center">
          {footer}
        </Text>
      </div>
    </div>
  )
}
