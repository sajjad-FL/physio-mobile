import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CommonActions } from '@react-navigation/native'
import { hydrateFromStorage, subscribeAuth, clearSession, getTokenSync, getRoleSync } from '../auth/tokenStore'
import { useExpoPushRegistration } from '../push/useExpoPushRegistration'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [authEpoch, setAuthEpoch] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await hydrateFromStorage()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return subscribeAuth(() => setAuthEpoch((n) => n + 1))
  }, [])

  const token = ready ? getTokenSync() : ''
  useExpoPushRegistration(ready, Boolean(token))

  const logout = useCallback(async (navigation) => {
    await clearSession()
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }))
  }, [])

  const value = useMemo(
    () => ({
      ready,
      authEpoch,
      token,
      role: getRoleSync(),
      logout,
    }),
    [ready, logout, authEpoch, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
