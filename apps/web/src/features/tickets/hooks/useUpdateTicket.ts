import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { Ticket, UpdateTicketBody } from '@support-desk/shared'
import { updateTicket } from '@/lib/api/tickets'
import { ticketKeys } from '@/features/tickets/ticketKeys'

export interface UpdateTicketVariables {
  id: string
  patch: UpdateTicketBody
}

/**
 * The server answers with the whole updated ticket, so the detail cache is
 * written rather than invalidated: the screen showing that ticket already has
 * the newest version and has no reason to fetch it again. Priority is
 * filterable, so the lists do have to be refetched.
 *
 * The available moves are dropped too, and that is the workflow's doing rather
 * than the patch's: `assigned` is a condition on the assignee, so reassigning a
 * ticket is the one edit here that changes what can be done to it next. A
 * ticket handed back to `Unassigned` can no longer be resolved, and the card
 * saying so has to hear about it.
 */
export function useUpdateTicket(): UseMutationResult<Ticket, Error, UpdateTicketVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patch }: UpdateTicketVariables) => updateTicket(id, patch),
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketKeys.detail(ticket.id), ticket)

      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.movesFor(ticket.id) }),
      ])
    },
  })
}
