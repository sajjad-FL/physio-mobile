import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
const PhysioWorkspaceContext = createContext(null)

function bookingNeedsPhysioAction(b) {
  if (!b) return false
  if (b.status === 'assigned') return true
  if (b.serviceType !== 'home') return false
  if (b.status !== 'accepted' && b.status !== 'scheduled') return false
  if (b.planStatus === 'proposed' || b.planStatus === 'approved') return false
  return true
}

function activeDisputeCount(disputes) {
  if (!Array.isArray(disputes)) return 0
  return disputes.filter((d) => d.status === 'open' || d.status === 'under_review').length
}

export function PhysioWorkspaceProvider({ children }) {
  const [me, setMe] = useState(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [bookingBadge, setBookingBadge] = useState(0)
  const [disputeBadge, setDisputeBadge] = useState(0)

  const loadMe = useCallback(async () => {
    try {
      const res = await api.get('/physio/me')
      setMe(res.data)
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => {
    let c = false
    setLoadingMe(true)
    loadMe().finally(() => {
      if (!c) setLoadingMe(false)
    })
    return () => {
      c = true
    }
  }, [loadMe])

  const refreshBadges = useCallback(async () => {
    const approved = me?.platformApproved === true
    if (!approved) {
      setBookingBadge(0)
      setDisputeBadge(0)
      return
    }
    try {
      const [bRes, dRes] = await Promise.all([
        api.get('/physio/bookings', { params: { page: 1, limit: 50 } }),
        api.get('/disputes/my', { params: { page: 1, limit: 50 } }),
      ])
      const bookings = bRes.data?.data || []
      const disputes = dRes.data?.data || []
      setBookingBadge(bookings.filter(bookingNeedsPhysioAction).length)
      setDisputeBadge(activeDisputeCount(disputes))
    } catch {
      setBookingBadge(0)
      setDisputeBadge(0)
    }
  }, [me])

  useEffect(() => {
    refreshBadges()
  }, [refreshBadges])

  const platformApproved = me?.platformApproved === true
  const rejected = me?.verificationStatus === 'rejected' || me?.verification?.status === 'rejected'

  const value = useMemo(
    () => ({
      me,
      loadingMe,
      platformApproved,
      rejected,
      bookingBadge,
      disputeBadge,
      refreshMe: loadMe,
      refreshBadges,
    }),
    [
      me,
      loadingMe,
      platformApproved,
      rejected,
      bookingBadge,
      disputeBadge,
      loadMe,
      refreshBadges,
    ],
  )

  return <PhysioWorkspaceContext.Provider value={value}>{children}</PhysioWorkspaceContext.Provider>
}

export function usePhysioWorkspace() {
  const ctx = useContext(PhysioWorkspaceContext)
  if (!ctx) {
    throw new Error('usePhysioWorkspace must be used within PhysioWorkspaceProvider')
  }
  return ctx
}

/** For optional use outside tabs (avoid throw). */
export function usePhysioWorkspaceOptional() {
  return useContext(PhysioWorkspaceContext)
}

export { bookingNeedsPhysioAction }
