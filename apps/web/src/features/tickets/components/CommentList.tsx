import { StateMessage, Text } from '@support-desk/ui'
import { formatDateTime } from '@/lib/format'
import type { TicketComment } from '@support-desk/shared'

interface CommentListProps {
  comments: TicketComment[]
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return <StateMessage className="px-0 py-0 text-left">No comments yet.</StateMessage>
  }

  return (
    <ol role="list" className="flex flex-col gap-4">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-element border border-border bg-surface-muted p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Text className="font-medium">{comment.author}</Text>
            <time dateTime={comment.createdAt} className="text-caption text-fg-subtle">
              {formatDateTime(comment.createdAt)}
            </time>
          </div>
          {/* Free text someone typed: it wraps rather than widening the card. */}
          <Text tone="muted" className="mt-2">
            {comment.body}
          </Text>
        </li>
      ))}
    </ol>
  )
}
