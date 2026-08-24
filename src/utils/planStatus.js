/** Plan is active for payment/treatment (new flow or legacy approved). */
export function isPlanLive(planStatus) {
  return planStatus === 'live' || planStatus === 'approved'
}

/** Patient must give one-tap consent before plan goes live. */
export function isAwaitingPatientConsent(planStatus) {
  return planStatus === 'awaiting_consent' || planStatus === 'proposed'
}

/** Booking is owned by a care manager (plan/assign/collect). */
export function isManagerOwnedBooking(booking) {
  return Boolean(booking?.managerId)
}
