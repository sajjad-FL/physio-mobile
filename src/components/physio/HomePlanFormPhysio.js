import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { DAILY_SLOTS } from '../../constants/slots'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { formatBookingTimeSlot } from '../../utils/date'
import { paymentAmountLabel } from '../../utils/bookingDisplay'
import { formatPhysioSessionFeeLabel } from '../../utils/physioSessionFee'
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

function CardHeader({ icon, title, badge, hint }) {
  return (
    <View style={styles.cardTitleRow}>
      <View style={styles.cardIconBadge}>
        <Ionicons name={icon} size={14} color={colors.brand} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      {badge ? <View style={styles.fixedBadge}><Text style={styles.fixedBadgeTxt}>{badge}</Text></View> : null}
      {hint ? <Text style={styles.cardTitleHint}>{hint}</Text> : null}
    </View>
  )
}

export default function HomePlanFormPhysio({ booking, busy, onSubmit }) {
  const physio = booking?.physioId
  const feeLo = Number(physio?.pricePerSession)
  const fixedFee = Number.isFinite(feeLo) && feeLo > 0
  const defaultSlot = booking?.timeSlot && DAILY_SLOTS.includes(booking.timeSlot) ? booking.timeSlot : DAILY_SLOTS[0]
  const defaultAmount = booking?.physioId?.pricePerSession != null ? String(booking.physioId.pricePerSession) : ''
  const defaultPrimaryDate = useMemo(() => parseBookingPrimaryDate(booking?.date), [booking?.date])

  const [sessions, setSessions] = useState(1)
  const [amountPerSession, setAmountPerSession] = useState(defaultAmount)
  const [discount, setDiscount] = useState(0)
  const [sessionTime, setSessionTime] = useState(defaultSlot)
  const [paymentMode, setPaymentMode] = useState('online')
  const [selectedDates, setSelectedDates] = useState(() => (defaultPrimaryDate ? [defaultPrimaryDate] : []))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tempDate, setTempDate] = useState(() => defaultPrimaryDate || new Date())

  useEffect(() => {
    setAmountPerSession(defaultAmount)
    setSessionTime(defaultSlot)
    setSelectedDates(defaultPrimaryDate ? [defaultPrimaryDate] : [])
  }, [booking._id, defaultAmount, defaultSlot, defaultPrimaryDate])

  useEffect(() => {
    setSelectedDates((prev) => {
      if (prev.length <= sessions) return prev
      return [...prev].sort((a, b) => a - b).slice(0, sessions)
    })
  }, [sessions])

  const perVisitTravel = round2(Math.max(0, Number(booking?.distanceSurchargeAmount) || 0))

  const totals = useMemo(() => {
    const n = Number(amountPerSession)
    const s = Number(sessions) || 0
    const dPct = Math.min(15, Math.max(0, Number(discount) || 0))
    if (!Number.isFinite(n) || n <= 0 || s < 1) {
      return { subtotal: 0, discountAmount: 0, linePerSession: 0, discountPct: dPct, patientPays: 0 }
    }
    const linePerSession = round2(n + perVisitTravel)
    const subtotal = round2(s * linePerSession)
    const discountAmount = round2(subtotal * (dPct / 100))
    const patientPays = round2(subtotal - discountAmount)
    return { subtotal, discountAmount, linePerSession, discountPct: dPct, patientPays }
  }, [amountPerSession, sessions, discount, perVisitTravel])

  const showAssignmentPricing = Boolean(
    booking && (booking.totalAmount != null || booking.distanceKmAtAssign != null || Number(booking.distanceSurchargeAmount) > 0),
  )

  const dateMismatch = selectedDates.length !== Number(sessions)
  const feeOk = !fixedFee || Number(amountPerSession) === feeLo
  const canSubmit = Number(sessions) >= 1 && Number(amountPerSession) > 0 && feeOk && !dateMismatch && totals.patientPays > 0 && !busy

  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [booking._id])

  function addPicked(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() < today.getTime()) return
    setSelectedDates((prev) => {
      const uniq = [...prev.filter((x) => toYMD(x) !== toYMD(d)), d]
      uniq.sort((a, b) => a - b)
      if (uniq.length > sessions) return uniq.slice(0, sessions)
      return uniq
    })
  }

  function removeDate(d) {
    setSelectedDates((prev) => prev.filter((x) => toYMD(x) !== toYMD(d)))
  }

  function submitForm() {
    if (!canSubmit) return
    const sorted = [...selectedDates].sort((a, b) => a - b)
    onSubmit({
      sessions: Number(sessions),
      amountPerSession: Number(amountPerSession),
      discountPercent: totals.discountPct,
      paymentMode,
      schedule: sorted.map((d) => ({ date: toYMD(d), time: sessionTime })),
    })
  }

  return (
    <View style={styles.root}>

      {/* ── Sessions stepper ────────────────────── */}
      <View style={styles.card}>
        <CardHeader icon="layers-outline" title="Number of sessions" />
        <View style={styles.stepperRow}>
          <Pressable
            style={[styles.stepBtn, sessions <= 1 && styles.stepBtnOff]}
            onPress={() => setSessions((s) => Math.max(1, s - 1))}
            disabled={sessions <= 1}
          >
            <Ionicons name="remove" size={22} color={sessions <= 1 ? colors.slate300 : colors.brand} />
          </Pressable>
          <View style={styles.stepValWrap}>
            <Text style={styles.stepVal}>{sessions}</Text>
            <Text style={styles.stepValSub}>session{sessions !== 1 ? 's' : ''}</Text>
          </View>
          <Pressable style={styles.stepBtn} onPress={() => setSessions((s) => s + 1)}>
            <Ionicons name="add" size={22} color={colors.brand} />
          </Pressable>
        </View>
      </View>

      {/* ── Fee per session ─────────────────────── */}
      <View style={styles.card}>
        <CardHeader
          icon="cash-outline"
          title="Fee per session"
          badge={fixedFee ? 'Fixed rate' : null}
        />
        {fixedFee ? (
          <View style={styles.inpRO}>
            <Text style={styles.inpROAmt}>₹{round2(feeLo + perVisitTravel).toFixed(2)}</Text>
            {perVisitTravel > 0 ? (
              <Text style={styles.inpROHint}>Includes ₹{perVisitTravel.toFixed(2)} travel surcharge</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.inpWrap}>
            <Text style={styles.inpPrefix}>₹</Text>
            <TextInput
              style={styles.inp}
              keyboardType="decimal-pad"
              value={amountPerSession}
              onChangeText={setAmountPerSession}
              placeholder="0.00"
              placeholderTextColor={colors.slate400}
            />
          </View>
        )}
        {perVisitTravel > 0 && !fixedFee ? (
          <Text style={styles.fieldHint}>+ ₹{perVisitTravel.toFixed(2)} travel surcharge added per session</Text>
        ) : null}
      </View>

      {/* ── Discount ────────────────────────────── */}
      <View style={styles.card}>
        <CardHeader icon="pricetag-outline" title="Discount" hint="max 15%" />
        <View style={styles.inpWrap}>
          <TextInput
            style={styles.inp}
            keyboardType="decimal-pad"
            value={String(discount)}
            onChangeText={(t) => setDiscount(Math.min(15, Math.max(0, Number(t) || 0)))}
            placeholder="0"
            placeholderTextColor={colors.slate400}
          />
          <Text style={styles.inpSuffix}>%</Text>
        </View>
      </View>

      {/* ── Session time slot ────────────────────── */}
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
      </View>

      {/* ── Payment mode ─────────────────────────── */}
      <View style={styles.card}>
        <CardHeader icon="card-outline" title="Payment mode" />
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeCard, paymentMode === 'online' && styles.modeCardOn]}
            onPress={() => setPaymentMode('online')}
          >
            <View style={[styles.modeIconWrap, paymentMode === 'online' && styles.modeIconWrapOn]}>
              <Ionicons name="phone-portrait-outline" size={20} color={paymentMode === 'online' ? colors.white : colors.slate400} />
            </View>
            <Text style={[styles.modeTxt, paymentMode === 'online' && styles.modeTxtOn]}>Online</Text>
            <Text style={[styles.modeSubTxt, paymentMode === 'online' && styles.modeSubTxtOn]}>Patient pays via app</Text>
            {paymentMode === 'online' ? (
              <View style={styles.modeCheckWrap}>
                <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
              </View>
            ) : null}
          </Pressable>
          <Pressable
            style={[styles.modeCard, paymentMode === 'offline' && styles.modeCardOn]}
            onPress={() => setPaymentMode('offline')}
          >
            <View style={[styles.modeIconWrap, paymentMode === 'offline' && styles.modeIconWrapOn]}>
              <Ionicons name="cash-outline" size={20} color={paymentMode === 'offline' ? colors.white : colors.slate400} />
            </View>
            <Text style={[styles.modeTxt, paymentMode === 'offline' && styles.modeTxtOn]}>Offline</Text>
            <Text style={[styles.modeSubTxt, paymentMode === 'offline' && styles.modeSubTxtOn]}>Cash / UPI hand-off</Text>
            {paymentMode === 'offline' ? (
              <View style={styles.modeCheckWrap}>
                <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* ── Session dates ─────────────────────────── */}
      <View style={styles.card}>
        <CardHeader
          icon="calendar-outline"
          title="Session dates"
          hint={`${selectedDates.length}/${sessions} selected`}
        />
        {selectedDates.length > 0 ? (
          <View style={styles.dateChipsWrap}>
            {[...selectedDates].sort((a, b) => a - b).map((d) => (
              <View key={toYMD(d)} style={styles.dateChip}>
                <Text style={styles.dateChipTxt}>{formatDateChip(d)}</Text>
                <Pressable onPress={() => removeDate(d)} hitSlop={6} style={styles.dateChipRemove}>
                  <Ionicons name="close" size={11} color={colors.brand} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {dateMismatch ? (
          <View style={styles.warnRow}>
            <Ionicons name="warning-outline" size={13} color={colors.amber800} />
            <Text style={styles.warnTxt}>Select exactly {sessions} date{sessions === 1 ? '' : 's'}.</Text>
          </View>
        ) : null}
        <Pressable style={styles.addDateBtn} onPress={() => setPickerOpen(true)}>
          <Ionicons name="add-circle-outline" size={16} color={colors.brand} />
          <Text style={styles.addDateBtnTxt}>{selectedDates.length === 0 ? 'Add dates' : 'Add / change dates'}</Text>
        </Pressable>
      </View>

      {/* ── Assignment pricing reference ─────────── */}
      {showAssignmentPricing ? (
        <View style={styles.assignBox}>
          <View style={styles.assignIconWrap}>
            <Ionicons name="information-circle-outline" size={14} color={colors.amber800} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.assignTitle}>Booking reference</Text>
            <Text style={styles.assignSub}>Total on booking: {paymentAmountLabel(booking)}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Cost summary ─────────────────────────── */}
      <View style={styles.costCard}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.cardIconBadge, styles.costIconBadge]}>
            <Ionicons name="calculator-outline" size={14} color={colors.blue600} />
          </View>
          <Text style={[styles.cardTitle, styles.costCardTitle]}>Cost summary</Text>
        </View>
        <View style={styles.costRows}>
          <View style={styles.costRow}>
            <Text style={styles.costK}>
              {sessions} × ₹{Number(amountPerSession || 0).toFixed(2)}
              {perVisitTravel > 0 ? ` + ₹${perVisitTravel.toFixed(2)} travel` : ''}
            </Text>
            <Text style={styles.costV}>₹{totals.subtotal.toFixed(2)}</Text>
          </View>
          {totals.discountPct > 0 ? (
            <View style={styles.costRow}>
              <Text style={styles.costK}>Discount ({totals.discountPct}%)</Text>
              <Text style={[styles.costV, styles.costVDiscount]}>− ₹{totals.discountAmount.toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={styles.costDivider} />
          <View style={styles.costTotalRow}>
            <Text style={styles.costTotalK}>Patient pays</Text>
            <Text style={styles.costTotalV}>₹{totals.patientPays.toFixed(2)}</Text>
          </View>
        </View>
      </View>

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

      {/* ── Date picker Android ───────────────────── */}
      {pickerOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={today}
          onChange={(e, date) => {
            setPickerOpen(false)
            if (e?.type === 'dismissed' || !date) return
            setTempDate(date)
            addPicked(date)
          }}
        />
      ) : null}

      {/* ── Date picker iOS sheet ─────────────────── */}
      {Platform.OS === 'ios' ? (
        <Modal transparent visible={pickerOpen} animationType="slide">
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalSheetBar}>
                <Pressable onPress={() => setPickerOpen(false)}>
                  <Text style={styles.modalCancelTxt}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalSheetTitle}>Pick a date</Text>
                <Pressable onPress={() => { addPicked(tempDate); setPickerOpen(false) }}>
                  <Text style={styles.modalDoneTxt}>Add</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                themeVariant="light"
                minimumDate={today}
                onChange={(_, d) => d && setTempDate(d)}
              />
            </View>
          </View>
        </Modal>
      ) : null}

    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 10 },

  // ── Card shell ──────────────────────────────
  card: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary, flex: 1 },
  cardTitleHint: { fontFamily: font.medium, fontSize: type.xs, color: colors.textTertiary },
  fixedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  fixedBadgeTxt: { fontFamily: font.semiBold, fontSize: 10, color: colors.brand },

  // ── Sessions stepper ────────────────────────
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOff: { borderColor: colors.borderSubtle, backgroundColor: colors.canvas, opacity: 0.5 },
  stepValWrap: { flex: 1, alignItems: 'center' },
  stepVal: { fontFamily: font.bold, fontSize: 40, color: colors.textPrimary, lineHeight: 46 },
  stepValSub: { fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary, marginTop: 2 },

  // ── Input with prefix/suffix ─────────────────
  inpWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  inpPrefix: {
    paddingLeft: 14,
    paddingRight: 4,
    fontFamily: font.semiBold,
    fontSize: type.lg,
    color: colors.textSecondary,
  },
  inpSuffix: {
    paddingRight: 14,
    paddingLeft: 4,
    fontFamily: font.semiBold,
    fontSize: type.lg,
    color: colors.textSecondary,
  },
  inp: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: font.semiBold,
    fontSize: type.xl,
    color: colors.textPrimary,
  },
  inpRO: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  inpROAmt: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary },
  inpROHint: { marginTop: 4, fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary },
  fieldHint: { marginTop: 6, fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary },

  // ── Payment mode cards ───────────────────────
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.canvas,
    gap: 6,
  },
  modeCardOn: { borderColor: colors.brand, backgroundColor: colors.teal50 },
  modeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconWrapOn: { backgroundColor: colors.brand },
  modeTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.slate500 },
  modeTxtOn: { color: colors.brand },
  modeSubTxt: { fontFamily: font.regular, fontSize: 10, color: colors.textTertiary, textAlign: 'center' },
  modeSubTxtOn: { color: colors.teal800 },
  modeCheckWrap: { position: 'absolute', top: 10, right: 10 },

  // ── Date chips ───────────────────────────────
  dateChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  dateChipTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.brand },
  dateChipRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  warnTxt: { fontFamily: font.medium, fontSize: type.xs, color: colors.amber800 },
  addDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
  },
  addDateBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },

  // ── Assignment reference box ─────────────────
  assignBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningBg,
  },
  assignIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.amber50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assignTitle: { fontFamily: font.bold, fontSize: type.xs, color: colors.amber800, textTransform: 'uppercase', letterSpacing: 0.5 },
  assignSub: { marginTop: 4, fontFamily: font.regular, fontSize: type.sm, color: colors.amber800 },

  // ── Cost summary card ────────────────────────
  costCard: {
    borderRadius: 16,
    backgroundColor: colors.blue50,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    padding: 16,
  },
  costIconBadge: { backgroundColor: '#dbeafe' },
  costCardTitle: { color: colors.blue700 },
  costRows: { gap: 10 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  costK: { fontFamily: font.regular, fontSize: type.sm, color: colors.slate600, flex: 1 },
  costV: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.slate700 },
  costVDiscount: { color: '#16a34a' },
  costDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#bfdbfe', marginVertical: 2 },
  costTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costTotalK: { fontFamily: font.bold, fontSize: type.base, color: colors.blue700 },
  costTotalV: { fontFamily: font.bold, fontSize: type.xl, color: colors.blue700 },

  // ── Submit CTA ───────────────────────────────
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 4,
  },
  submitBtnOff: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.white },

  // ── iOS date modal ───────────────────────────
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.4)' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalSheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalSheetTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  modalCancelTxt: { fontFamily: font.medium, fontSize: type.base, color: colors.textSecondary },
  modalDoneTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.brand },
})
