import type { BatchWeighingItem, BatchWeighingResult } from '../types'
import { apiRequest } from './client'

export async function syncWeighingsBatch(token: string, items: BatchWeighingItem[]): Promise<BatchWeighingResult[]> {
  return apiRequest<BatchWeighingResult[]>(
    '/weighings/batch',
    {
      method: 'POST',
      body: JSON.stringify({ items }),
    },
    token,
  )
}
