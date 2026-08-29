import { useState, type FormEvent } from 'react'
import { Button, Textarea } from '@harness-sample/ui'

interface CommentFormProps {
  onSubmit: (body: string) => Promise<void>
  disabled?: boolean
}

export function CommentForm({ onSubmit, disabled = false }: CommentFormProps) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (body.trim() === '') {
      setError('A comment cannot be empty.')
      return
    }

    setError(undefined)
    setIsSubmitting(true)

    try {
      await onSubmit(body.trim())
      setBody('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        label="Add a comment"
        value={body}
        error={error}
        disabled={disabled || isSubmitting}
        placeholder="Share an update on this ticket…"
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? 'Posting…' : 'Post comment'}
        </Button>
      </div>
    </form>
  )
}
