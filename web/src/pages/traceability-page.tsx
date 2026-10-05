import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { downloadTraceabilityCsv, getClients } from '../api/client'
import { EmptyState } from '../components/empty-state'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { useToast } from '../components/ui/toast'
import { getErrorMessage, todayString } from '../lib/format'

export function TraceabilityPage() {
  const today = todayString()
  const { toast } = useToast()
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [clientId, setClientId] = useState('')
  const clientsQuery = useQuery({ queryKey: ['clients'], queryFn: getClients })

  const downloadMutation = useMutation({
    mutationFn: () =>
      downloadTraceabilityCsv({
        from: fromDate,
        to: toDate,
        clientId: clientId ? Number(clientId) : null,
      }),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast({ title: 'Reporte descargado', description: filename, variant: 'success' })
    },
    onError: (error) => toast({ title: 'No fue posible descargar el reporte', description: getErrorMessage(error), variant: 'error' }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Trazabilidad</h1>
        <p className="mt-1 text-sm text-slate-500">Exporta el histórico de pesajes para auditoría o soporte a certificados.</p>
      </div>

      {clientsQuery.error ? <Alert>{getErrorMessage(clientsQuery.error)}</Alert> : null}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Descargar CSV</CardTitle>
          <CardDescription>El archivo se descarga autenticado usando el token del panel y respeta el nombre enviado por el backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="trace-from">Desde</Label>
              <Input id="trace-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trace-to">Hasta</Label>
              <Input id="trace-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trace-client">Cliente (opcional)</Label>
              <Select id="trace-client" value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Todos los clientes</option>
                {clientsQuery.data?.filter((client) => client.active).map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => downloadMutation.mutate()} disabled={downloadMutation.isPending}>
              {downloadMutation.isPending ? 'Descargando...' : 'Descargar trazabilidad'}
            </Button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            El reporte incluye cliente, punto, coordenadas, material, kilos, conductor, camión y ruta para el rango elegido.
          </div>
        </CardContent>
      </Card>

      {!clientsQuery.isLoading && !(clientsQuery.data?.length) ? (
        <EmptyState title="Sin clientes" description="Primero crea clientes para luego filtrar reportes por entidad." />
      ) : null}
    </div>
  )
}
