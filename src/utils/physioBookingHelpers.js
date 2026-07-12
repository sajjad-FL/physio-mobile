/** Mirrors client/src/components/physio/physioBookingHelpers.js */

export function ymdFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayYmd() {
  return ymdFromDate(new Date())
}

export function normalizeSessionRows(b) {
  if (Array.isArray(b.schedule) && b.schedule.length > 0) {
    return b.schedule
      .map((s, i) => ({
        key: `${b._id}-s-${i}`,
        sessionId: s._id != null ? String(s._id) : null,
        date: s.date,
        time: s.time,
        n: i + 1,
        notes: s.notes || null,
        status: s.status || 'scheduled',
        completedAt: s.completedAt || null,
        noShowReason: s.noShowReason || '',
        patientConfirmed: Boolean(s.patientConfirmed),
        paymentAtCompletion: Number(s.paymentAtCompletion || 0),
        perSession: true,
      }))
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
  }
  return [
    {
      key: `${b._id}-s-0`,
      sessionId: null,
      date: b.date,
      time: b.timeSlot,
      n: 1,
      notes: b.primarySessionNotes || null,
      status: b.sessionStatus === 'completed' ? 'completed' : 'scheduled',
      completedAt: null,
      noShowReason: '',
      patientConfirmed: false,
      paymentAtCompletion: 0,
      perSession: false,
    },
  ]
}

export function matchesFilters(b, filters) {
  if (filters.status === 'scheduled' && b.sessionStatus === 'completed') return false
  if (filters.status === 'completed' && b.sessionStatus !== 'completed') return false
  if (filters.status === 'rescheduled' && !b.rescheduled) return false

  if (filters.service === 'online' && b.serviceType !== 'online') return false
  if (filters.service === 'home' && b.serviceType !== 'home') return false

  const t = todayYmd()
  const d = String(b.date || '')
  if (filters.date === 'today' && d !== t) return false
  if (filters.date === 'upcoming' && !(d > t)) return false
  if (filters.date === 'past' && !(d < t)) return false

  return true
}

export function getSessionsForYmd(bookings, ymd) {
  const out = []
  for (const b of bookings) {
    const rows = normalizeSessionRows(b)
    for (const r of rows) {
      if (r.date === ymd) {
        out.push({ booking: b, row: r })
      }
    }
  }
  return out
}

export function buildSessionDateSet(bookings) {
  const set = new Set()
  for (const b of bookings) {
    for (const r of normalizeSessionRows(b)) {
      set.add(r.date)
    }
  }
  return set
}

/** Earliest upcoming session row on or after today, or null. */
export function pickNextSession(bookings, today = todayYmd()) {
  const items = listUpcomingSessions(bookings, today)
  return items[0] || null
}

/** All upcoming session rows on or after today, soonest first. */
export function listUpcomingSessions(bookings, today = todayYmd()) {
  const items = []
  for (const b of bookings || []) {
    if (b.sessionStatus === 'completed' || b.status === 'completed') continue
    for (const r of normalizeSessionRows(b)) {
      if (r.status === 'completed' || r.status === 'no_show') continue
      if (r.complimentary) continue
      const d = String(r.date || '')
      if (d >= today) {
        items.push({ booking: b, row: r })
      }
    }
  }
  items.sort(
    (a, b) =>
      String(a.row.date).localeCompare(String(b.row.date)) ||
      String(a.row.time || '').localeCompare(String(b.row.time || '')),
  )
  return items
}

/** Other visits on the same calendar day as the primary upcoming session. */
export function listSameDaySiblings(bookings, primary, today = todayYmd()) {
  if (!primary?.row?.date) return []
  const day = String(primary.row.date)
  const primaryKey = `${primary.booking?._id}:${primary.row?.sessionId || primary.row?.key || primary.row?.n}`
  return listUpcomingSessions(bookings, today).filter((item) => {
    if (String(item.row.date) !== day) return false
    const key = `${item.booking?._id}:${item.row?.sessionId || item.row?.key || item.row?.n}`
    return key !== primaryKey
  })
}
