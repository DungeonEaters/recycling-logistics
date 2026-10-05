import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonSpinner,
  IonText,
} from '@ionic/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { session, login, isReady } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('chofer@demo.cl')
  const [password, setPassword] = useState('chofer123')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      navigate('/ruta', { replace: true })
    }
  }, [navigate, session])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/ruta', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <IonPage>
      <IonContent className="ion-padding login-content" fullscreen>
        <div className="login-shell">
          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>MVP logística de reciclaje</IonCardSubtitle>
              <IonCardTitle>Chofer Reciclaje</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {!isReady ? (
                <div className="centered-row">
                  <IonSpinner name="crescent" />
                </div>
              ) : (
                <>
                  <IonItem>
                    <IonLabel position="stacked">Correo</IonLabel>
                    <IonInput
                      type="email"
                      value={email}
                      autocomplete="username"
                      onIonInput={(event) => setEmail(String(event.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Contraseña</IonLabel>
                    <IonInput
                      type="password"
                      value={password}
                      autocomplete="current-password"
                      onIonInput={(event) => setPassword(String(event.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonNote className="helper-note">
                    Demo: chofer@demo.cl / chofer123
                  </IonNote>
                  {error ? (
                    <IonText color="danger">
                      <p>{error}</p>
                    </IonText>
                  ) : null}
                  <IonButton expand="block" onClick={handleSubmit} disabled={submitting || !email || !password}>
                    {submitting ? 'Ingresando...' : 'Iniciar sesión'}
                  </IonButton>
                </>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  )
}
