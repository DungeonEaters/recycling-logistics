export type UserRole = 'admin' | 'driver'
export type RouteStatus = 'planned' | 'in_progress' | 'completed'
export type StopStatus = 'pending' | 'visited' | 'skipped'
export type MaterialCode = 'plastico' | 'pet1' | 'hdpe2' | 'mixto'

export interface User {
  id: number
  email: string
  name: string
  role: UserRole
  active: boolean
}

export interface AuthSession {
  token: string
  user: User
}

export interface LatLng {
  lat: number
  lng: number
}

export interface RouteStop {
  id: number
  point_id: number
  sequence: number
  status: StopStatus
  visited_at: string | null
  point_name: string
  client_name: string
  address: string
  lat: number
  lng: number
  kg: number | null
}

export interface DriverRoute {
  id: number
  date: string
  status: RouteStatus
  optimizer: string
  truck_id: number | null
  truck_label: string | null
  driver_id: number | null
  driver_name: string | null
  origin: LatLng | null
  total_stops: number
  visited_stops: number
  total_kg: number
  stops: RouteStop[]
}

export interface RouteCacheState {
  routes: DriverRoute[]
  selectedRouteId: number | null
  updatedAt: string | null
}

export interface QueuedWeighing {
  id: string
  stopId: number
  routeId: number
  pointName: string
  address: string
  sequence: number
  kg: number
  material: MaterialCode
  notes: string
  weighedAt: string
  createdAt: string
  error: string | null
}

export interface BatchWeighingItem {
  id: string
  stop_id: number
  kg: number
  material: string
  notes: string | null
  weighed_at: string
}

export interface BatchWeighingResult {
  id: string
  ok: boolean
  duplicate: boolean
  error: string | null
}
