import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/app-shell'
import { AuthGuard } from './components/auth-guard'
import { DashboardPage } from './pages/dashboard-page'
import { LoginPage } from './pages/login-page'
import { ClientsPointsPage } from './pages/clients-points-page'
import { RoutesPage } from './pages/routes-page'
import { TraceabilityPage } from './pages/traceability-page'
import { TrucksDriversPage } from './pages/trucks-drivers-page'

function ProtectedApp() {
  return (
    <AuthGuard>
      <AppShell />
    </AuthGuard>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedApp />}>
        <Route index element={<DashboardPage />} />
        <Route path="/clientes" element={<ClientsPointsPage />} />
        <Route path="/camiones" element={<TrucksDriversPage />} />
        <Route path="/rutas" element={<RoutesPage />} />
        <Route path="/trazabilidad" element={<TraceabilityPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
