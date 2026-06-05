/** Mirrors client/src/pages/dashboard/dashboardUtils.js (labels for RN chips). */

export function bookingStatusBadge(status, sessionStatus, paymentStatus, planStatus) {
  if (paymentStatus === 'refunded') {
    return { label: 'Refunded', bg: '#fff1f2', fg: '#881337', border: '#fecdd3' }
  }
  if (status === 'completed' || sessionStatus === 'completed') {
    return { label: 'Completed', bg: '#ecfdf5', fg: '#064e3b', border: '#a7f3d0' }
  }
  if (planStatus === 'proposed') {
    return { label: 'Approve Plan', bg: '#fff7ed', fg: '#c2410c', border: '#ffedd5' }
  }
  if (paymentStatus === 'pending' && (planStatus === 'approved' || status === 'assigned')) {
    return { label: 'Pay Installment', bg: '#fffbeb', fg: '#b45309', border: '#fef3c7' }
  }
  if (status === 'scheduled' || status === 'accepted' || sessionStatus === 'scheduled') {
    return { label: 'Scheduled', bg: '#e6f4f3', fg: '#0d9488', border: '#ccf2f0' }
  }
  if (status === 'assigned') {
    return { label: 'Therapist Assigned', bg: '#e0f2fe', fg: '#0369a1', border: '#bae6fd' }
  }
  if (status === 'pending') {
    return { label: 'Finding Therapist', bg: '#f1f5f9', fg: '#475569', border: '#e2e8f0' }
  }
  return { label: 'Pending', bg: '#fffbeb', fg: '#78350f', border: '#fde68a' }
}


export function paymentBadge(paymentStatus) {
  const map = {
    pending: { label: 'Awaiting Payment', bg: '#fffbeb', fg: '#78350f', border: '#fde68a' },
    held: { label: 'Payment Secured', bg: '#f0f9ff', fg: '#1e3a8a', border: '#bae6fd' },
    released: { label: 'Completed & Settled', bg: '#ecfdf5', fg: '#064e3b', border: '#a7f3d0' },
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
