import { Preferences } from '@capacitor/preferences'

import type { AuthSession, DriverRoute, QueuedWeighing, RouteCacheState } from '../types'

export interface StorageAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

export const STORAGE_KEYS = {
  auth: 'driver-auth-session',
  routeCache: 'driver-route-cache',
  queue: 'driver-weighing-queue',
} as const

export const preferencesStorage: StorageAdapter = {
  async get(key) {
    const { value } = await Preferences.get({ key })
    return value
  },
  async set(key, value) {
    await Preferences.set({ key, value })
  },
  async remove(key) {
    await Preferences.remove({ key })
  },
}

export class MemoryStorage implements StorageAdapter {
  private readonly data = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value)
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key)
  }
}

export async function readJson<T>(storage: StorageAdapter, key: string, fallback: T): Promise<T> {
  const raw = await storage.get(key)
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function writeJson<T>(storage: StorageAdapter, key: string, value: T): Promise<void> {
  await storage.set(key, JSON.stringify(value))
}

export function emptyRouteCache(): RouteCacheState {
  return {
    routes: [],
    selectedRouteId: null,
    updatedAt: null,
  }
}

export async function loadAuthState(storage: StorageAdapter): Promise<AuthSession | null> {
  return readJson<AuthSession | null>(storage, STORAGE_KEYS.auth, null)
}

export async function saveAuthState(storage: StorageAdapter, session: AuthSession): Promise<void> {
  await writeJson(storage, STORAGE_KEYS.auth, session)
}

export async function clearAuthState(storage: StorageAdapter): Promise<void> {
  await storage.remove(STORAGE_KEYS.auth)
}

export async function loadRouteCache(storage: StorageAdapter): Promise<RouteCacheState> {
  return readJson<RouteCacheState>(storage, STORAGE_KEYS.routeCache, emptyRouteCache())
}

export async function saveRouteCache(storage: StorageAdapter, cache: RouteCacheState): Promise<void> {
  await writeJson(storage, STORAGE_KEYS.routeCache, cache)
}

export async function mergeRouteIntoCache(storage: StorageAdapter, route: DriverRoute): Promise<RouteCacheState> {
  const current = await loadRouteCache(storage)
  const routes = current.routes.some((item) => item.id === route.id)
    ? current.routes.map((item) => (item.id === route.id ? route : item))
    : [...current.routes, route]
  const next: RouteCacheState = {
    routes,
    selectedRouteId: current.selectedRouteId ?? route.id,
    updatedAt: new Date().toISOString(),
  }
  await saveRouteCache(storage, next)
  return next
}

export async function loadQueuedWeighings(storage: StorageAdapter): Promise<QueuedWeighing[]> {
  return readJson<QueuedWeighing[]>(storage, STORAGE_KEYS.queue, [])
}
