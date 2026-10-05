export type Role = 'admin' | 'driver'
export type RouteStatus = 'planned' | 'in_progress' | 'completed'
export type StopStatus = 'pending' | 'visited' | 'skipped'

export interface User {
  id: number
  email: string
  name: string
  role: Role
  active: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface Client {
  id: number
  name: string
  kind: string
  tax_id: string | null
  contact_name: string | null
  contact_phone: string | null
  active: boolean
}

export interface ClientInput {
  name: string
  kind: string
  tax_id: string | null
  contact_name: string | null
  contact_phone: string | null
  active: boolean
}

export interface Point {
  id: number
  client_id: number
  client_name: string | null
  name: string
  address: string
  lat: number
  lng: number
  notes: string | null
  active: boolean
}

export interface PointInput {
  client_id: number
  name: string
  address: string
  lat: number
  lng: number
  notes: string | null
  active: boolean
}

export interface Truck {
  id: number
  plate: string
  name: string
  capacity_kg: number | null
  active: boolean
}

export interface TruckInput {
  plate: string
  name: string
  capacity_kg: number | null
  active: boolean
}

export interface UserCreateInput {
  email: string
  name: string
  password: string
  role: Role
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

export interface RouteSummary {
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

export interface DashboardRouteProgress {
  route_id: number
  truck_label: string | null
  driver_name: string | null
  status: RouteStatus
  total_stops: number
  visited_stops: number
  kg: number
}

export interface DashboardSummary {
  date: string
  routes: number
  total_stops: number
  visited_stops: number
  pending_stops: number
  total_kg: number
  by_route: DashboardRouteProgress[]
}

export interface OptimizeInput {
  point_ids: number[]
  origin: LatLng | null
}

export interface OptimizeResponse {
  optimizer: 'google' | 'local' | string
  ordered_point_ids: number[]
  points: Point[]
}

export interface CreateRouteInput {
  date: string
  truck_id: number | null
  driver_id: number | null
  point_ids: number[]
  origin: LatLng | null
  optimize: boolean
}
