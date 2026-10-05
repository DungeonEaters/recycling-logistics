import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  createRoute,
  deleteRoute,
  getDrivers,
  getPoints,
  getRoute,
  getRoutes,
  getTrucks,
  optimizeRoute,
} from '../api/client'
import type { Point, RouteSummary } from '../api/types'
import { ConfirmDialog } from '../components/confirm-dialog'
import { EmptyState } from '../components/empty-state'
import { OrderedPointsMap } from '../components/maps'
import { LoadingState } from '../components/loading-state'
import { ProgressBar } from '../components/progress-bar'
import { RouteStatusBadge, StopStatusBadge } from '../components/status-badge'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../components/ui/modal'
import { Select } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper } from '../components/ui/table'
import { useToast } from '../components/ui/toast'
import { formatDateTime, formatKg, getErrorMessage, todayString } from '../lib/format'

function groupPointsByClient(points: Point[]) {
  return points.reduce<Record<string, Point[]>>((groups, point) => {
    const key = point.client_name ?? 'Sin cliente'
    groups[key] ??= []
    groups[key].push(point)
    return groups
  }, {})
}

export function RoutesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const today = todayString()
  const [formDate, setFormDate] = useState(today)
  const [filterDate, setFilterDate] = useState(today)
  const [truckId, setTruckId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [originLat, setOriginLat] = useState('-33.45')
  const [originLng, setOriginLng] = useState('-70.66')
  const [selectedPointIds, setSelectedPointIds] = useState<number[]>([])
  const [preview, setPreview] = useState<{ optimizer: string; points: Point[] } | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)
  const [deleteRouteTarget, setDeleteRouteTarget] = useState<RouteSummary | null>(null)

  const trucksQuery = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })
  const driversQuery = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })
  const pointsQuery = useQuery({ queryKey: ['active-points'], queryFn: () => getPoints(true) })
  const routesQuery = useQuery({ queryKey: ['routes', filterDate], queryFn: () => getRoutes(filterDate) })
  const routeDetailQuery = useQuery({
    queryKey: ['route', selectedRouteId],
    queryFn: () => getRoute(selectedRouteId as number),
    enabled: selectedRouteId !== null,
  })

  const activeTrucks = useMemo(() => (trucksQuery.data ?? []).filter((truck) => truck.active), [trucksQuery.data])
  const groupedPoints = useMemo(() => groupPointsByClient(pointsQuery.data ?? []), [pointsQuery.data])
  const selectedCount = selectedPointIds.length

  useEffect(() => {
    setPreview(null)
  }, [selectedPointIds, originLat, originLng])

  const optimizeMutation = useMutation({
    mutationFn: () =>
      optimizeRoute({
        point_ids: selectedPointIds,
        origin: { lat: Number(originLat), lng: Number(originLng) },
      }),
    onSuccess: (data) => {
      setPreview({ optimizer: data.optimizer, points: data.points })
      toast({ title: 'Ruta optimizada', description: `Optimizador usado: ${data.optimizer}`, variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible optimizar', description: getErrorMessage(error), variant: 'error' }),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createRoute({
        date: formDate,
        truck_id: truckId ? Number(truckId) : null,
        driver_id: driverId ? Number(driverId) : null,
        point_ids: selectedPointIds,
        origin: { lat: Number(originLat), lng: Number(originLng) },
        optimize: true,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSelectedPointIds([])
      setPreview(null)
      setTruckId('')
      setDriverId('')
      setFilterDate(formDate)
      toast({ title: `Ruta #${data.id} creada`, description: 'La ruta quedó asignada y lista para ejecutarse.', variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible crear la ruta', description: getErrorMessage(error), variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (routeId: number) => deleteRoute(routeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      setDeleteRouteTarget(null)
      setSelectedRouteId(null)
      toast({ title: 'Ruta eliminada', variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible eliminar la ruta', description: getErrorMessage(error), variant: 'error' }),
  })

  const togglePoint = (pointId: number) => {
    setSelectedPointIds((current) => {
      if (current.includes(pointId)) {
        return current.filter((id) => id !== pointId)
      }
      if (current.length >= 25) {
        toast({ title: 'Límite alcanzado', description: 'El optimizador del MVP permite hasta 25 puntos.', variant: 'error' })
        return current
      }
      return [...current, pointId]
    })
  }

  const selectedRoute = routeDetailQuery.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Rutas</h1>
        <p className="mt-1 text-sm text-slate-500">Optimiza, crea y monitorea rutas diarias para la operación de recolección.</p>
      </div>

      {[trucksQuery.error, driversQuery.error, pointsQuery.error, routesQuery.error].filter(Boolean).map((error, index) => (
        <Alert key={index}>{getErrorMessage(error)}</Alert>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Crear ruta</CardTitle>
          <p className="text-sm text-slate-500">Selecciona fecha, recursos y puntos activos. Máximo 25 puntos por optimización.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="route-date">Fecha</Label>
              <Input id="route-date" type="date" value={formDate} onChange={(event) => setFormDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="route-truck">Camión</Label>
              <Select id="route-truck" value={truckId} onChange={(event) => setTruckId(event.target.value)}>
                <option value="">Sin asignar</option>
                {activeTrucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>{truck.plate} {truck.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="route-driver">Conductor</Label>
              <Select id="route-driver" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
                <option value="">Sin asignar</option>
                {driversQuery.data?.map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.name}</option>
                ))}
              </Select>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Puntos seleccionados</p>
              <p className="mt-1 text-2xl font-semibold text-blue-700">{selectedCount} / 25</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="origin-lat">Latitud origen</Label>
              <Input id="origin-lat" type="number" step="0.000001" value={originLat} onChange={(event) => setOriginLat(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin-lng">Longitud origen</Label>
              <Input id="origin-lng" type="number" step="0.000001" value={originLng} onChange={(event) => setOriginLng(event.target.value)} />
            </div>
          </div>

          {pointsQuery.isLoading ? (
            <LoadingState label="Cargando puntos activos..." />
          ) : pointsQuery.data?.length ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="max-h-[480px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-4">
                  {Object.entries(groupedPoints).map(([clientName, points]) => (
                    <div key={clientName} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{clientName}</p>
                        <Badge variant="outline">{points.length} puntos</Badge>
                      </div>
                      <div className="space-y-2">
                        {points.map((point) => {
                          const checked = selectedPointIds.includes(point.id)
                          return (
                            <label key={point.id} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                              <input type="checkbox" checked={checked} onChange={() => togglePoint(point.id)} />
                              <span>
                                <span className="block font-medium text-slate-900">{point.name}</span>
                                <span className="block text-sm text-slate-500">{point.address || `${point.lat}, ${point.lng}`}</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => optimizeMutation.mutate()} disabled={selectedCount === 0 || optimizeMutation.isPending}>
                    {optimizeMutation.isPending ? 'Optimizando...' : 'Optimizar'}
                  </Button>
                  <Button onClick={() => createMutation.mutate()} disabled={selectedCount === 0 || createMutation.isPending}>
                    {createMutation.isPending ? 'Creando...' : 'Crear y asignar'}
                  </Button>
                </div>
                {preview ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                      Optimizador usado: <strong>{preview.optimizer}</strong>
                    </div>
                    <OrderedPointsMap points={preview.points} origin={{ lat: Number(originLat), lng: Number(originLng) }} title="Vista previa optimizada" />
                  </div>
                ) : (
                  <EmptyState title="Sin vista previa" description="Selecciona puntos y usa “Optimizar” para revisar el orden sugerido en el mapa." />
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="Sin puntos activos" description="Crea puntos activos desde “Clientes y puntos” para poder despachar rutas." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Rutas creadas</CardTitle>
            <p className="text-sm text-slate-500">Detalle, progreso y eliminación cuando no existen pesajes asociados.</p>
          </div>
          <div className="w-full max-w-xs space-y-2">
            <Label htmlFor="filter-date">Filtrar por fecha</Label>
            <Input id="filter-date" type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {routesQuery.isLoading ? (
            <LoadingState label="Cargando rutas..." />
          ) : routesQuery.data?.length ? (
            <TableWrapper>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Ruta</TableHeaderCell>
                    <TableHeaderCell>Estado</TableHeaderCell>
                    <TableHeaderCell>Camión</TableHeaderCell>
                    <TableHeaderCell>Conductor</TableHeaderCell>
                    <TableHeaderCell>Avance</TableHeaderCell>
                    <TableHeaderCell>Kg</TableHeaderCell>
                    <TableHeaderCell className="text-right">Acciones</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {routesQuery.data.map((route) => {
                    const percent = route.total_stops ? (route.visited_stops / route.total_stops) * 100 : 0
                    return (
                      <TableRow key={route.id}>
                        <TableCell className="font-medium text-slate-900">
                          #{route.id}
                          <div className="text-xs text-slate-500">{route.optimizer}</div>
                        </TableCell>
                        <TableCell><RouteStatusBadge status={route.status} /></TableCell>
                        <TableCell>{route.truck_label ?? 'Sin asignar'}</TableCell>
                        <TableCell>{route.driver_name ?? 'Sin asignar'}</TableCell>
                        <TableCell>
                          <div className="min-w-40 space-y-2">
                            <ProgressBar value={percent} />
                            <p className="text-xs text-slate-500">{route.visited_stops} / {route.total_stops}</p>
                          </div>
                        </TableCell>
                        <TableCell>{formatKg(route.total_kg)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setSelectedRouteId(route.id)}>
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableWrapper>
          ) : (
            <EmptyState title="Sin rutas" description="No hay rutas creadas para la fecha seleccionada." />
          )}
        </CardContent>
      </Card>

      <Modal open={selectedRouteId !== null} onOpenChange={(open) => !open && setSelectedRouteId(null)} className="max-w-6xl">
        <ModalHeader>
          <ModalTitle>Detalle de ruta {selectedRoute ? `#${selectedRoute.id}` : ''}</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-6">
          {routeDetailQuery.isLoading || !selectedRoute ? (
            <LoadingState label="Cargando detalle de ruta..." />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Estado</p>
                  <div className="mt-2"><RouteStatusBadge status={selectedRoute.status} /></div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Camión</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedRoute.truck_label ?? 'Sin asignar'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Conductor</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedRoute.driver_name ?? 'Sin asignar'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Kg recolectados</p>
                  <p className="mt-2 font-semibold text-slate-900">{formatKg(selectedRoute.total_kg)}</p>
                </div>
              </div>

              <OrderedPointsMap points={selectedRoute.stops} origin={selectedRoute.origin} title="Recorrido de la ruta" />

              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Secuencia</TableHeaderCell>
                      <TableHeaderCell>Punto</TableHeaderCell>
                      <TableHeaderCell>Cliente</TableHeaderCell>
                      <TableHeaderCell>Estado</TableHeaderCell>
                      <TableHeaderCell>Kg</TableHeaderCell>
                      <TableHeaderCell>Visitado</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {selectedRoute.stops.map((stop) => (
                      <TableRow key={stop.id}>
                        <TableCell>{stop.sequence}</TableCell>
                        <TableCell>
                          <p className="font-medium text-slate-900">{stop.point_name}</p>
                          <p className="text-xs text-slate-500">{stop.address}</p>
                        </TableCell>
                        <TableCell>{stop.client_name}</TableCell>
                        <TableCell><StopStatusBadge status={stop.status} /></TableCell>
                        <TableCell>{stop.kg ? formatKg(stop.kg) : '—'}</TableCell>
                        <TableCell>{formatDateTime(stop.visited_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setSelectedRouteId(null)}>
            Cerrar
          </Button>
          {selectedRoute ? (
            <Button variant="destructive" onClick={() => setDeleteRouteTarget(selectedRoute)}>
              Eliminar ruta
            </Button>
          ) : null}
        </ModalFooter>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRouteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteRouteTarget(null)
        }}
        title="Eliminar ruta"
        description="La ruta solo puede eliminarse si aún no tiene pesajes asociados. Si el backend lo impide, verás el mensaje exacto de la API."
        confirmLabel="Eliminar ruta"
        onConfirm={() => {
          if (deleteRouteTarget) deleteMutation.mutate(deleteRouteTarget.id)
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
