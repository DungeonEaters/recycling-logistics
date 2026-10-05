import type { User } from '../api/types'

const TOKEN_KEY = 'recycling-logistics.token'
const USER_KEY = 'recycling-logistics.user'

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function storeSession(token: string, user: User) {
  window.localStorage.setItem(TOKEN_KEY, token)
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}
