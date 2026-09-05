import { expectNoAxeViolations, NEEDS_LAYOUT, PAGE_RULES } from '@support-desk/a11y'
import { render } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  Alert,
  Avatar,
  Badge,
  BarChart,
  Button,
  Card,
  CardBody,
  Checkbox,
  CommandPalette,
  ConfirmDialog,
  DateRangeField,
  Drawer,
  Heading,
  Icon,
  Input,
  List,
  ListRow,
  Modal,
  MultiSelect,
  Select,
  StatCard,
  StateMessage,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  Textarea,
  Toolbar,
} from '../index'

/**
 * Every exported component, rendered and read back as an accessibility tree.
 *
 * A sweep rather than a case per component file, and driven off a table rather
 * than written out, because the failure this guards against is a component
 * shipped without anyone thinking about it. A per-component convention is one
 * somebody forgets on the twenty-ninth component; a table with a hole in it is a
 * hole a reader can see.
 *
 * These are fragments, not pages, so the document-level rules are off — see
 * `PAGE_RULES` in `internal/a11y`. The page-level questions are asked in
 * `apps/web`, where there is a page to ask them of.
 */

/** A component that has to be open to be worth reading. */
function Open({ children }: { children: (open: boolean) => ReactNode }) {
  const [open] = useState(true)

  return <>{children(open)}</>
}

const OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
] as const

const RENDERS: Record<string, () => ReactNode> = {
  Alert: () => <Alert tone="danger" title="Could not save">Try again.</Alert>,
  Avatar: () => <Avatar name="Priya Raman" />,
  Badge: () => <Badge status="info">Open</Badge>,
  BarChart: () => (
    <BarChart
      caption="Tickets by day"
      categoryLabel="Day"
      valueLabel="Tickets"
      data={[
        { id: 'mon', label: 'Mon', value: 4 },
        { id: 'tue', label: 'Tue', value: 7 },
      ]}
    />
  ),
  Button: () => <Button variant="primary">Save view</Button>,
  Card: () => (
    <Card>
      <CardBody>
        <Text>A card with something in it.</Text>
      </CardBody>
    </Card>
  ),
  Checkbox: () => <Checkbox label="Select Priya Raman" checked={false} onChange={() => {}} />,
  CommandPalette: () => (
    <Open>
      {(open) => (
        <CommandPalette
          open={open}
          onClose={() => {}}
          label="Search"
          placeholder="Tickets, customers and screens"
          value="inv"
          onValueChange={() => {}}
          onSelect={() => {}}
          groups={[
            {
              id: 'tickets',
              label: 'Tickets',
              options: [{ id: 't-1', title: 'Cannot sign in', subtitle: 'Priya Raman' }],
            },
          ]}
        />
      )}
    </Open>
  ),
  ConfirmDialog: () => (
    <Open>
      {(open) => (
        <ConfirmDialog
          open={open}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete 3 tickets?"
          description="This cannot be undone."
          confirmLabel="Delete"
        />
      )}
    </Open>
  ),
  DateRangeField: () => (
    <DateRangeField
      legend="Report range"
      value={{ from: '2026-08-19', to: '2026-08-25' }}
      onChange={() => {}}
      presets={[
        { id: 'last-7', label: 'Last 7 days', range: { from: '2026-08-19', to: '2026-08-25' } },
      ]}
    />
  ),
  Drawer: () => (
    <Open>
      {(open) => (
        <Drawer open={open} onClose={() => {}} title="Priya Raman">
          <Text>Enterprise, since 2024.</Text>
        </Drawer>
      )}
    </Open>
  ),
  Heading: () => <Heading level="page">Tickets</Heading>,
  Icon: () => <Icon name="search" label="Search" />,
  Input: () => <Input label="Search tickets" value="" onChange={() => {}} />,
  List: () => (
    <List label="Customers">
      <ListRow leading={<Avatar name="Priya Raman" />} title="Priya Raman" subtitle="Enterprise" />
    </List>
  ),
  Modal: () => (
    <Open>
      {(open) => (
        <Modal open={open} onClose={() => {}} title="Save this view">
          <Input label="Name" value="" onChange={() => {}} />
        </Modal>
      )}
    </Open>
  ),
  MultiSelect: () => (
    <MultiSelect label="Plans" options={[...OPTIONS]} value={['pro']} onChange={() => {}} />
  ),
  Select: () => (
    <Select label="Priority" options={[...OPTIONS]} value="pro" onChange={() => {}} />
  ),
  StatCard: () => <StatCard label="Resolved" value="128" />,
  StateMessage: () => <StateMessage>No tickets match these filters.</StateMessage>,
  Table: () => (
    <Table caption="Tickets">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Title</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody columnCount={1}>
        <TableRow>
          <TableCell>Cannot sign in</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
  Tabs: () => (
    <Tabs value="all" onValueChange={() => {}} label="Ticket views">
      <TabList>
        <Tab value="all">All</Tab>
        <Tab value="mine">Mine</Tab>
      </TabList>
      <TabPanel value="all">
        <Text>Everything in the queue.</Text>
      </TabPanel>
    </Tabs>
  ),
  Text: () => <Text tone="subtle">Updated an hour ago.</Text>,
  Textarea: () => <Textarea label="Reason" value="" onChange={() => {}} />,
  Toolbar: () => (
    <Toolbar>
      <Button variant="ghost">Export</Button>
    </Toolbar>
  ),
}

describe('every exported component, as an accessibility tree', () => {
  for (const [name, renderComponent] of Object.entries(RENDERS)) {
    it(`${name} has no axe violations`, async () => {
      const { container } = render(<>{renderComponent()}</>)

      // A dialog renders into a portal, so the container a test is handed is
      // empty and the document is what has to be read.
      await expectNoAxeViolations(container.ownerDocument.body)
    })
  }
})

describe('the sweep itself', () => {
  it('covers every component the package exports', async () => {
    const exported = Object.keys(await import('../index'))
    // Sub-parts are exercised through the component that owns them: a
    // `TableCell` outside a `Table` is not markup this package would produce.
    const throughTheirParent = new Set([
      'CardBody',
      'CardFooter',
      'CardHeader',
      'ListRow',
      'Tab',
      'TabList',
      'TabPanel',
      'TableBody',
      'TableCell',
      'TableHead',
      'TableHeaderCell',
      'TableRow',
      'EMPTY_MESSAGE',
      'LOADING_MESSAGE',
    ])
    const components = exported.filter(
      (name) => /^[A-Z]/.test(name) && !throughTheirParent.has(name),
    )

    expect(Object.keys(RENDERS).sort()).toEqual(components.sort())
  })

  it('says which rules it is not asking, rather than leaving them unasked', () => {
    // jsdom has no layout, so the whole visual half of WCAG is unchecked here
    // and unchecked anywhere else in this repository. Naming it is the
    // difference between a known gap and an assumed pass.
    expect(NEEDS_LAYOUT).toContain('color-contrast')
    expect(PAGE_RULES).toContain('region')
  })
})
