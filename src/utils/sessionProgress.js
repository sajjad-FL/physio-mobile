import { normalizeSessionRows } from './physioBookingHelpers'

export function getSessionProgress(booking) {
  if (!booking) {
    return { completed: 0, total: 1, percent: 0, tier: 'red', isComplete: false }
  }

  const rows = normalizeSessionRows(booking)
  const total = Math.max(1, Number(booking.sessions) || rows.length || 1)

  if (booking.sessionStatus === 'completed') {
    return {
      completed: total,
      total,
      percent: 100,
      tier: 'green',
      isComplete: true,
    }
  }

  let completed = 0
  for (const r of rows) {
    if (r.status === 'completed') completed++
  }
  completed = Math.min(completed, total)

  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0
  const tier = percent >= 67 ? 'green' : percent >= 34 ? 'yellow' : 'red'

  return {
    completed,
    total,
    percent,
    tier,
    isComplete: false,
  }
}

export function getSessionMilestoneMessage(percent, isComplete) {
  if (isComplete || percent >= 100) {
    return 'All sessions complete — outstanding work.'
  }
  if (percent === 0) {
    return 'Your care plan is underway — stay consistent for the best results.'
  }
  if (percent < 34) {
    return 'Great start — every session builds on the last.'
  }
  if (percent < 67) {
    return "You're making solid progress — keep it up."
  }
  return 'Almost there — one push to the finish line.'
}

export function progressTierColors(tier) {
  if (tier === 'green') {
    return {
      trackBg: '#d1fae5',
      trackBorder: '#a7f3d0',
      fill: '#10b981',
    }
  }
  if (tier === 'yellow') {
    return {
      trackBg: '#fef3c7',
      trackBorder: '#fde68a',
      fill: '#f59e0b',
    }
  }
  return {
    trackBg: '#fee2e2',
    trackBorder: '#fecaca',
    fill: '#ef4444',
  }
}
