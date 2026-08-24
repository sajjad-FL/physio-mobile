import { formatBookingDateAndSlot } from './date'
import { isPlanLive, isAwaitingPatientConsent, isManagerOwnedBooking } from './planStatus'

export function paymentAmountLabel(b) {
  if (b.totalAmount != null && Number(b.totalAmount) > 0) {
    return `₹${Number(b.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (b.amountPaise != null && Number(b.amountPaise) > 0) {
    return `₹${(Number(b.amountPaise) / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  return '—'
}

/** Human-readable booking ID e.g. `2026-101`, or null if not assigned yet. */
export function formatBookingCode(b) {
  const code = typeof b === 'string' ? b : b?.bookingCode
  const trimmed = String(code || '').trim()
  return trimmed || null
}

/** Compact label for cards: `#2026-101` or empty string. */
export function bookingCodeBadge(b) {
  const code = formatBookingCode(b)
  return code ? `#${code}` : ''
}

export function paymentModeLabel(b) {
  if (b.serviceType === 'clinic') {
    return 'Clinic (cash / UPI)'
  }
  if (b.serviceType === 'home') {
    if (b.homePlanPaymentMode === 'offline') return 'Offline (cash / UPI)'
    if (b.homePlanPaymentMode === 'online') return 'Online'
    return '—'
  }
  return 'Online'
}

export function serviceTypeLabel(serviceType) {
  if (serviceType === 'online') return 'Online'
  if (serviceType === 'clinic') return 'Clinic'
  return 'Home'
}

export function formatPaidAt(b) {
  const raw = b?.paidAt || b?.heldAt
  if (!raw) return null
  try {
    return new Date(raw).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

/** Patient-facing label for what they booked (stroke, knee pain, etc.). */
export function bookingConditionLabel(b) {
  const text = typeof b === 'string' ? b : b?.issue
  const trimmed = String(text || '').trim()
  return trimmed || null
}

/**
 * Date/time for booking cards and headers.
 * When a multi-visit schedule exists, use the chronologically first visit —
 * booking.date can be stale (array index 0 after reschedule / duplicates).
 */
export function resolveBookingDisplayVisit(b) {
  if (!b || typeof b !== 'object') return { date: undefined, time: undefined }
  if (Array.isArray(b.schedule) && b.schedule.length > 0) {
    const sorted = [...b.schedule].sort((a, c) => {
      const byDate = String(a?.date || '').localeCompare(String(c?.date || ''))
      if (byDate !== 0) return byDate
      return String(a?.time || '').localeCompare(String(c?.time || ''))
    })
    const first = sorted[0]
    return {
      date: first?.date || b.date,
      time: first?.time || b.timeSlot,
    }
  }
  return { date: b.date, time: b.timeSlot }
}

/** e.g. "8 Jul, 6:00 PM – 7:00 PM (Stroke / Paralysis)" */
export function formatBookingVisitWithCondition(input) {
  if (input == null) return '—'
  const slotSource = input.booking && input.date == null ? input.booking : input
  const slot = resolveBookingDisplayVisit(slotSource)
  const date = slot.date ?? input.date
  const timeSlot = slot.time ?? input.timeSlot ?? input.time
  const conditionSource = input.booking ?? input
  const visit = formatBookingDateAndSlot(date, timeSlot)
  const condition = bookingConditionLabel(conditionSource)
  if (!visit && !condition) return '—'
  if (!condition) return visit
  if (!visit) return `(${condition})`
  return `${visit} (${condition})`
}

export function paymentStatusLabel(ps) {
  const m = {
    pending: 'Pending',
    held: 'Payment secured',
    released: 'Released',
    refunded: 'Refunded',
  }
  return m[ps] || ps || '—'
}

export function marketplacePaymentStatusLabel(status) {
  const m = {
    pending: 'Awaiting payment',
    paid: 'Paid (online)',
    collected: 'Collected',
    verified: 'Verified',
    refunded: 'Refunded',
  }
  return m[status] || status || '—'
}

/** Patient-facing session / booking step label. */
export function sessionStatusLabel(b) {
  if (b.sessionStatus === 'completed' || b.status === 'completed') return 'Completed'

  if (isManagerOwnedBooking(b) && b.serviceType === 'home') {
    if (isAwaitingPatientConsent(b.planStatus)) return 'Awaiting consent'
    if (isPlanLive(b.planStatus)) return 'Plan active'
    return 'Care manager assigned'
  }

  if (isAwaitingPatientConsent(b.planStatus)) return 'Awaiting consent'
  if (isPlanLive(b.planStatus)) return 'Plan active'

  if (b.status === 'assigned' || b.status === 'accepted') return 'Scheduled'
  if (b.status === 'pending') return 'Awaiting care team'
  if (b.rescheduled) return 'Rescheduled'
  return 'Scheduled'
}

/** Physio bookings list chip label. */
export function physioListStatusLabel(b) {
  if (b.sessionStatus === 'completed' || b.status === 'completed') return 'Completed'

  if (isManagerOwnedBooking(b)) {
    if (isPlanLive(b.planStatus)) return 'Treat patient'
    if (isAwaitingPatientConsent(b.planStatus)) return 'Awaiting consent'
    return 'Care manager case'
  }

  if (b.status === 'assigned') {
    if (isAwaitingPatientConsent(b.planStatus)) return 'Awaiting consent'
    if (isPlanLive(b.planStatus)) return 'Treat patient'
    return 'Create plan'
  }
  if (b.status === 'pending' || b.planStatus === 'requested') return 'Create plan'
  if (b.rescheduled) return 'Rescheduled'
  return 'Scheduled'
}

export function formatSessionLine(date, time) {
  return formatBookingDateAndSlot(date, time)
}
