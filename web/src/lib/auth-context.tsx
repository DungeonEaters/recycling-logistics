import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../api/types'
import { clearStoredSession, getStoredToken, getStoredUser, storeSession } from './auth'

interface AuthContextValue {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readSession() {
  return {
    token: getStoredToken(),
    user: getStoredUser(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession)

  useEffect(() => {
    const sync = () => setSession(readSession())
    window.addEventListener('storage', sync)
    window.addEventListener('auth:changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('auth:changed', sync)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      token: session.token,
      user: session.user,
      login: (token, user) => {
        storeSession(token, user)
        setSession({ token, user })
        window.dispatchEvent(new Event('auth:changed'))
      },
      logout: () => {
        clearStoredSession()
        setSession({ token: null, user: null })
        window.dispatchEvent(new Event('auth:changed'))
      },
    }),
    [session.token, session.user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
