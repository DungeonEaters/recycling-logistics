import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getDashboard, getRoutes } from '../api/client'
import { DayRoutesMap } from '../components/maps'
import { EmptyState } from '../components/empty-state'
import { LoadingState } from '../components/loading-state'
import { MetricCard } from '../components/metric-card'
import { ProgressBar } from '../components/progress-bar'
import { RouteStatusBadge } from '../components/status-badge'
import { Alert } from '../components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { formatKg, formatProgress, getErrorMessage, todayString } from '../lib/format'

export function DashboardPage() {
  const today = todayString()
  const date = new URLSearchParams(window.location.search).get('date') ?? today
  const [selectedDate, setSelectedDate] = useState(date)

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', selectedDate],
    queryFn: () => getDashboard(selectedDate),
    refetchInterval: 10000,
  })

  const routesQuery = useQuery({
    queryKey: ['dashboard-routes', selectedDate],
    queryFn: () => getRoutes(selectedDate),
    refetchInterval: 10000,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard operativo</h1>
          <p className="mt-1 text-sm text-slate-500">Resumen en tiempo real de rutas, paradas y kilos recolectados.</p>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="dashboard-date">
            Fecha
          </label>
          <Input id="dashboard-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
      </div>

      {dashboardQuery.error ? <Alert>{getErrorMessage(dashboardQuery.error)}</Alert> : null}
      {routesQuery.error ? <Alert>{getErrorMessage(routesQuery.error)}</Alert> : null}

      {dashboardQuery.isLoading ? (
        <LoadingState label="Cargando indicadores del dashboard..." />
      ) : dashboardQuery.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Rutas" value={String(dashboardQuery.data.routes)} />
          <MetricCard
            title="Paradas visitadas / pendientes"
            value={`${dashboardQuery.data.visited_stops} / ${dashboardQuery.data.pending_stops}`}
            hint={`${dashboardQuery.data.total_stops} totales`}
          />
          <MetricCard title="Total recolectado" value={formatKg(dashboardQuery.data.total_kg)} />
          <MetricCard title="Última actualización" value={new Date(dashboardQuery.dataUpdatedAt).toLocaleTimeString('es-CL')} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Avance por ruta</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading ? (
              <LoadingState label="Cargando rutas..." />
            ) : dashboardQuery.data && dashboardQuery.data.by_route.length ? (
              <div className="space-y-4">
                {dashboardQuery.data.by_route.map((route) => {
                  const percent = route.total_stops ? (route.visited_stops / route.total_stops) * 100 : 0
                  return (
                    <div key={route.route_id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-slate-900">Ruta #{route.route_id}</p>
                            <RouteStatusBadge status={route.status} />
                          </div>
                          <p className="text-sm text-slate-600">Camión: {route.truck_label ?? 'Sin asignar'}</p>
                          <p className="text-sm text-slate-500">Conductor: {route.driver_name ?? 'Sin asignar'}</p>
                        </div>
                        <div className="text-sm text-slate-500 md:text-right">
                          <p>{route.visited_stops} / {route.total_stops} paradas</p>
                          <p>{formatKg(route.kg)}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <ProgressBar value={percent} />
                        <p className="text-xs font-medium text-slate-500">{formatProgress(route.visited_stops, route.total_stops)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title="Sin rutas para la fecha seleccionada"
                description="Cuando despaches rutas para este día verás aquí su avance y kilos acumulados."
              />
            )}
          </CardContent>
        </Card>

        {routesQuery.isLoading ? (
          <LoadingState label="Cargando mapa..." />
        ) : routesQuery.data && routesQuery.data.length ? (
          <DayRoutesMap routes={routesQuery.data} />
        ) : (
          <EmptyState
            title="Mapa sin recorridos"
            description="No hay rutas para mostrar en el mapa. Crea rutas desde el módulo Rutas."
          />
        )}
      </div>
    </div>
  )
}
