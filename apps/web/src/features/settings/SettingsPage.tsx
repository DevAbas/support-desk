import { Card, CardBody, CardHeader, Select } from '@/design-system'
import { ROLES, ROLE_LABELS, type Role } from '@/features/roles/role.types'
import { useRole } from '@/features/roles/useRole'
import { TaxonomySection } from './TaxonomySection'

const roleOptions = ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))

export function SettingsPage() {
  const { role, setRole, canManageTickets } = useRole()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Settings</h1>
        <p className="text-sm text-fg-muted">
          There is no authentication in this reference app. Switching role here is how you test
          the permission-gated parts of the UI.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader
          title="Current role"
          description="Admins can run bulk actions and delete tickets. Agents cannot."
        />
        <CardBody>
          <Select
            label="Role"
            options={roleOptions}
            value={role}
            hint="The change applies immediately, across every screen."
            onChange={(event) => setRole(event.target.value as Role)}
          />
        </CardBody>
      </Card>

      {/*
        Admin-only, and gated in the UI like every other admin action here: the
        API will take an edit from anyone who asks. Rendering nothing rather than
        a disabled editor keeps an agent from reading it as something to unlock.
      */}
      {canManageTickets ? (
        <TaxonomySection />
      ) : (
        <Card className="max-w-md">
          <CardHeader
            title="Ticket statuses and priorities"
            description="Only admins can change what a ticket can be set to. Switch role above to edit them."
          />
        </Card>
      )}
    </div>
  )
}
