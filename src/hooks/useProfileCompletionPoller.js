import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { getTokenSync } from '../auth/tokenStore'

const PATIENT_GENDERS = new Set(['male', 'female', 'other', 'prefer_not_to_say'])

const GENDER_SYNONYMS = new Map(
  Object.entries({
    woman: 'female',
    women: 'female',
    girl: 'female',
    man: 'male',
    men: 'male',
    boy: 'male',
    m: 'male',
    f: 'female',
    others: 'other',
    unspecified: 'prefer_not_to_say',
    unknown: 'prefer_not_to_say',
  }),
)

/** Mirrors server `normalizePatientGender` for client-side missing-field hints. */
function normalizePatientGender(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  if (PATIENT_GENDERS.has(s)) return s
  const lower = s.toLowerCase()
  if (PATIENT_GENDERS.has(lower)) return lower
  const mapped = GENDER_SYNONYMS.get(lower)
  if (mapped && PATIENT_GENDERS.has(mapped)) return mapped
  return ''
}

function dobLooksValid(dob) {
  if (dob == null || dob === '') return false
  const d = new Date(typeof dob === 'string' ? dob : dob)
  return !Number.isNaN(d.getTime())
}

/**
 * Same rules as server `isPatientProfileCompleteDoc` (patient role only).
 * @returns {{ key: string, label: string }[]}
 */
export function computePatientMissingFields(profile) {
  if (!profile || profile.isProfileComplete === true) return []
  const role = profile.role || 'user'
  if (role !== 'user') {
    return [{ key: 'profile', label: 'Open the Profile tab to finish setup' }]
  }
  const missing = []
  if (String(profile.name || '').trim().length < 2) {
    missing.push({ key: 'name', label: 'Full name' })
  }
  if (!normalizePatientGender(profile.gender)) {
    missing.push({ key: 'gender', label: 'Gender' })
  }
  if (!dobLooksValid(profile.dob)) {
    missing.push({ key: 'dob', label: 'Date of birth' })
  }
  const addr = String(profile.address?.text ?? profile.location ?? '').trim()
  if (addr.length < 2) {
    missing.push({ key: 'address', label: 'Address (area or city)' })
  }
  return missing
}

/**
 * Polls GET /profile while logged in; when incomplete, surfaces `showPrompt` on each tick (and immediately).
 * Stops the 60s interval once `isProfileComplete` is true.
 */
export function useProfileCompletionPoller(token, ready) {
  const [profile, setProfile] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const intervalRef = useRef(null)

  const clearPoller = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const applyProfileData = useCallback(
    (data) => {
      setProfile(data)
      const complete = data?.isProfileComplete === true
      if (!complete) {
        setShowPrompt(true)
      } else {
        setShowPrompt(false)
        clearPoller()
      }
      return complete
    },
    [clearPoller],
  )

  const refresh = useCallback(async () => {
    if (!getTokenSync()) return null
    try {
      const res = await api.get('/profile')
      const data = res.data || {}
      applyProfileData(data)
      return data
    } catch {
      return null
    }
  }, [applyProfileData])

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false)
  }, [])

  useEffect(() => {
    if (!ready || !token) {
      clearPoller()
      setProfile(null)
      setShowPrompt(false)
      return undefined
    }

    let cancelled = false

    async function initialFetch() {
      if (!getTokenSync()) return
      try {
        const res = await api.get('/profile')
        if (cancelled) return
        const complete = applyProfileData(res.data || {})
        if (complete || cancelled) return
        intervalRef.current = setInterval(async () => {
          if (cancelled || !getTokenSync()) return
          try {
            const r = await api.get('/profile')
            if (cancelled) return
            applyProfileData(r.data || {})
          } catch {
            /* keep interval; next tick retries */
          }
        }, 60_000)
      } catch {
        /* ignore */
      }
    }

    initialFetch()

    return () => {
      cancelled = true
      clearPoller()
    }
  }, [ready, token, applyProfileData, clearPoller])

  const isComplete = profile?.isProfileComplete === true
  const missingFields = profile ? computePatientMissingFields(profile) : []

  return {
    profile,
    isComplete,
    missingFields,
    showPrompt,
    dismissPrompt,
    refresh,
  }
}
