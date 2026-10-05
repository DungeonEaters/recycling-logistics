import type { BatchWeighingItem, BatchWeighingResult, DriverRoute, QueuedWeighing, RouteStatus, StopStatus } from '../types'
import { applyBatchResults } from './queue'
import { loadQueuedWeighings, type StorageAdapter } from './storage'

export class HttpSyncError extends Error {
  public readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface SyncOutcome {
  status: 'idle' | 'synced' | 'partial' | 'network-error' | 'server-error' | 'unauthorized'
  processed: number
  remaining: number
  queue: QueuedWeighing[]
}

export interface SyncManagerDependencies {
  storage: StorageAdapter
  fetchBatch: (items: BatchWeighingItem[]) => Promise<BatchWeighingResult[]>
  onQueueUpdated?: (queue: QueuedWeighing[]) => void
}

export function toBatchPayload(items: QueuedWeighing[]): BatchWeighingItem[] {
  return items.map((item) => ({
    id: item.id,
    stop_id: item.stopId,
    kg: item.kg,
    material: item.material,
    notes: item.notes || null,
    weighed_at: item.weighedAt,
  }))
}

export function applyOptimisticWeighing(routes: DriverRoute[], item: Pick<QueuedWeighing, 'routeId' | 'stopId' | 'kg' | 'weighedAt'>): DriverRoute[] {
  return routes.map((route) => {
    if (route.id !== item.routeId) {
      return route
    }

    const stops = route.stops.map((stop) => {
      if (stop.id !== item.stopId) {
        return stop
      }

      return {
        ...stop,
        status: 'visited' as StopStatus,
        visited_at: item.weighedAt,
        kg: Number(((stop.kg ?? 0) + item.kg).toFixed(2)),
      }
    })

    const visitedStops = stops.filter((stop) => stop.status !== 'pending').length
    const totalKg = Number(stops.reduce((sum, stop) => sum + (stop.kg ?? 0), 0).toFixed(2))
    let status: RouteStatus = 'planned'

    if (visitedStops === stops.length && stops.length > 0) {
      status = 'completed'
    } else if (visitedStops > 0) {
      status = 'in_progress'
    }

    return {
      ...route,
      stops,
      visited_stops: visitedStops,
      total_kg: totalKg,
      status,
    }
  })
}

export function createSyncManager(deps: SyncManagerDependencies) {
  let inFlight: Promise<SyncOutcome> | null = null

  const syncNow = (): Promise<SyncOutcome> => {
    if (inFlight) {
      return inFlight
    }

    inFlight = (async () => {
      try {
        const queue = await loadQueuedWeighings(deps.storage)
        if (queue.length === 0) {
          return { status: 'idle', processed: 0, remaining: 0, queue } as SyncOutcome
        }

        try {
          const results = await deps.fetchBatch(toBatchPayload(queue))
          const nextQueue = await applyBatchResults(deps.storage, results)
          deps.onQueueUpdated?.(nextQueue)
          return {
            status: nextQueue.length === 0 ? 'synced' : 'partial',
            processed: queue.length - nextQueue.length,
            remaining: nextQueue.length,
            queue: nextQueue,
          } as SyncOutcome
        } catch (error) {
          const currentQueue = await loadQueuedWeighings(deps.storage)
          return {
            status: classifySyncError(error),
            processed: 0,
            remaining: currentQueue.length,
            queue: currentQueue,
          } as SyncOutcome
        }
      } finally {
        inFlight = null
      }
    })()

    return inFlight
  }

  return {
    syncNow,
    isSyncing: () => inFlight !== null,
  }
}

function classifySyncError(error: unknown): SyncOutcome['status'] {
  if (error instanceof HttpSyncError) {
    if (error.status === 401) {
      return 'unauthorized'
    }

    if (error.status >= 500) {
      return 'server-error'
    }
  }

  return 'network-error'
}
