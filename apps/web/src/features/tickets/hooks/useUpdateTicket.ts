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
 * the newest version and has no reason to fetch it again. Status and priority
 * are both filterable, so the lists do have to be refetched.
 */
export function useUpdateTicket(): UseMutationResult<Ticket, Error, UpdateTicketVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patch }: UpdateTicketVariables) => updateTicket(id, patch),
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketKeys.detail(ticket.id), ticket)
      return queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
    },
  })
}
