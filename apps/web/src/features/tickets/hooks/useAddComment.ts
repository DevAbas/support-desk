import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { AddCommentBody, Ticket } from '@harness-sample/shared'
import { addComment } from '@/lib/api/tickets'
import { ticketKeys } from '@/features/tickets/ticketKeys'

export interface AddCommentVariables {
  id: string
  body: AddCommentBody
}

/**
 * A comment affects one ticket and nothing else. The ticket table has no
 * comment column, so the lists are deliberately left alone: invalidating them
 * would refetch every cached page to show the same rows.
 */
export function useAddComment(): UseMutationResult<Ticket, Error, AddCommentVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: AddCommentVariables) => addComment(id, body),
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketKeys.detail(ticket.id), ticket)
    },
  })
}
