/** Mirrors server/config/slots.js — session time options for home plans (Asia/Kolkata). */
export const BUSINESS_TIMEZONE = 'Asia/Kolkata'

export const DAILY_SLOTS = [
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00-19:00',
]

function nowInBusinessTz(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  )
  const hour = Number(parts.hour)
  const minute = Number(parts.minute)
  return {
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    totalMinutes: hour * 60 + minute,
  }
}

/** Today’s YYYY-MM-DD in India business timezone. */
export function todayISO() {
  return nowInBusinessTz().ymd
}

/** Calendar add for YYYY-MM-DD (no timezone drift). */
export function addDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd)
    .split('-')
    .map((x) => Number(x))
  const dt = new Date(Date.UTC(y, m - 1, d + Number(days || 0)))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate(),
  ).padStart(2, '0')}`
}

function parseSlotStartMinutes(timeSlot) {
  const m = /^(\d{2}):(\d{2})/.exec(String(timeSlot || '').trim())
  if (m == null) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/**
 * Client-side guard: past slots and &lt;2h lead time are not bookable for “today” (Kolkata).
 * Still require API `available` for capacity.
 */
export function isSlotSelectableForDate(dateYmd, timeSlot) {
  const start = parseSlotStartMinutes(timeSlot)
  if (start == null) return false
  const now = nowInBusinessTz()
  if (dateYmd !== now.ymd) return true
  if (now.totalMinutes >= start) return false
  if (start - now.totalMinutes < 2 * 60) return false
  return true
}

/** True when at least one daily slot is still bookable for this date (time rules only). */
export function dateHasBookableTimeSlots(dateYmd) {
  return DAILY_SLOTS.some((slot) => isSlotSelectableForDate(dateYmd, slot))
}

/**
 * Prefer today when any slot remains; otherwise tomorrow.
 * Avoids opening the book form on a day with an empty slot list after hours.
 */
export function defaultBookableDate() {
  const today = todayISO()
  if (dateHasBookableTimeSlots(today)) return today
  return addDaysYmd(today, 1)
}

export function filterSelectableSlots(slots, dateYmd) {
  return (slots || []).filter(
    (s) => s.available !== false && isSlotSelectableForDate(dateYmd, s.timeSlot),
  )
}
