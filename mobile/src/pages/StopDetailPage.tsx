import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react'
import { navigateOutline } from 'ionicons/icons'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { StopStatusChip } from '../components/StopStatusChip'
import { useDriverData } from '../contexts/DriverDataContext'
import type { MaterialCode } from '../types'

const MATERIAL_OPTIONS: Array<{ value: MaterialCode; label: string }> = [
  { value: 'plastico', label: 'Plástico general' },
  { value: 'pet1', label: 'PET 1' },
  { value: 'hdpe2', label: 'HDPE 2' },
  { value: 'mixto', label: 'Mixto' },
]

export function StopDetailPage() {
  const navigate = useNavigate()
  const params = useParams<{ routeId: string; stopId: string }>()
  const routeId = Number(params.routeId)
  const stopId = Number(params.stopId)
  const { routes, offline, saveWeighing, skipStop } = useDriverData()
  const [kg, setKg] = useState('')
  const [material, setMaterial] = useState<MaterialCode>('plastico')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [presentToast] = useIonToast()

  const route = useMemo(() => routes.find((item) => item.id === routeId) ?? null, [routeId, routes])
  const stop = route?.stops.find((item) => item.id === stopId) ?? null

  if (!route || !stop) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/ruta" />
            </IonButtons>
            <IonTitle>Parada no encontrada</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">Vuelve a la lista y actualiza la ruta.</IonContent>
      </IonPage>
    )
  }

  const openNavigation = (provider: 'waze' | 'google') => {
    const latLng = `${stop.lat},${stop.lng}`
    const url =
      provider === 'waze'
        ? `https://waze.com/ul?ll=${latLng}&navigate=yes`
        : `https://www.google.com/maps/dir/?api=1&destination=${latLng}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleSave = async () => {
    const parsedKg = Number(kg)
    if (!Number.isFinite(parsedKg) || parsedKg <= 0) {
      await presentToast({ message: 'Ingresa un peso mayor a 0.', duration: 1800, color: 'danger' })
      return
    }

    setSaving(true)
    try {
      await saveWeighing({
        routeId: route.id,
        stop,
        kg: parsedKg,
        material,
        notes,
      })
      await presentToast({
        message: offline ? 'Pesaje guardado offline. Se sincronizará luego.' : 'Pesaje guardado y enviado a sincronización.',
        duration: 1800,
        color: 'success',
      })
      navigate('/ruta')
    } catch (error) {
      await presentToast({
        message: error instanceof Error ? error.message : 'No se pudo guardar el pesaje',
        duration: 2200,
        color: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    try {
      await skipStop(route.id, stop.id)
      await presentToast({ message: 'Parada omitida.', duration: 1600, color: 'warning' })
      navigate('/ruta')
    } catch (error) {
      await presentToast({
        message: error instanceof Error ? error.message : 'No se pudo omitir la parada',
        duration: 2200,
        color: 'danger',
      })
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ruta" />
          </IonButtons>
          <IonTitle>{stop.point_name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="page-shell ion-padding">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{stop.client_name}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>{stop.address}</p>
              <StopStatusChip status={stop.status} />
              <p className="meta-text">Registrado: {stop.kg ? `${stop.kg.toFixed(1)} kg` : 'sin pesaje'}</p>
            </IonCardContent>
          </IonCard>

          <IonList inset>
            <IonItem button onClick={() => openNavigation('waze')}>
              <IonLabel>Ir con Waze</IonLabel>
              <IonIcon slot="end" icon={navigateOutline} />
            </IonItem>
            <IonItem button onClick={() => openNavigation('google')}>
              <IonLabel>Ir con Google Maps</IonLabel>
              <IonIcon slot="end" icon={navigateOutline} />
            </IonItem>
          </IonList>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Registrar pesaje</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel position="stacked">Kilos</IonLabel>
                <IonInput type="number" inputmode="decimal" value={kg} onIonInput={(event) => setKg(String(event.detail.value ?? ''))} />
              </IonItem>
              <IonItem>
                <IonLabel>Material</IonLabel>
                <IonSelect value={material} onIonChange={(event) => setMaterial(event.detail.value as MaterialCode)}>
                  {MATERIAL_OPTIONS.map((option) => (
                    <IonSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Notas</IonLabel>
                <IonTextarea value={notes} autoGrow onIonInput={(event) => setNotes(String(event.detail.value ?? ''))} />
              </IonItem>
              <IonButton expand="block" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar pesaje'}
              </IonButton>
              <IonButton expand="block" fill="outline" color="warning" onClick={handleSkip} disabled={offline || stop.status === 'visited'}>
                Omitir parada
              </IonButton>
              {offline ? <p className="meta-text warning-text">Omitir parada requiere conexión. El pesaje sigue disponible offline.</p> : null}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  )
}
