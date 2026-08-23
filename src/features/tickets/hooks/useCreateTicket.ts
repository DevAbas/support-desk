import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { CreateTicketBody } from '../../../lib/api/contract'
import { createTicket } from '../../../lib/api/tickets'
import type { Ticket } from '../../../lib/types'
import { ticketKeys } from '../ticketKeys'

/**
 * A new ticket changes which rows every filter combination matches, so every
 * list is invalidated. No detail query can be affected: the ticket did not
 * exist a moment ago, so nothing is cached under its id.
 */
export function useCreateTicket(): UseMutationResult<Ticket, Error, CreateTicketBody> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
  })
}
