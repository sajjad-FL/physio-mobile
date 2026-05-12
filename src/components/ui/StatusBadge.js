import { memo } from 'react'
import Chip from './Chip'
import { bookingStatusBadge, disputeStatusBadge, paymentBadge } from '../../utils/dashboardUtils'

function StatusBadge({ kind, value, bookingStatus, sessionStatus, paymentStatus, style }) {
  let palette = { label: value || '—', bg: '#f8fafc', fg: '#64748b', border: '#e2e8f0' }
  if (kind === 'payment') palette = paymentBadge(value)
  if (kind === 'dispute') palette = disputeStatusBadge(value)
  if (kind === 'booking') palette = bookingStatusBadge(bookingStatus, sessionStatus, paymentStatus)
  return (
    <Chip
      label={palette.label}
      bg={palette.bg}
      fg={palette.fg}
      border={palette.border}
      style={style}
    />
  )
}

export default memo(StatusBadge)
