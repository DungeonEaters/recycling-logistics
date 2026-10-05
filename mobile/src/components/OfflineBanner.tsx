import { IonBadge, IonIcon, IonItem, IonLabel } from '@ionic/react'
import { cloudOfflineOutline, syncOutline } from 'ionicons/icons'

interface OfflineBannerProps {
  offline: boolean
  pendingCount: number
}

export function OfflineBanner({ offline, pendingCount }: OfflineBannerProps) {
  if (!offline && pendingCount === 0) {
    return null
  }

  return (
    <IonItem color={offline ? 'warning' : 'light'} lines="none" className="banner-item">
      <IonIcon icon={offline ? cloudOfflineOutline : syncOutline} slot="start" />
      <IonLabel>
        {offline
          ? 'Sin conexión. Puedes registrar pesajes y se enviarán más tarde.'
          : 'Hay pesajes pendientes por sincronizar.'}
      </IonLabel>
      <IonBadge color={offline ? 'dark' : 'primary'}>{pendingCount}</IonBadge>
    </IonItem>
  )
}
