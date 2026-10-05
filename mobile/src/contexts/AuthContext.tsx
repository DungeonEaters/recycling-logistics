import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { login as loginRequest } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import type { AuthSession } from '../types'
import { clearAuthState, loadAuthState, preferencesStorage, saveAuthState } from '../lib/storage'

interface AuthContextValue {
  session: AuthSession | null
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    void (async () => {
      const stored = await loadAuthState(preferencesStorage)
      setSession(stored)
      setIsReady(true)
    })()
  }, [])

  const logout = useCallback(async () => {
    await clearAuthState(preferencesStorage)
    setSession(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout()
    })

    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await loginRequest(email, password)
    await saveAuthState(preferencesStorage, nextSession)
    setSession(nextSession)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isReady,
      login,
      logout,
    }),
    [isReady, login, logout, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
