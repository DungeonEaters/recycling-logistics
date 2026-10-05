import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DriverRoute, QueuedWeighing } from '../types'
import { enqueueWeighing } from './queue'
import { applyOptimisticWeighing, createSyncManager, HttpSyncError } from './sync'
import { loadQueuedWeighings, MemoryStorage } from './storage'

function buildQueuedWeighing(overrides: Partial<QueuedWeighing> = {}): QueuedWeighing {
  return {
    id: 'w-1',
    stopId: 11,
    routeId: 7,
    pointName: 'Torre A',
    address: 'Av. Demo 123',
    sequence: 1,
    kg: 12.5,
    material: 'plastico',
    notes: '',
    weighedAt: '2026-10-04T12:00:00.000Z',
    createdAt: '2026-10-04T12:00:00.000Z',
    error: null,
    ...overrides,
  }
}

function buildRoute(): DriverRoute {
  return {
    id: 7,
    date: '2026-10-04',
    status: 'planned',
    optimizer: 'none',
    truck_id: 1,
    truck_label: 'ABCD-12 Camión 1',
    driver_id: 2,
    driver_name: 'Carlos Chofer',
    origin: null,
    total_stops: 2,
    visited_stops: 0,
    total_kg: 0,
    stops: [
      {
        id: 11,
        point_id: 101,
        sequence: 1,
        status: 'pending',
        visited_at: null,
        point_name: 'Torre A',
        client_name: 'Cliente Demo',
        address: 'Av. Demo 123',
        lat: -33.4,
        lng: -70.6,
        kg: null,
      },
      {
        id: 12,
        point_id: 102,
        sequence: 2,
        status: 'pending',
        visited_at: null,
        point_name: 'Torre B',
        client_name: 'Cliente Demo',
        address: 'Av. Demo 456',
        lat: -33.5,
        lng: -70.7,
        kg: null,
      },
    ],
  }
}

describe('queue + sync', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('persists enqueued weighings', async () => {
    const item = buildQueuedWeighing()

    await enqueueWeighing(storage, item)

    await expect(loadQueuedWeighings(storage)).resolves.toEqual([item])
  })

  it('clears queue after a successful batch', async () => {
    const item = buildQueuedWeighing()
    await enqueueWeighing(storage, item)

    const sync = createSyncManager({
      storage,
      fetchBatch: vi.fn().mockResolvedValue([{ id: item.id, ok: true, duplicate: false, error: null }]),
    })

    const result = await sync.syncNow()

    expect(result.status).toBe('synced')
    await expect(loadQueuedWeighings(storage)).resolves.toEqual([])
  })

  it('treats duplicates as synced items', async () => {
    const item = buildQueuedWeighing()
    await enqueueWeighing(storage, item)

    const sync = createSyncManager({
      storage,
      fetchBatch: vi.fn().mockResolvedValue([{ id: item.id, ok: true, duplicate: true, error: null }]),
    })

    await sync.syncNow()

    await expect(loadQueuedWeighings(storage)).resolves.toEqual([])
  })

  it('keeps per-item errors in the queue', async () => {
    const item = buildQueuedWeighing()
    await enqueueWeighing(storage, item)

    const sync = createSyncManager({
      storage,
      fetchBatch: vi.fn().mockResolvedValue([{ id: item.id, ok: false, duplicate: false, error: 'Stop not found' }]),
    })

    const result = await sync.syncNow()

    expect(result.status).toBe('partial')
    await expect(loadQueuedWeighings(storage)).resolves.toEqual([{ ...item, error: 'Stop not found' }])
  })

  it('keeps the queue on network failures', async () => {
    const item = buildQueuedWeighing()
    await enqueueWeighing(storage, item)

    const sync = createSyncManager({
      storage,
      fetchBatch: vi.fn().mockRejectedValue(new Error('offline')),
    })

    const result = await sync.syncNow()

    expect(result.status).toBe('network-error')
    await expect(loadQueuedWeighings(storage)).resolves.toEqual([item])
  })

  it('keeps the queue on unauthorized responses', async () => {
    const item = buildQueuedWeighing()
    await enqueueWeighing(storage, item)

    const sync = createSyncManager({
      storage,
      fetchBatch: vi.fn().mockRejectedValue(new HttpSyncError(401, 'expired')),
    })

    const result = await sync.syncNow()

    expect(result.status).toBe('unauthorized')
    await expect(loadQueuedWeighings(storage)).resolves.toEqual([item])
  })

  it('runs single-flight sync requests', async () => {
    const item = buildQueuedWeighing()
    await enqueueWeighing(storage, item)

    let resolveBatch: ((value: Array<{ id: string; ok: boolean; duplicate: boolean; error: null }>) => void) | null = null
    const fetchBatch = vi.fn().mockImplementation(
      () =>
        new Promise<Array<{ id: string; ok: boolean; duplicate: boolean; error: null }>>((resolve) => {
          resolveBatch = resolve
        }),
    )

    const sync = createSyncManager({ storage, fetchBatch })
    const first = sync.syncNow()
    const second = sync.syncNow()

    expect(first).toBe(second)
    await vi.waitFor(() => expect(fetchBatch).toHaveBeenCalledTimes(1))
    expect(resolveBatch).not.toBeNull()
    resolveBatch!([{ id: item.id, ok: true, duplicate: false, error: null }])
    await Promise.all([first, second])

    expect(fetchBatch).toHaveBeenCalledTimes(1)
  })

  it('syncs items enqueued after an idle sync', async () => {
    const fetchBatch = vi.fn()
    const sync = createSyncManager({ storage, fetchBatch })
    await expect(sync.syncNow()).resolves.toMatchObject({ status: 'idle' })

    const item = buildQueuedWeighing()
    await enqueueWeighing(storage, item)
    fetchBatch.mockResolvedValue([{ id: item.id, ok: true, duplicate: false, error: null }])

    await expect(sync.syncNow()).resolves.toMatchObject({ status: 'synced' })
    expect(fetchBatch).toHaveBeenCalledTimes(1)
  })

  it('applies optimistic stop updates locally', () => {
    const updated = applyOptimisticWeighing([buildRoute()], {
      routeId: 7,
      stopId: 11,
      kg: 9.75,
      weighedAt: '2026-10-04T15:00:00.000Z',
    })

    expect(updated[0].visited_stops).toBe(1)
    expect(updated[0].total_kg).toBe(9.75)
    expect(updated[0].status).toBe('in_progress')
    expect(updated[0].stops[0]).toMatchObject({
      status: 'visited',
      kg: 9.75,
      visited_at: '2026-10-04T15:00:00.000Z',
    })
  })
})
