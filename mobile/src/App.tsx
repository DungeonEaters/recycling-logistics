import {
  IonApp,
  IonLoading,
  setupIonicReact,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DriverDataProvider } from './contexts/DriverDataContext'
import { LoginPage } from './pages/LoginPage'
import { PendingSyncPage } from './pages/PendingSyncPage'
import { RoutePage } from './pages/RoutePage'
import { StopDetailPage } from './pages/StopDetailPage'

setupIonicReact()

function ProtectedShell() {
  const { session, isReady } = useAuth()

  if (!isReady) {
    return <IonLoading isOpen message="Cargando aplicación..." />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <DriverDataProvider>
      <Outlet />
    </DriverDataProvider>
  )
}

export default function App() {
  return (
    <IonApp>
      <AuthProvider>
        <IonReactRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedShell />}>
              <Route path="/ruta" element={<RoutePage />} />
              <Route path="/ruta/:routeId/stops/:stopId" element={<StopDetailPage />} />
              <Route path="/pendientes" element={<PendingSyncPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/ruta" replace />} />
          </Routes>
        </IonReactRouter>
      </AuthProvider>
    </IonApp>
  )
}
