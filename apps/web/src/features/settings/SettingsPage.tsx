import { Card, CardBody, CardHeader, Heading, Select, Text } from '@harness-sample/ui'
import { ROLES, ROLE_LABELS, type Role } from '@/features/roles/role.types'
import { useRole } from '@/features/roles/useRole'

const roleOptions = ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))

export function SettingsPage() {
  const { role, setRole } = useRole()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading level="page">Settings</Heading>
        <Text tone="muted">
          There is no authentication in this reference app. Switching role here is how you test
          the permission-gated parts of the UI.
        </Text>
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
    </div>
  )
}
