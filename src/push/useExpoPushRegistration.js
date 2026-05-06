import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { api } from '../api/client'
import { getExpoPushTokenOrNull } from './expoPushRegistration'

/**
 * After login: register Expo token with `/profile/expo-push-token`.
 * Safe no-op when permission denied / token unavailable / web.
 */
export function useExpoPushRegistration(ready, jwtPresent) {
  const postedRef = useRef(new Set())

  useEffect(() => {
    if (!ready || !jwtPresent) {
      postedRef.current.clear()
      return
    }

    let cancelled = false

    async function submit(token) {
      if (postedRef.current.has(token)) return
      try {
        await api.post('/profile/expo-push-token', { token })
        postedRef.current.add(token)
      } catch {
        /* network / 401 — retry next auth epoch */
      }
    }

    ;(async () => {
      const token = await getExpoPushTokenOrNull()
      if (!cancelled && token) await submit(token)
    })()

    const sub = Notifications.addPushTokenListener(async () => {
      const fresh = await getExpoPushTokenOrNull()
      if (!cancelled && fresh) await submit(fresh)
    })

    return () => {
      cancelled = true
      sub.remove()
    }
  }, [ready, jwtPresent])
}
