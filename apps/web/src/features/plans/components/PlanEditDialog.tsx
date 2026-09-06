import { useId, useState, type SubmitEventHandler } from 'react'
import { Alert, Button, Checkbox, Input, Modal, Textarea } from '@support-desk/ui'
import {
  CUSTOMER_PLAN_LABELS,
  MAX_PLAN_DESCRIPTION_LENGTH,
  MAX_PLAN_MONTHLY_PRICE_PENCE,
  MAX_PLAN_SEAT_LIMIT,
  type CustomerPlanRow,
  type UpdateCustomerPlanBody,
} from '@support-desk/shared'
import {
  formatMonthlyPrice,
  parsePriceField,
  parseSeatsField,
  toPriceField,
  UNLIMITED_SEATS_LABEL,
} from '../planFormat'

interface PlanEditDialogProps {
  /** The plan being edited, as the server last reported it. */
  row: CustomerPlanRow
  isBusy: boolean
  /** Whatever the server refused this edit with, including a broken rung. */
  error: string | null
  onConfirm: (terms: UpdateCustomerPlanBody) => void
  onClose: () => void
}

/** One message per field, and only for the fields that have one. */
interface FieldErrors {
  price?: string
  seats?: string
  description?: string
}

/**
 * What a plan costs and what it carries.
 *
 * A `Modal` rather than a drawer or a row that becomes editable: re-pricing a
 * plan is a question that has to be answered before anything else happens, and
 * a half-typed price sitting in a table beside three other plans is a catalogue
 * that reads as though it has already changed.
 *
 * Mounted only while it is open, so every field starts from the row it was
 * opened on without an effect to re-seed them — the same trade
 * `SavedViewNameDialog` and `TicketMoveReasonDialog` make.
 *
 * **The plan itself is not a field**, and the dialog says so rather than leaving
 * it out silently: the plan is the identity a customer row stores and a saved
 * view is written in, so it is the title of this dialog and not something in it.
 * See `CustomerPlanTerms` in the shared contract for the whole of that argument.
 *
 * **Only two kinds of thing are checked here.** Whether the price is a price and
 * whether the seat count is a number are questions about what was typed, and a
 * field is where they belong. Whether the result sits correctly against the plan
 * above it is a fact about three plans this dialog is not showing, so it is the
 * server's, and what comes back is rendered as it arrives — the same division
 * the ticket screens make with a move's guards.
 */
export function PlanEditDialog({ row, isBusy, error, onConfirm, onClose }: PlanEditDialogProps) {
  const formId = useId()
  const [price, setPrice] = useState(() => toPriceField(row.monthlyPricePence))
  const [hasSeatLimit, setHasSeatLimit] = useState(row.seatLimit !== null)
  const [seats, setSeats] = useState(() => (row.seatLimit === null ? '' : String(row.seatLimit)))
  const [description, setDescription] = useState(row.description)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    const monthlyPricePence = parsePriceField(price)
    const seatLimit = hasSeatLimit ? parseSeatsField(seats) : null
    const trimmedDescription = description.trim()
    const errors: FieldErrors = {}

    if (monthlyPricePence === null || monthlyPricePence > MAX_PLAN_MONTHLY_PRICE_PENCE) {
      errors.price = `A price in pounds, up to ${formatMonthlyPrice(MAX_PLAN_MONTHLY_PRICE_PENCE)}. Enter 0 for a plan that is free.`
    }

    if (hasSeatLimit && (seatLimit === null || seatLimit < 1 || seatLimit > MAX_PLAN_SEAT_LIMIT)) {
      errors.seats = `A whole number of seats, from 1 to ${MAX_PLAN_SEAT_LIMIT.toLocaleString('en-GB')}. Tick the box above for a plan with no limit.`
    }

    if (trimmedDescription === '') {
      errors.description = 'Say who the plan is for. It is the line shown beside it.'
    }

    // The price is named again rather than left to the `errors` object, because
    // that object is a bag of strings and cannot narrow a type. A fallback value
    // here would be a number nobody typed, sent on a path that cannot be reached.
    if (monthlyPricePence === null || Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // The seat limit needs no narrowing: null is what the box above means by a
    // plan with no limit, which is exactly the value the contract takes.
    onConfirm({ monthlyPricePence, seatLimit, description: trimmedDescription })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${CUSTOMER_PLAN_LABELS[row.plan]}`}
      description={`${String(row.customerCount)} ${row.customerCount === 1 ? 'customer is' : 'customers are'} on this plan. Changing what it costs does not move anybody off it.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          {/* Outside the form element, tied to it by id, so Enter saves too. */}
          <Button type="submit" form={formId} disabled={isBusy}>
            {isBusy ? 'Saving…' : 'Save plan'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* A text field rather than `type="number"`, for both figures. A number
            input drops what it cannot parse instead of reporting it, so a price
            typed with a currency symbol in front of it arrives as an empty
            string and the field says nothing was entered. */}
        <Input
          label="Price per month"
          value={price}
          inputMode="decimal"
          hint="In pounds, so 19 or 19.99. Enter 0 for a plan that is free."
          error={fieldErrors.price}
          disabled={isBusy}
          onChange={(event) => {
            setPrice(event.target.value)
            setFieldErrors((current) => ({ ...current, price: undefined }))
          }}
        />

        <div className="flex flex-col gap-2">
          <Checkbox
            label={`${UNLIMITED_SEATS_LABEL} seats`}
            checked={!hasSeatLimit}
            disabled={isBusy}
            onChange={(event) => {
              setHasSeatLimit(!event.target.checked)
              setFieldErrors((current) => ({ ...current, seats: undefined }))
            }}
          />
          <Input
            label="Seat limit"
            value={hasSeatLimit ? seats : ''}
            inputMode="numeric"
            placeholder={hasSeatLimit ? undefined : UNLIMITED_SEATS_LABEL}
            error={fieldErrors.seats}
            // Not hidden when the plan has no limit: a field that disappears
            // takes the number somebody typed with it, and ticking the box back
            // off should not mean typing it again.
            disabled={isBusy || !hasSeatLimit}
            onChange={(event) => {
              setSeats(event.target.value)
              setFieldErrors((current) => ({ ...current, seats: undefined }))
            }}
          />
        </div>

        <Textarea
          label="Who it is for"
          value={description}
          rows={2}
          maxLength={MAX_PLAN_DESCRIPTION_LENGTH}
          error={fieldErrors.description}
          disabled={isBusy}
          onChange={(event) => {
            setDescription(event.target.value)
            setFieldErrors((current) => ({ ...current, description: undefined }))
          }}
        />

        {/* Inside the dialog rather than over the list behind it. This panel is
            `aria-modal`, so the page under it is, as far as a screen reader is
            concerned, not there — and a failure reported there is reported
            nowhere. `ConfirmDialog` takes an `error` for the same reason. */}
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </form>
    </Modal>
  )
}
