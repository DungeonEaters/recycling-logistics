import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import {
  createClient,
  createPoint,
  deleteClient,
  deletePoint,
  getClients,
  getPoints,
  updateClient,
  updatePoint,
} from '../api/client'
import type { Client, ClientInput, Point, PointInput } from '../api/types'
import { ConfirmDialog } from '../components/confirm-dialog'
import { EmptyState } from '../components/empty-state'
import { PointPickerMap } from '../components/maps'
import { LoadingState } from '../components/loading-state'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../components/ui/modal'
import { Select } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper } from '../components/ui/table'
import { Textarea } from '../components/ui/textarea'
import { useToast } from '../components/ui/toast'
import { getErrorMessage } from '../lib/format'

interface ClientFormState {
  id?: number
  name: string
  kind: string
  tax_id: string
  contact_name: string
  contact_phone: string
  active: boolean
}

interface PointFormState {
  id?: number
  client_id: string
  name: string
  address: string
  lat: string
  lng: string
  notes: string
  active: boolean
}

const defaultClientForm: ClientFormState = {
  name: '',
  kind: 'company',
  tax_id: '',
  contact_name: '',
  contact_phone: '',
  active: true,
}

const defaultPointForm: PointFormState = {
  client_id: '',
  name: '',
  address: '',
  lat: '-33.45',
  lng: '-70.66',
  notes: '',
  active: true,
}

export function ClientsPointsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showInactiveClients, setShowInactiveClients] = useState(false)
  const [showInactivePoints, setShowInactivePoints] = useState(false)
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [pointModalOpen, setPointModalOpen] = useState(false)
  const [clientForm, setClientForm] = useState<ClientFormState>(defaultClientForm)
  const [pointForm, setPointForm] = useState<PointFormState>(defaultPointForm)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'client' | 'point'; id: number; label: string } | null>(null)

  const clientsQuery = useQuery({ queryKey: ['clients'], queryFn: getClients })
  const pointsQuery = useQuery({
    queryKey: ['points', showInactivePoints],
    queryFn: () => getPoints(!showInactivePoints),
  })

  const visibleClients = useMemo(
    () => (showInactiveClients ? clientsQuery.data ?? [] : (clientsQuery.data ?? []).filter((client) => client.active)),
    [clientsQuery.data, showInactiveClients],
  )

  const activeClients = useMemo(() => (clientsQuery.data ?? []).filter((client) => client.active), [clientsQuery.data])

  const clientMutation = useMutation({
    mutationFn: (payload: ClientFormState) => {
      const body: ClientInput = {
        name: payload.name.trim(),
        kind: payload.kind,
        tax_id: payload.tax_id.trim() || null,
        contact_name: payload.contact_name.trim() || null,
        contact_phone: payload.contact_phone.trim() || null,
        active: payload.active,
      }
      return payload.id ? updateClient(payload.id, body) : createClient(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setClientModalOpen(false)
      setClientForm(defaultClientForm)
      toast({ title: 'Cliente guardado', variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible guardar el cliente', description: getErrorMessage(error), variant: 'error' }),
  })

  const pointMutation = useMutation({
    mutationFn: (payload: PointFormState) => {
      const body: PointInput = {
        client_id: Number(payload.client_id),
        name: payload.name.trim(),
        address: payload.address.trim(),
        lat: Number(payload.lat),
        lng: Number(payload.lng),
        notes: payload.notes.trim() || null,
        active: payload.active,
      }
      return payload.id ? updatePoint(payload.id, body) : createPoint(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points'] })
      setPointModalOpen(false)
      setPointForm(defaultPointForm)
      toast({ title: 'Punto guardado', variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible guardar el punto', description: getErrorMessage(error), variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'client' | 'point'; id: number }) => {
      if (type === 'client') return deleteClient(id)
      return deletePoint(id)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.type === 'client' ? 'clients' : 'points'] })
      setDeleteTarget(null)
      toast({ title: `${variables.type === 'client' ? 'Cliente' : 'Punto'} desactivado`, variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible eliminar', description: getErrorMessage(error), variant: 'error' }),
  })

  const openClientModal = (client?: Client) => {
    setClientForm(
      client
        ? {
            id: client.id,
            name: client.name,
            kind: client.kind,
            tax_id: client.tax_id ?? '',
            contact_name: client.contact_name ?? '',
            contact_phone: client.contact_phone ?? '',
            active: client.active,
          }
        : defaultClientForm,
    )
    setClientModalOpen(true)
  }

  const openPointModal = (point?: Point) => {
    setPointForm(
      point
        ? {
            id: point.id,
            client_id: String(point.client_id),
            name: point.name,
            address: point.address,
            lat: String(point.lat),
            lng: String(point.lng),
            notes: point.notes ?? '',
            active: point.active,
          }
        : defaultPointForm,
    )
    setPointModalOpen(true)
  }

  const submitClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clientMutation.mutate(clientForm)
  }

  const submitPoint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    pointMutation.mutate(pointForm)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Clientes y puntos</h1>
        <p className="mt-1 text-sm text-slate-500">Gestiona clientes, condominios y puntos de recolección con coordenadas GPS.</p>
      </div>

      {clientsQuery.error ? <Alert>{getErrorMessage(clientsQuery.error)}</Alert> : null}
      {pointsQuery.error ? <Alert>{getErrorMessage(pointsQuery.error)}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Clientes</CardTitle>
              <p className="text-sm text-slate-500">CRUD de clientes y condominios.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showInactiveClients}
                  onChange={(event) => setShowInactiveClients(event.target.checked)}
                />
                Mostrar inactivos
              </label>
              <Button variant="secondary" onClick={() => openClientModal()}>
                Nuevo cliente
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {clientsQuery.isLoading ? (
              <LoadingState label="Cargando clientes..." />
            ) : visibleClients.length ? (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Nombre</TableHeaderCell>
                      <TableHeaderCell>Tipo</TableHeaderCell>
                      <TableHeaderCell>Contacto</TableHeaderCell>
                      <TableHeaderCell>Estado</TableHeaderCell>
                      <TableHeaderCell className="text-right">Acciones</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {visibleClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium text-slate-900">{client.name}</TableCell>
                        <TableCell>{client.kind}</TableCell>
                        <TableCell>{client.contact_name ?? '—'}</TableCell>
                        <TableCell>{client.active ? 'Activo' : 'Inactivo'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openClientModal(client)}>
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget({ type: 'client', id: client.id, label: client.name })}
                            >
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
              <EmptyState title="Sin clientes" description="Crea el primer cliente para comenzar a cargar puntos de recolección." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Puntos de recolección</CardTitle>
              <p className="text-sm text-slate-500">Dirección, GPS, notas y cliente asociado.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showInactivePoints}
                  onChange={(event) => setShowInactivePoints(event.target.checked)}
                />
                Mostrar inactivos
              </label>
              <Button variant="secondary" onClick={() => openPointModal()} disabled={!activeClients.length}>
                Nuevo punto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pointsQuery.isLoading ? (
              <LoadingState label="Cargando puntos..." />
            ) : pointsQuery.data?.length ? (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Punto</TableHeaderCell>
                      <TableHeaderCell>Cliente</TableHeaderCell>
                      <TableHeaderCell>Dirección</TableHeaderCell>
                      <TableHeaderCell>Estado</TableHeaderCell>
                      <TableHeaderCell className="text-right">Acciones</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {pointsQuery.data.map((point) => (
                      <TableRow key={point.id}>
                        <TableCell className="font-medium text-slate-900">{point.name}</TableCell>
                        <TableCell>{point.client_name ?? '—'}</TableCell>
                        <TableCell>{point.address || '—'}</TableCell>
                        <TableCell>{point.active ? 'Activo' : 'Inactivo'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openPointModal(point)}>
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget({ type: 'point', id: point.id, label: point.name })}
                            >
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
              <EmptyState title="Sin puntos" description="Agrega puntos activos para poder optimizar rutas diarias." />
            )}
          </CardContent>
        </Card>
      </div>

      <Modal open={clientModalOpen} onOpenChange={setClientModalOpen}>
        <form onSubmit={submitClient}>
          <ModalHeader>
            <ModalTitle>{clientForm.id ? 'Editar cliente' : 'Nuevo cliente'}</ModalTitle>
          </ModalHeader>
          <ModalBody className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client-name">Nombre</Label>
              <Input id="client-name" value={clientForm.name} onChange={(event) => setClientForm((current) => ({ ...current, name: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-kind">Tipo</Label>
              <Select id="client-kind" value={clientForm.kind} onChange={(event) => setClientForm((current) => ({ ...current, kind: event.target.value }))}>
                <option value="company">Empresa</option>
                <option value="condominium">Condominio</option>
                <option value="other">Otro</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-tax">RUT</Label>
              <Input id="client-tax" value={clientForm.tax_id} onChange={(event) => setClientForm((current) => ({ ...current, tax_id: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-contact-name">Contacto</Label>
              <Input id="client-contact-name" value={clientForm.contact_name} onChange={(event) => setClientForm((current) => ({ ...current, contact_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-contact-phone">Teléfono</Label>
              <Input id="client-contact-phone" value={clientForm.contact_phone} onChange={(event) => setClientForm((current) => ({ ...current, contact_phone: event.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input type="checkbox" checked={clientForm.active} onChange={(event) => setClientForm((current) => ({ ...current, active: event.target.checked }))} />
              Cliente activo
            </label>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setClientModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={clientMutation.isPending}>
              {clientMutation.isPending ? 'Guardando...' : 'Guardar cliente'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal open={pointModalOpen} onOpenChange={setPointModalOpen} className="max-w-4xl">
        <form onSubmit={submitPoint}>
          <ModalHeader>
            <ModalTitle>{pointForm.id ? 'Editar punto' : 'Nuevo punto de recolección'}</ModalTitle>
          </ModalHeader>
          <ModalBody className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="point-client">Cliente</Label>
                <Select id="point-client" value={pointForm.client_id} onChange={(event) => setPointForm((current) => ({ ...current, client_id: event.target.value }))} required>
                  <option value="">Selecciona un cliente</option>
                  {activeClients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="point-name">Nombre del punto</Label>
                <Input id="point-name" value={pointForm.name} onChange={(event) => setPointForm((current) => ({ ...current, name: event.target.value }))} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="point-address">Dirección</Label>
                <Input id="point-address" value={pointForm.address} onChange={(event) => setPointForm((current) => ({ ...current, address: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="point-lat">Latitud</Label>
                <Input id="point-lat" type="number" step="0.000001" value={pointForm.lat} onChange={(event) => setPointForm((current) => ({ ...current, lat: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="point-lng">Longitud</Label>
                <Input id="point-lng" type="number" step="0.000001" value={pointForm.lng} onChange={(event) => setPointForm((current) => ({ ...current, lng: event.target.value }))} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="point-notes">Notas</Label>
                <Textarea id="point-notes" value={pointForm.notes} onChange={(event) => setPointForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                <input type="checkbox" checked={pointForm.active} onChange={(event) => setPointForm((current) => ({ ...current, active: event.target.checked }))} />
                Punto activo
              </label>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Ubicación en mapa</p>
              <PointPickerMap
                value={{ lat: Number(pointForm.lat), lng: Number(pointForm.lng) }}
                onSelect={(value) =>
                  setPointForm((current) => ({ ...current, lat: String(value.lat), lng: String(value.lng) }))
                }
              />
              <p className="text-xs text-slate-500">Haz clic en el mapa para fijar las coordenadas.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setPointModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pointMutation.isPending}>
              {pointMutation.isPending ? 'Guardando...' : 'Guardar punto'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={`Eliminar ${deleteTarget?.type === 'client' ? 'cliente' : 'punto'}`}
        description={`Se desactivará "${deleteTarget?.label ?? ''}" y dejará de aparecer por defecto en el panel.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget)
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
