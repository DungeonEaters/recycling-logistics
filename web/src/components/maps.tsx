import L from 'leaflet'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { Fragment } from 'react'
import type { LatLng, Point, RouteSummary, RouteStop } from '../api/types'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

const SANTIAGO: [number, number] = [-33.45, -70.66]
const stopColors = {
  pending: '#f59e0b',
  visited: '#10b981',
  skipped: '#ef4444',
} as const
const routeColors = ['#2563eb', '#7c3aed', '#0f766e', '#ea580c', '#db2777', '#0891b2']

function FitBounds({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) {
      map.setView(SANTIAGO, 11)
      return
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14)
      return
    }
    map.fitBounds(
      L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number])),
      { padding: [28, 28] },
    )
  }, [map, points])

  return null
}

function numberedIcon(label: string, kind: 'default' | 'origin' | 'pending' | 'visited' | 'skipped' = 'default') {
  const classes = ['map-pin']
  if (kind !== 'default') classes.push(`map-pin--${kind}`)
  return L.divIcon({
    className: 'border-0 bg-transparent',
    html: `<div class="${classes.join(' ')}">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function MapClickHandler({ onSelect }: { onSelect: (position: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onSelect({ lat: Number(event.latlng.lat.toFixed(6)), lng: Number(event.latlng.lng.toFixed(6)) })
    },
  })
  return null
}

export function PointPickerMap({ value, onSelect }: { value: LatLng; onSelect: (value: LatLng) => void }) {
  return (
    <div className="h-64 overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={[value.lat, value.lng]} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={onSelect} />
        <FitBounds points={[value]} />
        <Marker position={[value.lat, value.lng]} icon={numberedIcon('📍', 'origin')}>
          <Popup>Haz clic en el mapa para actualizar la ubicación.</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

export function OrderedPointsMap({
  points,
  origin,
  title,
}: {
  points: Array<Pick<Point, 'id' | 'name' | 'address' | 'lat' | 'lng'> | RouteStop>
  origin?: LatLng | null
  title?: string
}) {
  const linePoints = [origin, ...points].filter(Boolean).map((item) => [item!.lat, item!.lng] as [number, number])
  const bounds = [origin, ...points].filter(Boolean) as Array<{ lat: number; lng: number }>

  return (
    <Card>
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent>
        <div className="h-[360px] overflow-hidden rounded-2xl border border-slate-200">
          <MapContainer center={SANTIAGO} zoom={11} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={bounds} />
            {origin ? (
              <Marker position={[origin.lat, origin.lng]} icon={numberedIcon('O', 'origin')}>
                <Popup>Origen</Popup>
              </Marker>
            ) : null}
            {linePoints.length >= 2 ? <Polyline positions={linePoints} pathOptions={{ color: '#2563eb', weight: 4 }} /> : null}
            {points.map((point, index) => (
              <Marker
                key={`${point.id}-${index}`}
                position={[point.lat, point.lng]}
                icon={numberedIcon(String(index + 1), 'default')}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">{'point_name' in point ? point.point_name : point.name}</p>
                    {'client_name' in point ? <p>{point.client_name}</p> : null}
                    <p>{point.address}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function DayRoutesMap({ routes }: { routes: RouteSummary[] }) {
  const bounds = routes.flatMap((route) => route.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })))

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Mapa de rutas del día</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200">
          <MapContainer center={SANTIAGO} zoom={11} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={bounds} />
            {routes.map((route, index) => {
              const positions = route.stops.map((stop) => [stop.lat, stop.lng] as [number, number])
              return (
                <Fragment key={route.id}>
                  {positions.length >= 2 ? (
                    <Polyline positions={positions} pathOptions={{ color: routeColors[index % routeColors.length], weight: 4 }} />
                  ) : null}
                  {route.stops.map((stop) => (
                    <CircleMarker
                      key={stop.id}
                      center={[stop.lat, stop.lng]}
                      radius={10}
                      pathOptions={{ color: '#fff', weight: 2, fillColor: stopColors[stop.status], fillOpacity: 1 }}
                    >
                      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                        #{stop.sequence}
                      </Tooltip>
                      <Popup>
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">{stop.point_name}</p>
                          <p>{stop.client_name}</p>
                          <p>Ruta #{route.id}</p>
                          <p>Estado: {stop.status}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </Fragment>
              )
            })}
          </MapContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" /> Pendiente</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Visitado</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-500" /> Omitido</span>
        </div>
      </CardContent>
    </Card>
  )
}
