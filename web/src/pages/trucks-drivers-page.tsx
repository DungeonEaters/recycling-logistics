import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { createDriver, createTruck, deleteTruck, getDrivers, getTrucks, updateTruck } from '../api/client'
import type { Truck, TruckInput } from '../api/types'
import { ConfirmDialog } from '../components/confirm-dialog'
import { EmptyState } from '../components/empty-state'
import { LoadingState } from '../components/loading-state'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../components/ui/modal'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper } from '../components/ui/table'
import { useToast } from '../components/ui/toast'
import { formatKg, getErrorMessage } from '../lib/format'

interface TruckFormState {
  id?: number
  plate: string
  name: string
  capacity_kg: string
  active: boolean
}

interface DriverFormState {
  email: string
  name: string
  password: string
}

const defaultTruckForm: TruckFormState = {
  plate: '',
  name: '',
  capacity_kg: '',
  active: true,
}

const defaultDriverForm: DriverFormState = {
  email: '',
  name: '',
  password: '',
}

export function TrucksDriversPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [truckModalOpen, setTruckModalOpen] = useState(false)
  const [truckForm, setTruckForm] = useState<TruckFormState>(defaultTruckForm)
  const [driverForm, setDriverForm] = useState<DriverFormState>(defaultDriverForm)
  const [deleteTruckTarget, setDeleteTruckTarget] = useState<Truck | null>(null)

  const trucksQuery = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })
  const driversQuery = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })
  const activeTrucks = useMemo(() => (trucksQuery.data ?? []).filter((truck) => truck.active), [trucksQuery.data])

  const truckMutation = useMutation({
    mutationFn: (payload: TruckFormState) => {
      const body: TruckInput = {
        plate: payload.plate.trim(),
        name: payload.name.trim(),
        capacity_kg: payload.capacity_kg.trim() ? Number(payload.capacity_kg) : null,
        active: payload.active,
      }
      return payload.id ? updateTruck(payload.id, body) : createTruck(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] })
      setTruckModalOpen(false)
      setTruckForm(defaultTruckForm)
      toast({ title: 'Camión guardado', variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible guardar el camión', description: getErrorMessage(error), variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (truckId: number) => deleteTruck(truckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] })
      setDeleteTruckTarget(null)
      toast({ title: 'Camión desactivado', variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible eliminar el camión', description: getErrorMessage(error), variant: 'error' }),
  })

  const driverMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      setDriverForm(defaultDriverForm)
      toast({ title: 'Conductor creado', variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible crear el conductor', description: getErrorMessage(error), variant: 'error' }),
  })

  const openTruckModal = (truck?: Truck) => {
    setTruckForm(
      truck
        ? {
            id: truck.id,
            plate: truck.plate,
            name: truck.name,
            capacity_kg: truck.capacity_kg ? String(truck.capacity_kg) : '',
            active: truck.active,
          }
        : defaultTruckForm,
    )
    setTruckModalOpen(true)
  }

  const submitTruck = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    truckMutation.mutate(truckForm)
  }

  const submitDriver = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    driverMutation.mutate(driverForm)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Camiones y conductores</h1>
        <p className="mt-1 text-sm text-slate-500">Administra la flota y da de alta conductores para asignarlos a rutas.</p>
      </div>

      {trucksQuery.error ? <Alert>{getErrorMessage(trucksQuery.error)}</Alert> : null}
      {driversQuery.error ? <Alert>{getErrorMessage(driversQuery.error)}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Camiones</CardTitle>
              <p className="text-sm text-slate-500">CRUD de flota disponible para despacho.</p>
            </div>
            <Button variant="secondary" onClick={() => openTruckModal()}>
              Nuevo camión
            </Button>
          </CardHeader>
          <CardContent>
            {trucksQuery.isLoading ? (
              <LoadingState label="Cargando camiones..." />
            ) : activeTrucks.length ? (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Patente</TableHeaderCell>
                      <TableHeaderCell>Nombre</TableHeaderCell>
                      <TableHeaderCell>Capacidad</TableHeaderCell>
                      <TableHeaderCell className="text-right">Acciones</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {activeTrucks.map((truck) => (
                      <TableRow key={truck.id}>
                        <TableCell className="font-medium text-slate-900">{truck.plate}</TableCell>
                        <TableCell>{truck.name || '—'}</TableCell>
                        <TableCell>{truck.capacity_kg ? formatKg(truck.capacity_kg) : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openTruckModal(truck)}>
                              Editar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTruckTarget(truck)}>
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            ) : (
              <EmptyState title="Sin camiones activos" description="Agrega al menos un camión para asignarlo a rutas." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conductores</CardTitle>
            <p className="text-sm text-slate-500">Listado y alta de usuarios con rol chofer.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4 rounded-2xl border border-slate-200 p-4" onSubmit={submitDriver}>
              <div className="space-y-2">
                <Label htmlFor="driver-name">Nombre</Label>
                <Input id="driver-name" value={driverForm.name} onChange={(event) => setDriverForm((current) => ({ ...current, name: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-email">Correo</Label>
                <Input id="driver-email" type="email" value={driverForm.email} onChange={(event) => setDriverForm((current) => ({ ...current, email: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-password">Contraseña</Label>
                <Input id="driver-password" type="password" minLength={6} value={driverForm.password} onChange={(event) => setDriverForm((current) => ({ ...current, password: event.target.value }))} required />
              </div>
              <Button type="submit" fullWidth disabled={driverMutation.isPending}>
                {driverMutation.isPending ? 'Creando...' : 'Crear conductor'}
              </Button>
            </form>

            {driversQuery.isLoading ? (
              <LoadingState label="Cargando conductores..." />
            ) : driversQuery.data?.length ? (
              <div className="space-y-3">
                {driversQuery.data.map((driver) => (
                  <div key={driver.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <p className="font-semibold text-slate-900">{driver.name}</p>
                    <p className="text-sm text-slate-500">{driver.email}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Sin conductores" description="Crea el primer usuario chofer para empezar a despachar rutas." />
            )}
          </CardContent>
        </Card>
      </div>

      <Modal open={truckModalOpen} onOpenChange={setTruckModalOpen} className="max-w-xl">
        <form onSubmit={submitTruck}>
          <ModalHeader>
            <ModalTitle>{truckForm.id ? 'Editar camión' : 'Nuevo camión'}</ModalTitle>
          </ModalHeader>
          <ModalBody className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="truck-plate">Patente</Label>
              <Input id="truck-plate" value={truckForm.plate} onChange={(event) => setTruckForm((current) => ({ ...current, plate: event.target.value.toUpperCase() }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="truck-name">Nombre</Label>
              <Input id="truck-name" value={truckForm.name} onChange={(event) => setTruckForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="truck-capacity">Capacidad (kg)</Label>
              <Input id="truck-capacity" type="number" min="0" step="0.1" value={truckForm.capacity_kg} onChange={(event) => setTruckForm((current) => ({ ...current, capacity_kg: event.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={truckForm.active} onChange={(event) => setTruckForm((current) => ({ ...current, active: event.target.checked }))} />
              Camión activo
            </label>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setTruckModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={truckMutation.isPending}>
              {truckMutation.isPending ? 'Guardando...' : 'Guardar camión'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTruckTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTruckTarget(null)
        }}
        title="Eliminar camión"
        description={`Se desactivará ${deleteTruckTarget?.plate ?? ''}.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteTruckTarget) deleteMutation.mutate(deleteTruckTarget.id)
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
