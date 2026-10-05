import { clearStoredSession, getStoredToken } from '../lib/auth'
import type {
  Client,
  ClientInput,
  CreateRouteInput,
  DashboardSummary,
  LoginInput,
  OptimizeInput,
  OptimizeResponse,
  Point,
  PointInput,
  RouteSummary,
  TokenResponse,
  Truck,
  TruckInput,
  User,
  UserCreateInput,
} from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

function notifyAuthChange() {
  clearStoredSession()
  window.dispatchEvent(new Event('auth:changed'))
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  const url = new URL(path, API_URL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}

async function parseError(response: Response) {
  try {
    const data = (await response.json()) as { detail?: unknown }
    if (typeof data.detail === 'string') return data.detail
    if (data.detail != null) return JSON.stringify(data.detail)
  } catch {
    const text = await response.text()
    if (text) return text
  }
  return 'No fue posible completar la solicitud'
}

async function request<T>(
  path: string,
  init?: RequestInit,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(buildUrl(path, params), {
    ...init,
    headers,
  })

  if (response.status === 401) {
    notifyAuthChange()
    throw new ApiError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function login(data: LoginInput) {
  return request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getMe() {
  return request<User>('/auth/me')
}

export async function getClients() {
  return request<Client[]>('/clients')
}

export async function createClient(data: ClientInput) {
  return request<Client>('/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateClient(clientId: number, data: ClientInput) {
  return request<Client>(`/clients/${clientId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteClient(clientId: number) {
  return request<void>(`/clients/${clientId}`, { method: 'DELETE' })
}

export async function getPoints(activeOnly = false) {
  return request<Point[]>('/points', undefined, { active_only: activeOnly })
}

export async function createPoint(data: PointInput) {
  return request<Point>('/points', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePoint(pointId: number, data: PointInput) {
  return request<Point>(`/points/${pointId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePoint(pointId: number) {
  return request<void>(`/points/${pointId}`, { method: 'DELETE' })
}

export async function getTrucks() {
  return request<Truck[]>('/trucks')
}

export async function createTruck(data: TruckInput) {
  return request<Truck>('/trucks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTruck(truckId: number, data: TruckInput) {
  return request<Truck>(`/trucks/${truckId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTruck(truckId: number) {
  return request<void>(`/trucks/${truckId}`, { method: 'DELETE' })
}

export async function getDrivers() {
  return request<User[]>('/users', undefined, { role: 'driver' })
}

export async function createDriver(data: Omit<UserCreateInput, 'role'>) {
  return request<User>('/users', {
    method: 'POST',
    body: JSON.stringify({ ...data, role: 'driver' }),
  })
}

export async function getDashboard(date?: string) {
  return request<DashboardSummary>('/dashboard', undefined, { date })
}

export async function getRoutes(date?: string) {
  return request<RouteSummary[]>('/routes', undefined, { date })
}

export async function getRoute(routeId: number) {
  return request<RouteSummary>(`/routes/${routeId}`)
}

export async function optimizeRoute(data: OptimizeInput) {
  return request<OptimizeResponse>('/routes/optimize', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function createRoute(data: CreateRouteInput) {
  return request<RouteSummary>('/routes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteRoute(routeId: number) {
  return request<void>(`/routes/${routeId}`, { method: 'DELETE' })
}

export async function downloadTraceabilityCsv(params: { from: string; to: string; clientId?: number | null }) {
  const token = getStoredToken()
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(
    buildUrl('/reports/traceability.csv', {
      from: params.from,
      to: params.to,
      client_id: params.clientId,
    }),
    { headers },
  )

  if (response.status === 401) {
    notifyAuthChange()
    throw new ApiError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response))
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^\"]+)"?/) ?? null
  return {
    blob,
    filename: match?.[1] ?? `trazabilidad_${params.from}_${params.to}.csv`,
  }
}
