import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { logOutOutline, syncOutline } from 'ionicons/icons'
import { useNavigate } from 'react-router-dom'

import { OfflineBanner } from '../components/OfflineBanner'
import { StopStatusChip } from '../components/StopStatusChip'
import { useAuth } from '../contexts/AuthContext'
import { useDriverData } from '../contexts/DriverDataContext'

function formatKg(value: number) {
  return `${value.toFixed(1)} kg`
}

export function RoutePage() {
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  const {
    routes,
    selectedRoute,
    selectedRouteId,
    pendingQueue,
    offline,
    loadingRoutes,
    syncing,
    cacheUpdatedAt,
    lastRouteError,
    refreshRoutes,
    selectRoute,
  } = useDriverData()

  const handleRefresh = async (event: CustomEvent) => {
    await refreshRoutes()
    event.detail.complete()
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Ruta activa</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => navigate('/pendientes')}>
              <IonIcon icon={syncOutline} slot="start" />
              <IonBadge color={pendingQueue.length ? 'warning' : 'medium'}>{pendingQueue.length}</IonBadge>
            </IonButton>
            <IonButton onClick={() => void logout()}>
              <IonIcon icon={logOutOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>
        <OfflineBanner offline={offline} pendingCount={pendingQueue.length} />
        <div className="page-shell ion-padding">
          {routes.length > 1 ? (
            <IonItem>
              <IonLabel>Seleccionar ruta</IonLabel>
              <IonSelect
                interface="popover"
                value={selectedRouteId ?? routes[0]?.id}
                onIonChange={(event) => void selectRoute(Number(event.detail.value))}
              >
                {routes.map((route) => (
                  <IonSelectOption key={route.id} value={route.id}>
                    Ruta #{route.id} · {route.truck_label ?? 'Sin camión'}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          ) : null}

          {loadingRoutes && routes.length === 0 ? (
            <div className="centered-row padded-block">
              <IonSpinner name="crescent" />
            </div>
          ) : null}

          {selectedRoute ? (
            <>
              <IonCard>
                <IonCardHeader>
                  <IonCardSubtitle>{session?.user.name}</IonCardSubtitle>
                  <IonCardTitle>
                    {selectedRoute.truck_label ?? 'Ruta sin camión'} · {selectedRoute.date}
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="stats-grid">
                    <div>
                      <strong>{selectedRoute.visited_stops}</strong>
                      <span>visitadas</span>
                    </div>
                    <div>
                      <strong>{selectedRoute.total_stops}</strong>
                      <span>totales</span>
                    </div>
                    <div>
                      <strong>{formatKg(selectedRoute.total_kg)}</strong>
                      <span>acumulados</span>
                    </div>
                  </div>
                  <IonNote color="medium">
                    {syncing ? 'Sincronizando pesajes...' : 'Desliza hacia abajo para actualizar.'}
                  </IonNote>
                  {cacheUpdatedAt ? <p className="meta-text">Última caché: {new Date(cacheUpdatedAt).toLocaleString('es-CL')}</p> : null}
                  {lastRouteError ? <p className="meta-text warning-text">Usando caché local: {lastRouteError}</p> : null}
                </IonCardContent>
              </IonCard>

              <IonList inset>
                {selectedRoute.stops.map((stop) => (
                  <IonItem key={stop.id} button detail onClick={() => navigate(`/ruta/${selectedRoute.id}/stops/${stop.id}`)}>
                    <IonLabel>
                      <h2>
                        {stop.sequence}. {stop.point_name}
                      </h2>
                      <p>{stop.client_name}</p>
                      <p>{stop.address}</p>
                      <StopStatusChip status={stop.status} />
                    </IonLabel>
                    <IonNote slot="end">{stop.kg ? formatKg(stop.kg) : '—'}</IonNote>
                  </IonItem>
                ))}
              </IonList>
            </>
          ) : null}

          {!loadingRoutes && routes.length === 0 ? (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Sin ruta para hoy</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                El administrador debe asignarte una ruta para la fecha actual de Santiago.
              </IonCardContent>
            </IonCard>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  )
}
