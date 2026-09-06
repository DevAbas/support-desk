import { useState } from 'react'
import { Alert, Button, Card, CardHeader, Heading, Text } from '@support-desk/ui'
import type { CustomerPlan, UpdateCustomerPlanBody } from '@support-desk/shared'
import { toErrorMessage } from '@/lib/api/http'
import { PlanEditDialog } from './components/PlanEditDialog'
import { PlanTable } from './components/PlanTable'
import { useCustomerPlans } from './hooks/useCustomerPlans'
import { useUpdateCustomerPlan } from './hooks/useUpdateCustomerPlan'

/**
 * What the product charges, and who is on each plan.
 *
 * Administrators' work, and the second screen in this app that is. The gate is
 * `roles` on `NAVIGATION_TARGETS`, so the nav item, the address and the search
 * result close together, and the two endpoints behind it refuse an agent as
 * well — the half a client cannot talk its way past.
 *
 * **It is not the customer screen.** Moving a customer onto a plan is done over
 * there, from the list, because it is a fact about a customer; this screen holds
 * the plans themselves, which exist whether or not anybody is on one. The count
 * on each row is the join between the two, and it is the whole of it: nothing
 * here fetches a customer.
 *
 * **One question at a time.** There is no bulk edit and no inline field: a price
 * list is four rows read against each other, and a row that turned into a form
 * would leave a half-typed figure sitting in a comparison. Editing opens a modal
 * over it, and the modal is where a failure is reported, because the page behind
 * an `aria-modal` panel is not somewhere a screen reader can be shown anything.
 */
export function PlansPage() {
  const [editing, setEditing] = useState<CustomerPlan | null>(null)

  const plans = useCustomerPlans()
  const update = useUpdateCustomerPlan()

  const rows = plans.data?.rows ?? []
  const loadError = plans.isError ? toErrorMessage(plans.error, 'Could not load the plans.') : null

  // The plan being edited is held by name rather than as a row, so the dialog is
  // always looking at what the query holds now. A row captured when the dialog
  // opened would be the copy the count was read off, and an edit made from
  // another tab would leave the dialog re-submitting figures nobody can see.
  const editingRow = rows.find((row) => row.plan === editing)

  const saveError = update.isError
    ? toErrorMessage(update.error, 'Could not save this plan.')
    : null

  /**
   * Asking again starts from a clean question. The reset is on the way in rather
   * than on the way out because `mutate`'s callbacks belong to the observer
   * being reset: Escape dismisses the dialog while its request is still in
   * flight, and resetting then would drop the `onSuccess` that closes it.
   */
  function edit(plan: CustomerPlan) {
    update.reset()
    setEditing(plan)
  }

  function save(terms: UpdateCustomerPlanBody) {
    if (editing === null) {
      return
    }

    update.mutate({ plan: editing, terms }, { onSuccess: () => setEditing(null) })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading level="page">Plans</Heading>
        <Text tone="muted">What each plan costs, what it carries, and who is on it.</Text>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Plan catalogue"
          description="The plans are a ladder: each one costs at least what the plan below it costs, and carries at least as many seats."
        />

        {loadError ? (
          <Alert
            tone="danger"
            variant="band"
            action={
              <Button variant="secondary" size="sm" onClick={() => void plans.refetch()}>
                Try again
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : null}

        <PlanTable rows={rows} isLoading={plans.isPending} onEdit={edit} />
      </Card>

      {editingRow ? (
        <PlanEditDialog
          row={editingRow}
          isBusy={update.isPending}
          error={saveError}
          onConfirm={save}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}
