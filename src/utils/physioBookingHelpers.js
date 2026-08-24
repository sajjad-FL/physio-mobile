/** Mirrors client/src/components/physio/physioBookingHelpers.js */

export function ymdFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayYmd() {
  return ymdFromDate(new Date())
}

/** Manager-led home bookings include a complimentary assessment on booking.date. */
export function hasComplimentaryAssessmentVisit(b) {
  if (b?.carePath === 'technique_managed' || b?.carePath === 'technique_direct') return false
  return (
    b?.serviceType === 'home' &&
    Boolean(b?.managerId || b?.assessmentCompletedAt) &&
    b?.planCreatedByRole !== 'physio' &&
    Boolean(b?.date)
  )
}

function buildComplimentaryAssessmentRow(b) {
  if (!hasComplimentaryAssessmentVisit(b)) return null
  const assessmentDate = String(b.date || '').trim()
  if (!assessmentDate) return null
  const scheduleHasAssessmentDate =
    Array.isArray(b.schedule) && b.schedule.some((s) => String(s?.date || '').trim() === assessmentDate)
  if (scheduleHasAssessmentDate) return null
  return {
    key: `${b._id}-assessment`,
    sessionId: null,
    date: assessmentDate,
    time: b.timeSlot,
    n: null,
    label: 'Assessment',
    complimentary: true,
    notes: (() => {
      if (b.assessmentData && typeof b.assessmentData === 'object') {
        const text = String(b.assessmentNotes || '').trim()
        return {
          text: text || null,
          painNow: b.assessmentData.painNow ?? null,
          functionNow: b.assessmentData.functionNow ?? null,
          painOnMovement: b.assessmentData.painOnMovement ?? null,
          sleep: b.assessmentData.sleep || null,
          mobility: b.assessmentData.mobility || null,
          areas: b.assessmentData.areas || [],
          updatedAt: b.assessmentCompletedAt || null,
        }
      }
      const text = String(b.assessmentNotes || '').trim()
      if (!text) return null
      return {
        text,
        updatedAt: b.assessmentCompletedAt || null,
      }
    })(),
    status: b.assessmentCompletedAt ? 'completed' : 'scheduled',
    completedAt: b.assessmentCompletedAt || null,
    noShowReason: '',
    patientConfirmed: false,
    paymentAtCompletion: 0,
    perSession: false,
  }
}

export function normalizeSessionRows(b) {
  const assessmentRow = buildComplimentaryAssessmentRow(b)

  if (Array.isArray(b.schedule) && b.schedule.length > 0) {
    const scheduleRows = b.schedule
      .map((s, i) => ({
        key: `${b._id}-s-${i}`,
        sessionId: s._id != null ? String(s._id) : null,
        date: s.date,
        time: s.time,
        n: 0,
        notes: s.notes || null,
        status: s.status || 'scheduled',
        completedAt: s.completedAt || null,
        noShowReason: s.noShowReason || '',
        patientConfirmed: Boolean(s.patientConfirmed),
        paymentAtCompletion: Number(s.paymentAtCompletion || 0),
        perSession: true,
        complimentary: false,
      }))
      .sort((a, bRow) => {
        const byDate = String(a.date || '').localeCompare(String(bRow.date || ''))
        if (byDate !== 0) return byDate
        return String(a.time || '').localeCompare(String(bRow.time || ''))
      })
      .map((row, i) => ({ ...row, n: i + 1 }))
    if (assessmentRow) return [assessmentRow, ...scheduleRows]
    return scheduleRows
  }

  if (assessmentRow) return [assessmentRow]

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
      complimentary: false,
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
      if (d >= today) items.push({ booking: b, row: r })
    }
  }
  items.sort((a, c) => {
    const byDate = String(a.row.date || '').localeCompare(String(c.row.date || ''))
    if (byDate !== 0) return byDate
    return String(a.row.time || '').localeCompare(String(c.row.time || ''))
  })
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
