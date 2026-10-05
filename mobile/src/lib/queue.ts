import type { BatchWeighingResult, QueuedWeighing } from '../types'
import { STORAGE_KEYS, type StorageAdapter, loadQueuedWeighings, writeJson } from './storage'

export function generateClientUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const random = Math.random().toString(16).slice(2, 10)
  return `${Date.now()}-${random}-${Math.random().toString(16).slice(2, 10)}`
}

export async function saveQueuedWeighings(storage: StorageAdapter, items: QueuedWeighing[]): Promise<QueuedWeighing[]> {
  await writeJson(storage, STORAGE_KEYS.queue, items)
  return items
}

export async function enqueueWeighing(storage: StorageAdapter, item: QueuedWeighing): Promise<QueuedWeighing[]> {
  const items = await loadQueuedWeighings(storage)
  const next = [...items.filter((entry) => entry.id !== item.id), { ...item, error: null }]
  return saveQueuedWeighings(storage, next)
}

export async function removeQueuedWeighings(storage: StorageAdapter, ids: string[]): Promise<QueuedWeighing[]> {
  const idSet = new Set(ids)
  const items = await loadQueuedWeighings(storage)
  const next = items.filter((entry) => !idSet.has(entry.id))
  return saveQueuedWeighings(storage, next)
}

export async function applyBatchResults(
  storage: StorageAdapter,
  results: BatchWeighingResult[],
): Promise<QueuedWeighing[]> {
  const resultMap = new Map(results.map((result) => [result.id, result]))
  const items = await loadQueuedWeighings(storage)
  const next = items.flatMap((item) => {
    const result = resultMap.get(item.id)
    if (!result) {
      return [item]
    }

    if (result.ok || result.duplicate) {
      return []
    }

    return [{ ...item, error: result.error ?? 'No se pudo sincronizar' }]
  })

  return saveQueuedWeighings(storage, next)
}
