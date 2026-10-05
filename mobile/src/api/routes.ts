import type { DriverRoute } from '../types'
import { apiRequest } from './client'

export async function fetchMyRoutes(token: string, date?: string): Promise<DriverRoute[]> {
  const params = new URLSearchParams()
  if (date) {
    params.set('date', date)
  }

  const query = params.toString()
  return apiRequest<DriverRoute[]>(`/routes/mine${query ? `?${query}` : ''}`, {}, token)
}

export async function fetchRoute(token: string, routeId: number): Promise<DriverRoute> {
  return apiRequest<DriverRoute>(`/routes/${routeId}`, {}, token)
}

export async function skipStop(token: string, routeId: number, stopId: number): Promise<DriverRoute> {
  return apiRequest<DriverRoute>(`/routes/${routeId}/stops/${stopId}/skip`, { method: 'POST' }, token)
}
