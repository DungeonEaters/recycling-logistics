import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { fetchMyRoutes, skipStop as skipStopRequest } from '../api/routes'
import { syncWeighingsBatch } from '../api/weighings'
import { useAuth } from './AuthContext'
import { enqueueWeighing, generateClientUuid } from '../lib/queue'
import { createSyncManager, HttpSyncError, applyOptimisticWeighing } from '../lib/sync'
import {
  loadQueuedWeighings,
  loadRouteCache,
  mergeRouteIntoCache,
  preferencesStorage,
  saveRouteCache,
} from '../lib/storage'
import type { DriverRoute, MaterialCode, QueuedWeighing, RouteStop } from '../types'

interface SaveWeighingInput {
  routeId: number
  stop: RouteStop
  kg: number
  material: MaterialCode
  notes: string
}

interface DriverDataContextValue {
  routes: DriverRoute[]
  selectedRouteId: number | null
  selectedRoute: DriverRoute | null
  pendingQueue: QueuedWeighing[]
  offline: boolean
  loadingRoutes: boolean
  syncing: boolean
  cacheUpdatedAt: string | null
  lastRouteError: string | null
  selectRoute: (routeId: number) => Promise<void>
  refreshRoutes: () => Promise<void>
  saveWeighing: (input: SaveWeighingInput) => Promise<QueuedWeighing>
  syncNow: () => Promise<void>
  skipStop: (routeId: number, stopId: number) => Promise<void>
}

const DriverDataContext = createContext<DriverDataContextValue | undefined>(undefined)

export function DriverDataProvider({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth()
  const [routes, setRoutes] = useState<DriverRoute[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)
  const [pendingQueue, setPendingQueue] = useState<QueuedWeighing[]>([])
  const [offline, setOffline] = useState(!navigator.onLine)
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<string | null>(null)
  const [lastRouteError, setLastRouteError] = useState<string | null>(null)
  const syncManagerRef = useRef<ReturnType<typeof createSyncManager> | null>(null)
  const selectedRouteIdRef = useRef<number | null>(null)

  useEffect(() => {
    selectedRouteIdRef.current = selectedRouteId
  }, [selectedRouteId])

  const syncNow = useCallback(async () => {
    if (!session) {
      return
    }

    const manager = syncManagerRef.current
    if (!manager) {
      return
    }

    setSyncing(true)
    try {
      const outcome = await manager.syncNow()
      setPendingQueue(outcome.queue)
      if (outcome.status === 'unauthorized') {
        await logout()
      }
    } finally {
      setSyncing(false)
    }
  }, [logout, session])

  const refreshRoutes = useCallback(async () => {
    if (!session) {
      return
    }

    setLoadingRoutes(true)
    try {
      const remoteRoutes = await fetchMyRoutes(session.token)
      const currentSelected = selectedRouteIdRef.current
      const nextSelected = remoteRoutes.some((route) => route.id === currentSelected)
        ? currentSelected
        : (remoteRoutes[0]?.id ?? null)
      setRoutes(remoteRoutes)
      setSelectedRouteId(nextSelected)
      const updatedAt = new Date().toISOString()
      setCacheUpdatedAt(updatedAt)
      setLastRouteError(null)
      await saveRouteCache(preferencesStorage, {
        routes: remoteRoutes,
        selectedRouteId: nextSelected,
        updatedAt,
      })
    } catch (error) {
      const cached = await loadRouteCache(preferencesStorage)
      setRoutes(cached.routes)
      setSelectedRouteId(cached.selectedRouteId)
      setCacheUpdatedAt(cached.updatedAt)
      setLastRouteError(error instanceof Error ? error.message : 'No se pudo actualizar la ruta')
    } finally {
      setLoadingRoutes(false)
    }
  }, [session])

  useEffect(() => {
    if (!session) {
      setRoutes([])
      setSelectedRouteId(null)
      setPendingQueue([])
      setCacheUpdatedAt(null)
      setLastRouteError(null)
      syncManagerRef.current = null
      return
    }

    syncManagerRef.current = createSyncManager({
      storage: preferencesStorage,
      fetchBatch: async (items) => {
        try {
          return await syncWeighingsBatch(session.token, items)
        } catch (error) {
          if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
            throw new HttpSyncError(error.status, error.message)
          }
          throw error
        }
      },
      onQueueUpdated: setPendingQueue,
    })

    void (async () => {
      const [cached, queued] = await Promise.all([
        loadRouteCache(preferencesStorage),
        loadQueuedWeighings(preferencesStorage),
      ])
      setRoutes(cached.routes)
      setSelectedRouteId(cached.selectedRouteId)
      setCacheUpdatedAt(cached.updatedAt)
      setPendingQueue(queued)
      await refreshRoutes()
      await syncNow()
    })()
  }, [session, refreshRoutes, syncNow])

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false)
      void refreshRoutes()
      void syncNow()
    }

    const handleOffline = () => {
      setOffline(true)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncNow()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refreshRoutes, syncNow])

  useEffect(() => {
    if (pendingQueue.length === 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      void syncNow()
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [pendingQueue.length, syncNow])

  const selectRoute = useCallback(async (routeId: number) => {
    setSelectedRouteId(routeId)
    const cached = await loadRouteCache(preferencesStorage)
    await saveRouteCache(preferencesStorage, {
      ...cached,
      selectedRouteId: routeId,
    })
  }, [])

  const saveWeighing = useCallback(
    async ({ routeId, stop, kg, material, notes }: SaveWeighingInput) => {
      const queued: QueuedWeighing = {
        id: generateClientUuid(),
        stopId: stop.id,
        routeId,
        pointName: stop.point_name,
        address: stop.address,
        sequence: stop.sequence,
        kg,
        material,
        notes,
        weighedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        error: null,
      }

      const nextQueue = await enqueueWeighing(preferencesStorage, queued)
      setPendingQueue(nextQueue)

      const nextRoutes = applyOptimisticWeighing(routes, queued)
      setRoutes(nextRoutes)
      const nextCache = {
        routes: nextRoutes,
        selectedRouteId,
        updatedAt: new Date().toISOString(),
      }
      setCacheUpdatedAt(nextCache.updatedAt)
      await saveRouteCache(preferencesStorage, nextCache)
      void syncNow()
      return queued
    },
    [routes, selectedRouteId, syncNow],
  )

  const skipStop = useCallback(
    async (routeId: number, stopId: number) => {
      if (!session) {
        return
      }
      if (!navigator.onLine) {
        throw new Error('Omitir una parada requiere conexión. El pesaje sí funciona offline.')
      }

      const updatedRoute = await skipStopRequest(session.token, routeId, stopId)
      const nextCache = await mergeRouteIntoCache(preferencesStorage, updatedRoute)
      setRoutes(nextCache.routes)
      setSelectedRouteId(nextCache.selectedRouteId)
      setCacheUpdatedAt(nextCache.updatedAt)
    },
    [session],
  )

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null,
    [routes, selectedRouteId],
  )

  const value = useMemo(
    () => ({
      routes,
      selectedRouteId,
      selectedRoute,
      pendingQueue,
      offline,
      loadingRoutes,
      syncing,
      cacheUpdatedAt,
      lastRouteError,
      selectRoute,
      refreshRoutes,
      saveWeighing,
      syncNow,
      skipStop,
    }),
    [
      cacheUpdatedAt,
      lastRouteError,
      loadingRoutes,
      offline,
      pendingQueue,
      refreshRoutes,
      routes,
      saveWeighing,
      selectRoute,
      selectedRoute,
      selectedRouteId,
      skipStop,
      syncNow,
      syncing,
    ],
  )

  return <DriverDataContext.Provider value={value}>{children}</DriverDataContext.Provider>
}

export function useDriverData() {
  const context = useContext(DriverDataContext)
  if (!context) {
    throw new Error('useDriverData must be used within DriverDataProvider')
  }
  return context
}
