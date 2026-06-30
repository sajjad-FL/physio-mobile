import { formatBookingDateAndSlot } from './date'

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

export function paymentModeLabel(b) {
  if (b.serviceType === 'home') {
    if (b.homePlanPaymentMode === 'offline') return 'Offline (cash / UPI)'
    if (b.homePlanPaymentMode === 'online') return 'Online'
    return '—'
  }
  return 'Online'
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
    collected: 'Collected (pending admin)',
    verified: 'Verified (offline)',
    refunded: 'Refunded',
  }
  return m[status] || status || '—'
}

export function sessionStatusLabel(b) {
  if (b.sessionStatus === 'completed' || b.status === 'completed') return 'Completed'
  if (b.status === 'assigned') {
    if (b.planStatus === 'proposed') return 'Awaiting Approval'
    if (b.planStatus === 'approved') return 'Awaiting Acceptance'
    return 'Propose Plan'
  }
  if (b.status === 'pending' || b.planStatus === 'requested') return 'Propose Plan'
  if (b.rescheduled) return 'Rescheduled'
  return 'Scheduled'
}

export function formatSessionLine(date, time) {
  return formatBookingDateAndSlot(date, time)
}
