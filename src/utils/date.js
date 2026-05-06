/** Copied from client/src/utils/date.js (display-only). */
const TIME_OPTIONS = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
}

export function formatTime(date) {
  if (date == null || date === '') return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-IN', TIME_OPTIONS)
}

const CLOCK = /^(\d{1,2}):(\d{2})$/

function formatClockPart(part) {
  const m = CLOCK.exec(String(part).trim())
  if (!m) return part
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return part
  const d = new Date(2000, 0, 1, h, min, 0)
  return d.toLocaleTimeString('en-IN', TIME_OPTIONS).replace(/\b(am|pm)\b/gi, (x) => x.toUpperCase())
}

export function formatBookingTimeSlot(slot) {
  if (slot == null || slot === '') return '—'
  const s = String(slot).trim()
  const idx = s.indexOf('-')
  if (idx === -1) return formatClockPart(s)
  const left = s.slice(0, idx).trim()
  const right = s.slice(idx + 1).trim()
  return `${formatClockPart(left)} – ${formatClockPart(right)}`
}

function parseYMDLocal(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatBookingDateAndSlot(dateStr, timeSlot) {
  const timePart = formatBookingTimeSlot(timeSlot)
  if (dateStr == null || dateStr === '') return timePart
  const d = parseYMDLocal(dateStr)
  if (!d) return `${dateStr}, ${timePart}`
  const datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${datePart}, ${timePart}`
}
