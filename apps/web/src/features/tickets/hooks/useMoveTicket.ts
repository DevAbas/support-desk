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
 *
 * **A refusal is news about the ticket too.** The commonest one is a position
 * refusal — the move was out of somewhere this ticket no longer is — which is
 * the server saying the copy the click was made from is stale. Nothing else
 * would correct it: `queryClient` turns `refetchOnWindowFocus` off, so the
 * screen would go on offering the move that was just refused and answer a second
 * click with the same sentence. The detail and the moves are dropped so the card
 * redraws around where the ticket actually is; the lists are left, because they
 * are a different query the refusal says nothing about.
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
    onError: (_error, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.movesFor(id) }),
      ]),
  })
}
