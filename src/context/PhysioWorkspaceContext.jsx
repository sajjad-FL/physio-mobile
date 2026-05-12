import { createContext, useContext, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePhysioMe, usePhysioBookings, usePhysioDisputes } from '../api/queries'

const BADGE_PARAMS = { page: 1, limit: 100 }

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

const PhysioWorkspaceContext = createContext(null)

export function PhysioWorkspaceProvider({ children }) {
  const queryClient = useQueryClient()

  const { data: me, isLoading: loadingMe } = usePhysioMe()

  const approved = me?.platformApproved === true

  // These share query keys with PhysioBookingsScreen and PhysioDisputesScreen,
  // so TanStack deduplicates them into a single network request.
  const { data: bookings = [] } = usePhysioBookings(BADGE_PARAMS, { enabled: approved })
  const { data: disputesData } = usePhysioDisputes(BADGE_PARAMS, { enabled: approved })

  const bookingBadge = approved ? (bookings || []).filter(bookingNeedsPhysioAction).length : 0
  const disputeBadge = approved ? activeDisputeCount(disputesData?.rows || []) : 0

  const platformApproved = me?.platformApproved === true
  const rejected = me?.verificationStatus === 'rejected' || me?.verification?.status === 'rejected'

  // Invalidate shared TanStack queries instead of making raw API calls.
  const refreshBadges = () => {
    if (!approved) return
    queryClient.invalidateQueries({ queryKey: ['physioBookings'] })
    queryClient.invalidateQueries({ queryKey: ['physioDisputes'] })
  }

  const refreshMe = () => {
    queryClient.invalidateQueries({ queryKey: ['physioMe'] })
  }

  const value = useMemo(
    () => ({
      me: me || null,
      loadingMe,
      platformApproved,
      rejected,
      bookingBadge,
      disputeBadge,
      refreshMe,
      refreshBadges,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me, loadingMe, platformApproved, rejected, bookingBadge, disputeBadge],
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
