import { Ionicons } from '@expo/vector-icons'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { DAILY_SLOTS } from '../../constants/slots'
import { PLAN_TIERS, PLAN_TIER_OPTIONS } from '../../constants/planTiers'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { formatBookingTimeSlot } from '../../utils/date'
import { paymentAmountLabel } from '../../utils/bookingDisplay'
import DropdownField from '../ui/DropdownField'

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function toYMD(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

function formatDateChip(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function parseBookingPrimaryDate(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() >= today.getTime() ? d : null
}

const SESSION_TIME_OPTIONS = DAILY_SLOTS.map((slot) => ({
  value: slot,
  label: formatBookingTimeSlot(slot),
}))

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Inline multi-date calendar grid — select/deselect by tapping individual days */
function MultiDateCalendar({ selectedDates, maxDates, minDate, onChange }) {
  const todayYMD = toYMD(minDate || new Date())

  const [viewYear, setViewYear] = useState(() => (minDate || new Date()).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (minDate || new Date()).getMonth())

  const selectedSet = useMemo(() => new Set(selectedDates.map(toYMD)), [selectedDates])

  // Build rows of 7 cells (null = blank leading/trailing cell)
  const rows = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const flat = []
    for (let i = 0; i < firstDow; i++) flat.push(null)
    for (let d = 1; d <= daysInMonth; d++) flat.push(d)
    // pad to full weeks
    while (flat.length % 7 !== 0) flat.push(null)
    const result = []
    for (let i = 0; i < flat.length; i += 7) result.push(flat.slice(i, i + 7))
    return result
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  function toggleDay(day) {
    const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (ymd < todayYMD) return
    const d = new Date(viewYear, viewMonth, day)
    d.setHours(0, 0, 0, 0)
    if (selectedSet.has(ymd)) {
      onChange(selectedDates.filter((x) => toYMD(x) !== ymd))
    } else {
      if (selectedDates.length >= maxDates) return
      onChange([...selectedDates, d].sort((a, b) => a - b))
    }
  }

  const today = minDate || new Date()
  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth()

  return (
    <View style={calStyles.root}>
      {/* Month nav */}
      <View style={calStyles.navRow}>
        <Pressable
          style={[calStyles.navBtn, !canGoPrev && calStyles.navBtnOff]}
          onPress={canGoPrev ? prevMonth : undefined}
          disabled={!canGoPrev}
        >
          <Ionicons name="chevron-back" size={16} color={canGoPrev ? colors.brand : colors.slate300} />
        </Pressable>
        <Text style={calStyles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <Pressable style={calStyles.navBtn} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={16} color={colors.brand} />
        </Pressable>
      </View>

      {/* Day-of-week header row */}
      <View style={calStyles.weekRow}>
        {DAY_LABELS.map((l) => (
          <View key={l} style={calStyles.headerCell}>
            <Text style={calStyles.headerTxt}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Calendar rows — each row is exactly 7 equal cells */}
      <View style={calStyles.body}>
        {rows.map((row, ri) => (
          <View key={ri} style={calStyles.row}>
            {row.map((day, ci) => {
              if (!day) return <View key={`e-${ri}-${ci}`} style={calStyles.cell} />
              const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isPast = ymd < todayYMD
              const isSelected = selectedSet.has(ymd)
              const isAtMax = selectedDates.length >= maxDates && !isSelected
              const disabled = isPast || isAtMax
              return (
                <Pressable
                  key={ymd}
                  style={[calStyles.cell, isSelected && calStyles.cellSelected, disabled && calStyles.cellDisabled]}
                  onPress={() => toggleDay(day)}
                  disabled={disabled}
                >
                  <Text style={[
                    calStyles.cellTxt,
                    isSelected && calStyles.cellTxtSelected,
                    isPast && calStyles.cellTxtPast,
                    isAtMax && calStyles.cellTxtDim,
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

function CardHeader({ icon, title, badge, right }) {
  return (
    <View style={styles.cardTitleRow}>
      <View style={styles.cardIconBadge}>
        <Ionicons name={icon} size={13} color={colors.brand} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      {badge ? <View style={styles.fixedBadge}><Text style={styles.fixedBadgeTxt}>{badge}</Text></View> : null}
      {right ?? null}
    </View>
  )
}

export default function HomePlanFormPhysio({ booking, busy, onSubmit }) {
  const physio = booking?.physioId
  const feeLo = Number(physio?.pricePerSession)
  const fixedFee = Number.isFinite(feeLo) && feeLo > 0
  const defaultSlot = booking?.timeSlot && DAILY_SLOTS.includes(booking.timeSlot) ? booking.timeSlot : DAILY_SLOTS[0]
  const sessionFee = fixedFee ? feeLo : 500
  const defaultPrimaryDate = useMemo(() => parseBookingPrimaryDate(booking?.date), [booking?.date])

  const [selectedTierValue, setSelectedTierValue] = useState(PLAN_TIERS[0].value)
  const selectedTier = PLAN_TIERS.find((t) => t.value === selectedTierValue) ?? PLAN_TIERS[0]
  const sessions = selectedTier.sessions
  const discountPercent = selectedTier.discountPercent

  const [sessionTime, setSessionTime] = useState(defaultSlot)
  const [paymentMode, setPaymentMode] = useState('online')
  const [selectedDates, setSelectedDates] = useState(() => (defaultPrimaryDate ? [defaultPrimaryDate] : []))

  useEffect(() => {
    setSessionTime(defaultSlot)
    setSelectedDates(defaultPrimaryDate ? [defaultPrimaryDate] : [])
  }, [booking._id, defaultSlot, defaultPrimaryDate])

  // Trim excess dates when tier changes to a smaller plan
  useEffect(() => {
    setSelectedDates((prev) => {
      if (prev.length <= sessions) return prev
      return [...prev].sort((a, b) => a - b).slice(0, sessions)
    })
  }, [sessions])

  const perVisitTravel = round2(Math.max(0, Number(booking?.distanceSurchargeAmount) || 0))

  const totals = useMemo(() => {
    const n = sessionFee
    const s = sessions
    const dPct = discountPercent
    if (n <= 0 || s < 1) {
      return { subtotal: 0, discountAmount: 0, patientPays: 0, perDay: 0 }
    }
    const linePerSession = round2(n + perVisitTravel)
    const subtotal = round2(s * linePerSession)
    const discountAmount = round2(subtotal * (dPct / 100))
    const patientPays = round2(subtotal - discountAmount)
    const perDay = s > 0 ? round2(patientPays / s) : 0
    return { subtotal, discountAmount, patientPays, perDay }
  }, [sessionFee, sessions, discountPercent, perVisitTravel])

  const showAssignmentPricing = Boolean(
    booking && (booking.totalAmount != null || booking.distanceKmAtAssign != null || Number(booking.distanceSurchargeAmount) > 0),
  )

  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [booking._id])

  const allDatesFilled = selectedDates.length === sessions
  const datesLeft = sessions - selectedDates.length
  const canSubmit = allDatesFilled && totals.patientPays > 0 && !busy

  function removeDate(d) {
    setSelectedDates((prev) => prev.filter((x) => toYMD(x) !== toYMD(d)))
  }

  function submitForm() {
    if (!canSubmit) return
    const sorted = [...selectedDates].sort((a, b) => a - b)
    onSubmit({
      sessions,
      amountPerSession: sessionFee,
      discountPercent,
      paymentMode,
      schedule: sorted.map((d) => ({ date: toYMD(d), time: sessionTime })),
    })
  }

  return (
    <View style={styles.root}>

      {/* ── 1. Plan selector ─────────────────────── */}
      <View style={styles.card}>
        <CardHeader icon="layers-outline" title="Select plan" />
        <DropdownField
          label={null}
          value={selectedTierValue}
          placeholder="Choose a plan"
          options={PLAN_TIER_OPTIONS}
          onSelect={(v) => setSelectedTierValue(Number(v))}
          variant="inline"
        />

        <View style={styles.planSummaryBox}>
          <View style={styles.planSummaryRow}>
            <Text style={styles.planSummaryKey}>Sessions</Text>
            <Text style={styles.planSummaryVal}>{sessions}</Text>
          </View>
          <View style={styles.planSummaryRow}>
            <Text style={styles.planSummaryKey}>Rate per session</Text>
            <Text style={styles.planSummaryVal}>₹{sessionFee.toFixed(2)}</Text>
          </View>
          {perVisitTravel > 0 ? (
            <View style={styles.planSummaryRow}>
              <Text style={styles.planSummaryKey}>Travel surcharge / session</Text>
              <Text style={styles.planSummaryVal}>₹{perVisitTravel.toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={styles.planSummaryRow}>
            <Text style={styles.planSummaryKey}>Subtotal</Text>
            <Text style={styles.planSummaryVal}>₹{totals.subtotal.toFixed(2)}</Text>
          </View>
          {discountPercent > 0 ? (
            <View style={styles.planSummaryRow}>
              <View style={styles.discountLabelWrap}>
                <Text style={styles.planSummaryKey}>Discount</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeTxt}>{discountPercent}% off</Text>
                </View>
              </View>
              <Text style={styles.planSummarySavings}>− ₹{totals.discountAmount.toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={[styles.planSummaryRow, styles.planSummaryTotalRow]}>
            <Text style={styles.planSummaryTotalKey}>Patient pays</Text>
            <Text style={styles.planSummaryTotalVal}>₹{totals.patientPays.toFixed(2)}</Text>
          </View>
          <View style={[styles.planSummaryRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.planSummaryKey}>Per day</Text>
            <Text style={styles.planSummaryVal}>≈ ₹{totals.perDay.toFixed(0)}</Text>
          </View>
        </View>

        {fixedFee ? (
          <View style={styles.fixedRateNote}>
            <Ionicons name="lock-closed-outline" size={11} color={colors.brand} />
            <Text style={styles.fixedRateNoteTxt}>Session rate set by admin: ₹{feeLo}</Text>
          </View>
        ) : null}
      </View>

      {/* ── 2. Payment mode ───────────────────────── */}
      <View style={styles.card}>
        <CardHeader icon="card-outline" title="Payment mode" />
        <View style={styles.modeRow}>
          {['online', 'offline'].map((mode) => {
            const on = paymentMode === mode
            return (
              <Pressable
                key={mode}
                style={[styles.modeCard, on && styles.modeCardOn]}
                onPress={() => setPaymentMode(mode)}
              >
                <View style={[styles.modeIconWrap, on && styles.modeIconWrapOn]}>
                  <Ionicons
                    name={mode === 'online' ? 'phone-portrait-outline' : 'cash-outline'}
                    size={18}
                    color={on ? colors.white : colors.slate400}
                  />
                </View>
                <Text style={[styles.modeTxt, on && styles.modeTxtOn]}>
                  {mode === 'online' ? 'Online' : 'Offline'}
                </Text>
                <Text style={[styles.modeSubTxt, on && styles.modeSubTxtOn]}>
                  {mode === 'online' ? 'Patient pays via app' : 'Cash / UPI hand-off'}
                </Text>
                {on ? <View style={styles.modeCheckWrap}><Ionicons name="checkmark-circle" size={16} color={colors.brand} /></View> : null}
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* ── 3. Session dates — inline multi-select calendar ── */}
      <View style={styles.card}>
        <CardHeader
          icon="calendar-outline"
          title="Session dates"
          right={
            <View style={[styles.dateCountBadge, allDatesFilled && styles.dateCountBadgeFull]}>
              <Text style={[styles.dateCountTxt, allDatesFilled && styles.dateCountTxtFull]}>
                {selectedDates.length}/{sessions}
              </Text>
            </View>
          }
        />

        {/* Status hint */}
        {allDatesFilled ? (
          <View style={styles.successRow}>
            <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
            <Text style={styles.successTxt}>All {sessions} dates selected — tap any date to remove it.</Text>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={13} color={colors.brand} />
            <Text style={styles.infoTxt}>
              Tap {datesLeft} date{datesLeft !== 1 ? 's' : ''} on the calendar below.
            </Text>
          </View>
        )}

        {/* Selected chips (tappable to remove) */}
        {selectedDates.length > 0 ? (
          <View style={styles.dateChipsWrap}>
            {[...selectedDates].sort((a, b) => a - b).map((d) => (
              <Pressable key={toYMD(d)} style={styles.dateChip} onPress={() => removeDate(d)}>
                <Text style={styles.dateChipTxt}>{formatDateChip(d)}</Text>
                <Ionicons name="close" size={9} color={colors.brand} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Inline calendar grid */}
        <MultiDateCalendar
          selectedDates={selectedDates}
          maxDates={sessions}
          minDate={today}
          onChange={setSelectedDates}
        />
      </View>

      {/* ── 4. Session time slot ──────────────────── */}
      <View style={styles.card}>
        <CardHeader icon="time-outline" title="Session time slot" />
        <DropdownField
          label={null}
          value={sessionTime}
          placeholder="Select a time slot"
          options={SESSION_TIME_OPTIONS}
          onSelect={setSessionTime}
          variant="inline"
        />
        <Text style={styles.timeSlotHint}>All {sessions} sessions will use this time slot.</Text>
      </View>

      {/* ── Assignment pricing reference ─────────── */}
      {showAssignmentPricing ? (
        <View style={styles.assignBox}>
          <View style={styles.assignIconWrap}>
            <Ionicons name="information-circle-outline" size={13} color={colors.amber800} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.assignTitle}>Booking reference</Text>
            <Text style={styles.assignSub}>Total on booking: {paymentAmountLabel(booking)}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Submit CTA ───────────────────────────── */}
      <Pressable
        style={[styles.submitBtn, (!canSubmit || busy) && styles.submitBtnOff]}
        disabled={!canSubmit || busy}
        onPress={submitForm}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Ionicons name="send-outline" size={16} color={colors.white} />
            <Text style={styles.submitBtnTxt}>Submit home plan</Text>
          </>
        )}
      </Pressable>

    </View>
  )
}

// ── Calendar styles ──────────────────────────────────────────────────────────
const calStyles = StyleSheet.create({
  root: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  // Month nav bar
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(13, 148, 136, 0.10)',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.07)',
  },
  navBtnOff: { opacity: 0.3 },
  monthLabel: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },

  // Day-of-week header row
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(13, 148, 136, 0.07)',
  },
  headerCell: { flex: 1, alignItems: 'center' },
  headerTxt: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Grid body
  body: { paddingHorizontal: 8, paddingVertical: 8, gap: 4 },

  // Each week row
  row: { flexDirection: 'row', alignItems: 'center' },

  // Individual day cell — flex:1 ensures all 7 columns are identical width
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    margin: 2,
  },
  cellSelected: {
    backgroundColor: colors.brand,
  },
  cellDisabled: { opacity: 0.3 },
  cellTxt: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.textPrimary,
  },
  cellTxtSelected: {
    fontFamily: font.bold,
    color: colors.white,
  },
  cellTxtPast: { color: colors.slate300 },
  cellTxtDim: { color: colors.slate300 },
})

// ── Card/form styles ─────────────────────────────────────────────────────────
const cardSurface = Platform.select({
  web: {
    backgroundColor: 'rgba(240, 253, 250, 0.88)',
    boxShadow: '0px 2px 8px rgba(13, 148, 136, 0.08)',
  },
  default: {
    backgroundColor: 'rgba(240, 253, 250, 0.88)',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
})

const styles = StyleSheet.create({
  root: { gap: 10 },

  card: {
    ...cardSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    padding: 16,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary, flex: 1 },
  fixedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  fixedBadgeTxt: { fontFamily: font.semiBold, fontSize: 10, color: colors.brand },

  // Plan summary
  planSummaryBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.12)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  planSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(13, 148, 136, 0.08)',
  },
  planSummaryKey: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  planSummaryVal: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  planSummarySavings: { fontFamily: font.bold, fontSize: type.sm, color: '#16a34a' },
  planSummaryTotalRow: { backgroundColor: 'rgba(13, 148, 136, 0.07)', paddingVertical: 11 },
  planSummaryTotalKey: { fontFamily: font.bold, fontSize: type.sm, color: colors.teal800 },
  planSummaryTotalVal: { fontFamily: font.bold, fontSize: type.md, color: colors.brand },
  discountLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  discountBadgeTxt: { fontFamily: font.bold, fontSize: 9, color: '#15803d', textTransform: 'uppercase' },
  fixedRateNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  fixedRateNoteTxt: { fontFamily: font.regular, fontSize: type.xs, color: colors.teal800 },

  // Payment mode
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(13, 148, 136, 0.12)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    gap: 6,
  },
  modeCardOn: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(13, 148, 136, 0.15)' }
      : {
          shadowColor: colors.brand,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 2,
        }),
  },
  modeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconWrapOn: { backgroundColor: colors.brand },
  modeTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.slate500 },
  modeTxtOn: { color: colors.brand },
  modeSubTxt: { fontFamily: font.regular, fontSize: 9.5, color: colors.textTertiary, textAlign: 'center' },
  modeSubTxtOn: { color: colors.teal800 },
  modeCheckWrap: { position: 'absolute', top: 10, right: 10 },

  // Date count badge
  dateCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  dateCountBadgeFull: { backgroundColor: '#dcfce7', borderColor: '#a7f3d0' },
  dateCountTxt: { fontFamily: font.bold, fontSize: 10, color: colors.slate500 },
  dateCountTxtFull: { color: '#15803d' },

  // Selected date chips
  dateChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8, marginTop: 4 },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  dateChipTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.brand },

  // Status rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 148, 136, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  infoTxt: { fontFamily: font.medium, fontSize: type.xs, color: colors.teal800 },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  successTxt: { fontFamily: font.medium, fontSize: type.xs, color: colors.success },

  // Time slot hint
  timeSlotHint: {
    marginTop: 8,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textTertiary,
    lineHeight: 16,
  },

  // Assignment reference
  assignBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningBg,
  },
  assignIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.amber100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assignTitle: { fontFamily: font.bold, fontSize: type.xs, color: colors.amber800, textTransform: 'uppercase', letterSpacing: 0.5 },
  assignSub: { marginTop: 4, fontFamily: font.regular, fontSize: type.sm, color: colors.amber800 },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(13, 148, 136, 0.25)' }
      : {
          shadowColor: colors.brand,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.22,
          shadowRadius: 8,
          elevation: 4,
        }),
    marginTop: 4,
  },
  submitBtnOff: { opacity: 0.45 },
  submitBtnTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.white },
})
