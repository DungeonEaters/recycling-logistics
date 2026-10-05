import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react'

import { OfflineBanner } from '../components/OfflineBanner'
import { useDriverData } from '../contexts/DriverDataContext'

export function PendingSyncPage() {
  const { pendingQueue, offline, syncing, syncNow } = useDriverData()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ruta" />
          </IonButtons>
          <IonTitle>Sincronización</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <OfflineBanner offline={offline} pendingCount={pendingQueue.length} />
        <div className="page-shell ion-padding">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Pendientes</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="pending-summary">
                <IonBadge color={pendingQueue.length ? 'warning' : 'success'}>{pendingQueue.length}</IonBadge>
                <span>{pendingQueue.length === 1 ? 'pesaje pendiente' : 'pesajes pendientes'}</span>
              </div>
              <IonButton expand="block" onClick={() => void syncNow()} disabled={syncing || pendingQueue.length === 0}>
                {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </IonButton>
            </IonCardContent>
          </IonCard>

          {syncing ? (
            <div className="centered-row">
              <IonSpinner name="crescent" />
            </div>
          ) : null}

          <IonList inset>
            {pendingQueue.map((item) => (
              <IonItem key={item.id}>
                <IonLabel>
                  <h2>
                    {item.sequence}. {item.pointName}
                  </h2>
                  <p>{item.address}</p>
                  <p>
                    {item.kg.toFixed(1)} kg · {item.material} · {new Date(item.weighedAt).toLocaleString('es-CL')}
                  </p>
                  {item.notes ? <p>Notas: {item.notes}</p> : null}
                  {item.error ? <IonNote color="danger">Error: {item.error}</IonNote> : <IonNote color="medium">En cola</IonNote>}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>

          {pendingQueue.length === 0 ? (
            <IonCard>
              <IonCardContent>Todo está sincronizado.</IonCardContent>
            </IonCard>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  )
}
