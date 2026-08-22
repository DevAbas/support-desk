import { formatDateTime } from '../../../lib/format'
import type { TicketComment } from '../../../lib/types'

interface CommentListProps {
  comments: TicketComment[]
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-sm text-fg-muted">No comments yet.</p>
  }

  return (
    <ol className="flex flex-col gap-4">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-md border border-border bg-surface-muted p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-fg">{comment.author}</p>
            <time dateTime={comment.createdAt} className="text-xs text-fg-subtle">
              {formatDateTime(comment.createdAt)}
            </time>
          </div>
          <p className="mt-2 text-sm text-fg-muted">{comment.body}</p>
        </li>
      ))}
    </ol>
  )
}
