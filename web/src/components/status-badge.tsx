import type { RouteStatus, StopStatus } from '../api/types'
import { routeStatusLabel, stopStatusLabel } from '../lib/format'
import { Badge } from './ui/badge'

export function RouteStatusBadge({ status }: { status: RouteStatus }) {
  const variant = status === 'completed' ? 'green' : status === 'in_progress' ? 'blue' : 'amber'
  return <Badge variant={variant}>{routeStatusLabel(status)}</Badge>
}

export function StopStatusBadge({ status }: { status: StopStatus }) {
  const variant = status === 'visited' ? 'green' : status === 'skipped' ? 'red' : 'amber'
  return <Badge variant={variant}>{stopStatusLabel(status)}</Badge>
}
