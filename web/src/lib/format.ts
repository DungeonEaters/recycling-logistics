import { type RouteStatus, type StopStatus } from '../api/types'
import { ApiError } from '../api/client'

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 1,
})

export function todayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return dateTimeFormatter.format(new Date(value))
}

export function formatKg(value: number | null | undefined) {
  return `${numberFormatter.format(value ?? 0)} kg`
}

export function formatProgress(current: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((current / total) * 100)}%`
}

export function routeStatusLabel(status: RouteStatus) {
  switch (status) {
    case 'planned':
      return 'Planificada'
    case 'in_progress':
      return 'En curso'
    case 'completed':
      return 'Completada'
  }
}

export function stopStatusLabel(status: StopStatus) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'visited':
      return 'Visitado'
    case 'skipped':
      return 'Omitido'
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.detail
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado'
}
