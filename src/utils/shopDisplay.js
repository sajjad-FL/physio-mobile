import { colors } from '../theme/colors'

export function formatInr(amount) {
  const n = Number(amount) || 0
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function shopOrderStatusLabel(status) {
  const labels = {
    placed: 'Placed',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

export function shopOrderStatusColor(status) {
  const map = {
    placed: colors.warning,
    confirmed: colors.info,
    shipped: '#6366f1',
    delivered: colors.success,
    cancelled: colors.slate500,
  }
  return map[status] || colors.slate500
}
