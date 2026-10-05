import { IonChip, IonLabel } from '@ionic/react'

import type { StopStatus } from '../types'

const STATUS_MAP: Record<StopStatus, { color: 'medium' | 'success' | 'warning'; label: string }> = {
  pending: { color: 'medium', label: 'Pendiente' },
  visited: { color: 'success', label: 'Visitada' },
  skipped: { color: 'warning', label: 'Omitida' },
}

interface StopStatusChipProps {
  status: StopStatus
}

export function StopStatusChip({ status }: StopStatusChipProps) {
  const meta = STATUS_MAP[status]
  return (
    <IonChip color={meta.color} outline>
      <IonLabel>{meta.label}</IonLabel>
    </IonChip>
  )
}
