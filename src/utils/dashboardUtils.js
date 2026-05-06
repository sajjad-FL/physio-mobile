/** Mirrors client/src/pages/dashboard/dashboardUtils.js (labels for RN chips). */

export function bookingStatusBadge(status, sessionStatus, paymentStatus) {
  if (paymentStatus === 'refunded') {
    return { label: 'Dispute / refunded', bg: '#fff1f2', fg: '#881337', border: '#fecdd3' }
  }
  if (status === 'completed' && sessionStatus === 'completed' && paymentStatus === 'released') {
    return { label: 'Completed', bg: '#ecfdf5', fg: '#064e3b', border: '#a7f3d0' }
  }
  if (status === 'completed') {
    return { label: 'Session done', bg: '#ecfdf5', fg: '#064e3b', border: '#a7f3d0' }
  }
  if (status === 'assigned') {
    return { label: 'Assigned', bg: '#ccfbf1', fg: '#0f766e', border: '#99f6e4' }
  }
  return { label: 'Pending', bg: '#fffbeb', fg: '#78350f', border: '#fde68a' }
}

export function paymentBadge(paymentStatus) {
  const map = {
    pending: { label: 'Payment pending', bg: '#fffbeb', fg: '#78350f', border: '#fde68a' },
    held: { label: 'Payment secured', bg: '#f0f9ff', fg: '#1e3a8a', border: '#bae6fd' },
    released: { label: 'Released', bg: '#ecfdf5', fg: '#064e3b', border: '#a7f3d0' },
    refunded: { label: 'Refunded', bg: '#fff1f2', fg: '#881337', border: '#fecdd3' },
  }
  return (
    map[paymentStatus] || {
      label: paymentStatus || '—',
      bg: '#f8fafc',
      fg: '#64748b',
      border: '#e2e8f0',
    }
  )
}

export function disputeStatusBadge(status) {
  const map = {
    open: { label: 'Open', bg: '#fffbeb', fg: '#78350f', border: '#fde68a' },
    under_review: { label: 'Under review', bg: '#f0f9ff', fg: '#1e3a8a', border: '#bae6fd' },
    resolved: { label: 'Resolved', bg: '#ecfdf5', fg: '#064e3b', border: '#a7f3d0' },
    rejected: { label: 'Rejected', bg: '#f8fafc', fg: '#64748b', border: '#e2e8f0' },
  }
  return map[status] || { label: status, bg: '#f8fafc', fg: '#64748b', border: '#e2e8f0' }
}
