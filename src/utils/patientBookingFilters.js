import { normalizeSessionRows, todayYmd, ymdFromDate } from './physioBookingHelpers'

export const PATIENT_FILTER_LABELS = {
  all: 'All',
  today: 'Today',
  upcoming: 'Upcoming',
  past: 'Past',
  range: 'Date range',
}

export function matchesPatientBookingFilter(booking, { filter, dateRange, today }) {
  const rows = normalizeSessionRows(booking)
  const dates = [...new Set(rows.map((r) => r.date).filter(Boolean))]
  if (dates.length === 0) return filter === 'all'

  if (filter === 'all') return true
  if (filter === 'today') return dates.some((d) => d === today)
  if (filter === 'upcoming') return dates.some((d) => d > today)
  if (filter === 'past') return dates.some((d) => d < today)
  if (filter === 'range') {
    if (!dateRange?.start || !dateRange?.end) return false
    const start = ymdFromDate(new Date(dateRange.start))
    const end = ymdFromDate(new Date(dateRange.end))
    if (!start || !end) return false
    const lo = start <= end ? start : end
    const hi = start <= end ? end : start
    return dates.some((d) => d >= lo && d <= hi)
  }
  return true
}

export function patientFilterSummary(filter, dateRange) {
  if (filter === 'range' && dateRange?.start && dateRange?.end) {
    const s = new Date(dateRange.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const e = new Date(dateRange.end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return `${PATIENT_FILTER_LABELS.range} · ${s} – ${e}`
  }
  return PATIENT_FILTER_LABELS[filter] || filter
}

export { todayYmd }

