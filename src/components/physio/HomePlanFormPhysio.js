import DateTimePicker from '@react-native-community/datetimepicker'
import { useEffect, useMemo, useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { DAILY_SLOTS } from '../../constants/slots'
import { colors } from '../../theme/colors'
import { formatBookingTimeSlot } from '../../utils/date'
import { paymentAmountLabel } from '../../utils/bookingDisplay'
import { formatPhysioSessionFeeLabel } from '../../utils/physioSessionFee'

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function toYMD(d) {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

export default function HomePlanFormPhysio({ booking, busy, onSubmit }) {
  const physio = booking?.physioId
  const feeLo = Number(physio?.pricePerSession)
  const fixedFee = Number.isFinite(feeLo) && feeLo > 0
  const defaultSlot =
    booking?.timeSlot && DAILY_SLOTS.includes(booking.timeSlot) ? booking.timeSlot : DAILY_SLOTS[0]
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
      const sorted = [...prev].sort((a, b) => a - b)
      return sorted.slice(0, sessions)
    })
  }, [sessions])

  const perVisitTravel = round2(Math.max(0, Number(booking?.distanceSurchargeAmount) || 0))

  const totals = useMemo(() => {
    const n = Number(amountPerSession)
    const s = Number(sessions) || 0
    const dPct = Math.min(15, Math.max(0, Number(discount) || 0))
    if (!Number.isFinite(n) || n <= 0 || s < 1) {
      return {
        subtotal: 0,
        discountAmount: 0,
        linePerSession: 0,
        discountPct: dPct,
        patientPays: 0,
      }
    }
    const linePerSession = round2(n + perVisitTravel)
    const subtotal = round2(s * linePerSession)
    const discountAmount = round2(subtotal * (dPct / 100))
    const patientPays = round2(subtotal - discountAmount)
    return { subtotal, discountAmount, linePerSession, discountPct: dPct, patientPays }
  }, [amountPerSession, sessions, discount, perVisitTravel])

  const showAssignmentPricing = Boolean(
    booking &&
      (booking.totalAmount != null ||
        booking.distanceKmAtAssign != null ||
        Number(booking.distanceSurchargeAmount) > 0),
  )

  const dateMismatch = selectedDates.length !== Number(sessions)
  const amt = Number(amountPerSession)
  const feeOk = !fixedFee || amt === feeLo
  const canSubmit =
    Number(sessions) >= 1 &&
    Number(amountPerSession) > 0 &&
    feeOk &&
    !dateMismatch &&
    totals.patientPays > 0 &&
    !busy

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

  function submitForm() {
    if (!canSubmit) return
    const sorted = [...selectedDates].sort((a, b) => a - b)
    const schedule = sorted.map((d) => ({ date: toYMD(d), time: sessionTime }))
    onSubmit({
      sessions: Number(sessions),
      amountPerSession: Number(amountPerSession),
      discountPercent: totals.discountPct,
      paymentMode,
      schedule,
    })
  }

  return (
    <View>
      <Text style={styles.help}>Sessions: {sessions} · Pick dates (same flow as web home plan).</Text>
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={styles.lbl}>Sessions</Text>
          <TextInput
            style={styles.inp}
            keyboardType="number-pad"
            value={String(sessions)}
            onChangeText={(t) => setSessions(Math.max(1, Number(t) || 1))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.lbl}>₹ per session</Text>
          {physio && fixedFee ? (
            <Text style={styles.hintMini}>Fixed: {formatPhysioSessionFeeLabel(physio)}</Text>
          ) : null}
          <TextInput
            style={[styles.inp, fixedFee && styles.inpRO]}
            keyboardType="decimal-pad"
            editable={!fixedFee}
            value={fixedFee ? String(round2(feeLo + perVisitTravel)) : amountPerSession}
            onChangeText={setAmountPerSession}
          />
        </View>
      </View>
      <Text style={styles.lbl}>Discount (max 15%)</Text>
      <TextInput
        style={styles.inp}
        keyboardType="decimal-pad"
        value={String(discount)}
        onChangeText={(t) => setDiscount(Math.min(15, Math.max(0, Number(t) || 0)))}
      />
      <Text style={styles.lbl}>Session time slot</Text>
      <View style={styles.slotRow}>
        {DAILY_SLOTS.map((slot) => (
          <Pressable key={slot} style={[styles.slotChip, sessionTime === slot && styles.slotOn]} onPress={() => setSessionTime(slot)}>
            <Text style={[styles.slotTxt, sessionTime === slot && styles.slotTxtOn]}>{formatBookingTimeSlot(slot)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.lbl}>Payment mode</Text>
      <Pressable style={styles.radioRow} onPress={() => setPaymentMode('online')}>
        <View style={[styles.radioOuter, paymentMode === 'online' && styles.radioOn]} />
        <Text style={styles.radioLab}>Online (patient pays after approving)</Text>
      </Pressable>
      <Pressable style={styles.radioRow} onPress={() => setPaymentMode('offline')}>
        <View style={[styles.radioOuter, paymentMode === 'offline' && styles.radioOn]} />
        <Text style={styles.radioLab}>Offline (cash / UPI)</Text>
      </Pressable>

      <Text style={[styles.lbl, { marginTop: 12 }]}>Session dates ({selectedDates.length}/{sessions})</Text>
      <Pressable style={styles.addDate} onPress={() => setPickerOpen(true)}>
        <Text style={styles.addDateTxt}>+ Add / change dates</Text>
      </Pressable>
      {dateMismatch ? (
        <Text style={styles.warn}>Select exactly {sessions} date{sessions === 1 ? '' : 's'}.</Text>
      ) : null}
      <Text style={styles.dateList}>
        {[...selectedDates]
          .sort((a, b) => a - b)
          .map((d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))
          .join(' · ') || '—'}
      </Text>

      {showAssignmentPricing ? (
        <View style={styles.assignBox}>
          <Text style={styles.assignTitle}>Current booking (after assignment)</Text>
          <Text style={styles.assignSub}>Total on booking: {paymentAmountLabel(booking)}</Text>
        </View>
      ) : null}

      <View style={styles.totalBox}>
        <Text style={styles.totalTitle}>Total for patient</Text>
        <Text style={styles.totalLine}>
          Subtotal · ₹{totals.subtotal.toFixed(2)}
        </Text>
        <Text style={styles.totalLine}>
          Discount ({totals.discountPct}%) · − ₹{totals.discountAmount.toFixed(2)}
        </Text>
        <Text style={styles.totalBig}>Patient pays ₹{totals.patientPays.toFixed(2)}</Text>
      </View>

      <Pressable style={[styles.submit, (!canSubmit || busy) && styles.disabled]} disabled={!canSubmit || busy} onPress={submitForm}>
        <Text style={styles.submitTxt}>{busy ? 'Submitting…' : 'Submit home plan'}</Text>
      </Pressable>

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

      {Platform.OS === 'ios' ? (
        <Modal transparent visible={pickerOpen} animationType="slide">
          <View style={{ flex: 1 }}>
            <Pressable style={styles.modalBgFlex} onPress={() => setPickerOpen(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalBar}>
                <Pressable onPress={() => setPickerOpen(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    addPicked(tempDate)
                    setPickerOpen(false)
                  }}
                >
                  <Text style={styles.modalDone}>Add</Text>
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
  help: { fontSize: 13, color: colors.slate600, marginBottom: 12 },
  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  lbl: { fontSize: 11, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase', marginBottom: 6 },
  hintMini: { fontSize: 11, color: colors.slate600, marginBottom: 4 },
  inp: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: colors.slate900,
    backgroundColor: colors.white,
  },
  inpRO: { backgroundColor: colors.slate50, color: colors.slate700 },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.slate50,
  },
  slotOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  slotTxt: { fontSize: 12, fontWeight: '600', color: colors.slate700 },
  slotTxtOn: { color: colors.brandHover },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate300,
  },
  radioOn: { borderColor: colors.brand, backgroundColor: colors.brand },
  radioLab: { fontSize: 14, color: colors.slate800, flex: 1 },
  addDate: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.brand,
    marginBottom: 8,
  },
  addDateTxt: { color: colors.white, fontWeight: '700', fontSize: 14 },
  warn: { color: colors.amber800, fontSize: 13, marginBottom: 8 },
  dateList: { fontSize: 14, color: colors.slate900, marginBottom: 12 },
  assignBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.amber200,
    backgroundColor: colors.amber50,
    marginBottom: 12,
  },
  assignTitle: { fontSize: 11, fontWeight: '800', color: colors.amber950, textTransform: 'uppercase' },
  assignSub: { marginTop: 6, fontSize: 13, color: colors.amber900 },
  totalBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    backgroundColor: colors.blue50,
    marginBottom: 16,
  },
  totalTitle: { fontSize: 11, fontWeight: '800', color: colors.blue700, textTransform: 'uppercase' },
  totalLine: { marginTop: 8, fontSize: 14, color: colors.slate700 },
  totalBig: { marginTop: 12, fontSize: 17, fontWeight: '800', color: colors.blue700 },
  submit: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitTxt: { color: colors.white, fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.5 },
  modalBgFlex: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalCancel: { fontSize: 16, color: colors.slate600 },
  modalDone: { fontSize: 16, fontWeight: '700', color: colors.brand },
})
