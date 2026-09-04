import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { Ticket, TicketMoveBody } from '@support-desk/shared'
import { moveTicket } from '@/lib/api/tickets'
import { ticketKeys } from '@/features/tickets/ticketKeys'

export interface MoveTicketVariables {
  id: string
  body: TicketMoveBody
}

/**
 * One named move.
 *
 * The server answers with the whole moved ticket, so the detail cache is
 * written rather than invalidated — the screen that asked already has the newest
 * version, history included. What it cannot know is what the ticket can do
 * *next*, which is the server's answer to a different question, so the moves are
 * invalidated and asked again. The lists are refetched because the status they
 * filter and draw has changed.
 */
export function useMoveTicket(): UseMutationResult<Ticket, Error, MoveTicketVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: MoveTicketVariables) => moveTicket(id, body),
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketKeys.detail(ticket.id), ticket)

      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.movesFor(ticket.id) }),
      ])
    },
  })
}
