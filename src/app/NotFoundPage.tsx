import { useNavigate } from 'react-router-dom'
import { Button, Card, CardBody, CardHeader } from '../design-system'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Card className="max-w-md">
      <CardHeader title="Page not found" description="That route does not exist." />
      <CardBody>
        <Button onClick={() => navigate('/tickets')}>Back to tickets</Button>
      </CardBody>
    </Card>
  )
}
