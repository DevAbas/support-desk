import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card, CardBody, CardFooter, CardHeader } from './Card'

describe('Card', () => {
  it('renders a heading, description, actions and body', () => {
    render(
      <Card>
        <CardHeader
          title="Ticket #12"
          description="Reported yesterday"
          actions={<span>action slot</span>}
        />
        <CardBody>Body content</CardBody>
        <CardFooter>Footer content</CardFooter>
      </Card>,
    )

    expect(screen.getByRole('heading', { name: 'Ticket #12' })).toBeInTheDocument()
    expect(screen.getByText('Reported yesterday')).toBeInTheDocument()
    expect(screen.getByText('action slot')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })
})
