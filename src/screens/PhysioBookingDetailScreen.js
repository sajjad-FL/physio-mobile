import DateTimePicker from '@react-native-community/datetimepicker'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../api/client'
import BookingSessionTimelinePhysio from '../components/physio/BookingSessionTimelinePhysio'
import HomePlanFormPhysio from '../components/physio/HomePlanFormPhysio'
import InstallmentsPhysioCard from '../components/physio/InstallmentsPhysioCard'
import SessionProgressPhysio from '../components/physio/SessionProgressPhysio'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { DAILY_SLOTS } from '../constants/slots'
import { colors } from '../theme/colors'
import {
  marketplacePaymentStatusLabel,
  paymentAmountLabel,
  paymentModeLabel,
  paymentStatusLabel,
  sessionStatusLabel,
} from '../utils/bookingDisplay'
import { formatBookingDateAndSlot, formatBookingTimeSlot } from '../utils/date'
import { openGoogleMapsDestination } from '../utils/googleMaps'
import { normalizeSessionRows } from '../utils/physioBookingHelpers'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

function roundMoney2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function ymdFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim())
  if (!m) return new Date()
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Display like web / common IN form: DD-MM-YYYY */
function formatDmyDots(d) {
  const dt = d instanceof Date ? d : parseYmd(d)
  const day = String(dt.getDate()).padStart(2, '0')
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const y = dt.getFullYear()
  return `${day}-${mo}-${y}`
}

function startOfToday() {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

/** iOS native compact date control needs an OS version roughly 14+ */
function iosSupportsCompactDate() {
  if (Platform.OS !== 'ios') return false
  const v = Platform.Version
  if (typeof v === 'number') return v >= 14
  const n = parseFloat(String(v))
  return !Number.isNaN(n) && n >= 14
}

function BookingDetailChrome({ navigation, insetsTop, children }) {
  return (
    <View style={styles.screenRoot}>
      <View style={[styles.customHeader, { paddingTop: insetsTop }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.customHeaderHit}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.customHeaderBack}>←</Text>
        </Pressable>
        <Text style={styles.customHeaderTitle} numberOfLines={1}>
          Booking
        </Text>
        <View style={styles.customHeaderRightSpacer} />
      </View>
      {children}
    </View>
  )
}

function SectionTitle({ title, hint, right }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.accentBar} />
      <View style={styles.sectionTitleTextCol}>
        <Text style={styles.h2}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      {right ? <View style={styles.sectionTitleRight}>{right}</View> : null}
    </View>
  )
}

function SessionNoteEditor({ row, onSaved }) {
  const [text, setText] = useState(row.notes?.text || '')
  const [busy, setBusy] = useState(false)
  const [meta, setMeta] = useState({ updatedAt: row.notes?.updatedAt })

  async function save() {
    if (!row.sessionId) {
      Toast.show({ type: 'error', text1: 'Session reference missing' })
      return
    }
    setBusy(true)
    try {
      const res = await api.patch(`/sessions/${row.sessionId}/notes`, { text })
      const n = res.data?.notes
      if (n) setMeta({ updatedAt: n.updatedAt })
      Toast.show({ type: 'success', text1: 'Notes saved' })
      onSaved?.()
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not save' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.noteEditorWrap}>
      <Text style={styles.k}>Session {row.n}</Text>
      <Text style={styles.v}>{formatBookingDateAndSlot(row.date, row.time)}</Text>
      <Text style={[styles.k, { marginTop: 8 }]}>Clinical / session notes</Text>
      <TextInput
        style={[styles.ta, styles.taOnFill]}
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Observations, exercises, follow-up…"
        placeholderTextColor={colors.slate500}
      />
      <Button title={busy ? 'Saving…' : 'Save notes'} onPress={save} disabled={busy} loading={busy} />
      <Text style={styles.mutedSm}>
        {meta.updatedAt ? `Updated ${new Date(meta.updatedAt).toLocaleString('en-IN')}` : 'Not saved yet'}
      </Text>
    </View>
  )
}

export default function PhysioBookingDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets()
  const { id } = route.params || {}
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [rescheduleRow, setRescheduleRow] = useState(null)
  const [busySessionKey, setBusySessionKey] = useState(null)
  const [noShowRow, setNoShowRow] = useState(null)
  const [noShowReason, setNoShowReason] = useState('')
  const [recordCollectionOpen, setRecordCollectionOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(new Date())
  const [rescheduleSlot, setRescheduleSlot] = useState(DAILY_SLOTS[0])
  const [androidRescheduleDateOpen, setAndroidRescheduleDateOpen] = useState(false)
  const [iosRescheduleDateOpen, setIosRescheduleDateOpen] = useState(false)
  const [rescheduleBusy, setRescheduleBusy] = useState(false)
  const [recordAmount, setRecordAmount] = useState('')
  const [recordNote, setRecordNote] = useState('')
  const [recordErr, setRecordErr] = useState('')
  const [recordBusy, setRecordBusy] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/physio/bookings/${id}`)
      setBooking(res.data)
    } catch (e) {
      const msg = e.response?.status === 404 ? 'Booking not found' : e.response?.data?.message || 'Failed to load'
      setError(msg)
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const showCreatePlan = useMemo(() => {
    if (!booking) return false
    return (
      booking.serviceType === 'home' &&
      (booking.planStatus === 'requested' || booking.planStatus === 'rejected' || booking.planStatus == null)
    )
  }, [booking])

  const hasSchedulePlan = useMemo(
    () => Array.isArray(booking?.schedule) && booking.schedule.length > 0,
    [booking],
  )

  const paymentSummary = booking?.paymentSummary || null
  const paymentsList = useMemo(() => (Array.isArray(booking?.payments) ? booking.payments : []), [booking])
  const sessionsCount = paymentSummary?.sessionsCount || (hasSchedulePlan ? booking.schedule.length : 1)
  const unlockedSessions = Number(paymentSummary?.unlockedSessions ?? paymentSummary?.coveredSessions ?? 0)
  const isOfflinePlan = booking?.serviceType === 'home' && booking?.homePlanPaymentMode === 'offline'
  const outstanding = Number(paymentSummary?.outstanding || 0)
  const showInstallments =
    booking?.planStatus === 'approved' || booking?.serviceType === 'online' || paymentsList.length > 0

  const paymentBlockReason = useMemo(() => {
    if (!booking) return 'Booking not loaded'
    if (!paymentSummary) {
      if (booking.paymentStatus !== 'held') return 'Payment must be secured before completion'
      return ''
    }
    if (unlockedSessions <= 0) {
      return 'Collect at least one installment before completing any session.'
    }
    return ''
  }, [booking, paymentSummary, unlockedSessions])

  const canMarkComplete = useMemo(() => {
    if (!booking || booking.sessionStatus === 'completed') return false
    return !paymentBlockReason
  }, [booking, paymentBlockReason])

  const showPlanPending = useMemo(() => {
    if (!booking) return false
    return booking.serviceType === 'home' && booking.planStatus === 'proposed'
  }, [booking])

  async function completeSession(bookingId) {
    setBusyId(bookingId)
    try {
      await api.post(`/physio/sessions/${bookingId}/complete`)
      Toast.show({ type: 'success', text1: 'Session marked complete' })
      await load()
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed' })
    } finally {
      setBusyId(null)
    }
  }

  async function completeOneSession(row) {
    if (!booking || !row?.sessionId) return
    const key = String(row.sessionId)
    setBusySessionKey(key)
    try {
      await api.post(`/physio/sessions/${booking._id}/${row.sessionId}/complete`)
      Toast.show({ type: 'success', text1: `Session #${row.n} marked complete` })
      await load()
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed' })
    } finally {
      setBusySessionKey(null)
    }
  }

  async function submitNoShow() {
    if (!booking || !noShowRow?.sessionId) return
    const key = String(noShowRow.sessionId)
    setBusySessionKey(key)
    try {
      await api.post(`/physio/sessions/${booking._id}/${noShowRow.sessionId}/no-show`, {
        reason: noShowReason.trim(),
      })
      Toast.show({ type: 'success', text1: `Session #${noShowRow.n} marked as no-show` })
      setNoShowRow(null)
      setNoShowReason('')
      await load()
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed' })
    } finally {
      setBusySessionKey(null)
    }
  }

  async function createPlan(bookingId, payload) {
    setBusyId(bookingId)
    try {
      await api.patch(`/bookings/${bookingId}/create-plan`, payload)
      Toast.show({ type: 'success', text1: 'Plan submitted to patient' })
      await load()
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not create plan' })
    } finally {
      setBusyId(null)
    }
  }

  async function submitRecordCollection() {
    if (!booking) return
    setRecordErr('')
    const amt = roundMoney2(Number(recordAmount))
    const out = roundMoney2(outstanding)
    if (!Number.isFinite(amt) || amt <= 0) {
      setRecordErr('Enter an amount greater than zero')
      return
    }
    if (amt > out + 0.009) {
      setRecordErr(`Amount must be at most ₹${out.toFixed(2)}`)
      return
    }
    setRecordBusy(true)
    try {
      await api.post(`/physio/bookings/${booking._id}/collections`, {
        amount: amt,
        note: recordNote.trim(),
      })
      Toast.show({ type: 'success', text1: 'Collection recorded' })
      setRecordCollectionOpen(false)
      setRecordAmount('')
      setRecordNote('')
      await load()
    } catch (e) {
      const msg = e.response?.data?.message || 'Could not record'
      setRecordErr(msg)
      Toast.show({ type: 'error', text1: msg })
    } finally {
      setRecordBusy(false)
    }
  }

  function closeRescheduleModal() {
    setAndroidRescheduleDateOpen(false)
    setIosRescheduleDateOpen(false)
    setRescheduleRow(null)
  }

  function openReschedule(row) {
    setAndroidRescheduleDateOpen(false)
    setIosRescheduleDateOpen(false)
    setRescheduleRow(row)
    const min = startOfToday()
    const d = row?.date || booking?.date
    let parsed = parseYmd(d)
    if (parsed.getTime() < min.getTime()) parsed = new Date(min)
    setRescheduleDate(parsed)
    setRescheduleSlot(row?.time || booking?.timeSlot || DAILY_SLOTS[0])
  }

  async function saveReschedule() {
    if (!booking || !rescheduleRow) return
    setRescheduleBusy(true)
    try {
      const payload = { date: ymdFromDate(rescheduleDate), timeSlot: rescheduleSlot }
      if (rescheduleRow?.sessionId && String(rescheduleRow.sessionId) !== String(booking._id)) {
        payload.sessionId = rescheduleRow.sessionId
      }
      await api.patch(`/bookings/${booking._id}/reschedule`, payload)
      Toast.show({ type: 'success', text1: 'Session rescheduled' })
      closeRescheduleModal()
      await load()
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not reschedule' })
    } finally {
      setRescheduleBusy(false)
    }
  }

  const rescheduleMinDate = useMemo(() => startOfToday(), [])

  if (loading) {
    return (
      <BookingDetailChrome navigation={navigation} insetsTop={insets.top}>
        <View style={[styles.center, styles.screenBody]}>
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </BookingDetailChrome>
    )
  }

  if (error || !booking) {
    return (
      <BookingDetailChrome navigation={navigation} insetsTop={insets.top}>
        <View style={[styles.center, styles.screenBody]}>
          <Text style={styles.err}>{error || 'Not found'}</Text>
          <Button title="Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </BookingDetailChrome>
    )
  }

  const b = booking
  const busy = busyId === b._id
  const canStartNavigation = Boolean(b.userId?.coordinates || String(b.userId?.location || '').trim())

  const scrollBottomPad = 14 + insets.bottom + 14
  const noteRows = normalizeSessionRows(b)
  const multiNotes = noteRows.length > 1

  function toggleNotes() {
    if (!multiNotes) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setNotesExpanded((o) => !o)
  }

  return (
    <BookingDetailChrome navigation={navigation} insetsTop={insets.top}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.pad, { paddingBottom: scrollBottomPad }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
        bounces={false}
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator
        {...(Platform.OS === 'android' ? { overScrollMode: 'never' } : {})}
        {...(Platform.OS === 'ios' ? { contentInsetAdjustmentBehavior: 'never' } : {})}
      >
      <Card style={styles.heroCard}>
        <View style={styles.heroStripe} />
        <View style={styles.heroInner}>
          <Text style={styles.k}>Visit</Text>
          <Text style={styles.h1}>{formatBookingDateAndSlot(b.date, b.timeSlot)}</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillTxt}>{sessionStatusLabel(b)}</Text>
            </View>
            <View style={styles.pillMuted}>
              <Text style={styles.pillTxtSm}>Hold: {paymentStatusLabel(b.paymentStatus)}</Text>
            </View>
            {b.payment?.status != null ? (
              <View style={styles.pillTealOutline}>
                <Text style={styles.pillTxtSm}>Pay: {marketplacePaymentStatusLabel(b.payment.status)}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroPatientRow}>
            <View style={styles.heroPatientCol}>
              <Text style={styles.k}>Patient</Text>
              <Text style={styles.heroPatientName} numberOfLines={1}>
                {b.userId?.name ?? '—'}
              </Text>
              <Text style={styles.mutedSm}>{b.userId?.phone ?? '—'}</Text>
            </View>
            <Pressable
              style={[styles.directionsBtn, !canStartNavigation && styles.directionsBtnOff]}
              disabled={!canStartNavigation}
              onPress={() =>
                openGoogleMapsDestination({
                  coordinates: b.userId?.coordinates,
                  address: b.userId?.location,
                })
              }
            >
              <Text style={styles.directionsBtnTxt}>Directions</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      {showPlanPending ? (
        <View style={styles.bannerMint}>
          <Text style={styles.bannerMintTxt}>Awaiting patient approval on the proposed plan.</Text>
        </View>
      ) : null}

      <View style={styles.sectionGapMd} />
      <SessionProgressPhysio booking={b} />

      <View style={styles.sectionGapMd} />
      <Card>
        <SectionTitle title="People & clinical context" hint="Referral and your assignment on this case." />
        <View style={styles.physioSelfBox}>
          <Text style={styles.k}>You (assigned)</Text>
          <Text style={styles.v}>{b.physioId?.name ?? '—'}</Text>
          {b.physioId?.phone ? <Text style={styles.mutedSm}>{b.physioId.phone}</Text> : null}
          {b.physioId?.specialization ? <Text style={styles.mutedSm}>{b.physioId.specialization}</Text> : null}
        </View>
        <View style={styles.sep} />
        <Text style={styles.k}>Issue / chief complaint</Text>
        <Text style={styles.issue}>{b.issue}</Text>
      </Card>

      {showInstallments ? (
        <>
          <View style={styles.sectionGapMd} />
          <InstallmentsPhysioCard
            title={isOfflinePlan ? 'Collections' : 'Installments'}
            subtitle={
              isOfflinePlan
                ? 'Record each cash/UPI hand-off.'
                : 'Patient pays online per installment; each verified payment unlocks the next session.'
            }
            summary={paymentSummary}
            payments={paymentsList}
            emptyMessage={
              isOfflinePlan ? 'No collections recorded yet.' : 'No online installments yet.'
            }
          >
            {isOfflinePlan && outstanding > 0.009 && b.planStatus === 'approved' ? (
              <Pressable
                style={styles.outlineMini}
                onPress={() => {
                  const out = roundMoney2(Number(paymentSummary?.outstanding || 0))
                  const per = roundMoney2(Number(paymentSummary?.amountPerSession || 0))
                  const def = out <= 0 ? '' : per > 0 ? String(Math.min(per, out)) : String(out)
                  setRecordAmount(def)
                  setRecordNote('')
                  setRecordErr('')
                  setRecordCollectionOpen(true)
                }}
              >
                <Text style={styles.outlineMiniTxt}>Record collection</Text>
              </Pressable>
            ) : null}
          </InstallmentsPhysioCard>
        </>
      ) : null}

      <View style={styles.sectionGapMd} />
      <Card>
        <SectionTitle
          title="Session timeline"
          hint="Complete after visits; mark no-show if the patient missed a session."
        />
        {paymentSummary && unlockedSessions < sessionsCount ? (
          <View style={styles.infoStripe}>
            <Text style={styles.infoStripeTxt}>
              {unlockedSessions === 0
                ? 'Collect at least one installment to unlock session #1.'
                : `You can complete up to session #${unlockedSessions} of ${sessionsCount}.`}
            </Text>
          </View>
        ) : null}
        <View style={styles.timelineInnerGap} />
        <BookingSessionTimelinePhysio
          booking={b}
          reschedule={{ enabled: true, onReschedule: openReschedule }}
          physioActions={{
            enabled: true,
            canAct: true,
            blockedReason: paymentBlockReason,
            busySessionId: busySessionKey,
            rowBlockedReason: (row) => {
              if (!paymentSummary) return ''
              const ordinal = row?.perSession ? Number(row.n || 0) : 1
              if (ordinal <= 0) return ''
              if (ordinal > unlockedSessions) {
                return unlockedSessions === 0
                  ? `Session #${ordinal} is locked until you collect at least one installment.`
                  : `Session #${ordinal} is locked — unlocked up to #${unlockedSessions} of ${sessionsCount}.`
              }
              return ''
            },
            onComplete: (row) => {
              if (paymentBlockReason) {
                Toast.show({ type: 'error', text1: paymentBlockReason })
                return
              }
              if (row.perSession) completeOneSession(row)
              else completeSession(b._id)
            },
            onNoShow: (row) => {
              if (paymentBlockReason) {
                Toast.show({ type: 'error', text1: paymentBlockReason })
                return
              }
              if (row.perSession) {
                setNoShowReason('')
                setNoShowRow(row)
              }
            },
          }}
        />
      </Card>

      <View style={styles.sectionGapMd} />
      <Card style={multiNotes ? styles.notesCard : null}>
        {multiNotes ? (
          <Pressable onPress={toggleNotes} style={styles.notesHeaderPress}>
            <SectionTitle
              title="Session notes"
              hint="Patients can read notes you save here."
              right={<Text style={styles.chevron}>{notesExpanded ? '▼' : '▶'}</Text>}
            />
          </Pressable>
        ) : (
          <SectionTitle title="Session notes" hint="Patients can read notes you save here." />
        )}
        {notesExpanded
          ? noteRows.map((r) => <SessionNoteEditor key={r.key} row={r} onSaved={load} />)
          : null}
      </Card>

      <View style={styles.sectionGapMd} />
      <Card>
        <SectionTitle title="Plan & payment" hint="Quoted plan and payment state for this booking." />
        <Text style={styles.subHead}>Plan</Text>
        <KV k="Sessions" v={b.sessions != null ? String(b.sessions) : '—'} />
        <KV k="Price / session" v={b.amountPerSession != null ? `₹${b.amountPerSession}` : '—'} />
        <KV k="Plan status" v={b.planStatus || '—'} cap />
        {b.discountPercent != null ? <KV k="Discount" v={`${b.discountPercent}%`} /> : null}
        <KV k="Total" v={paymentAmountLabel(b)} />
        <KV
          k="Distance at assign"
          v={
            b.distanceKmAtAssign != null
              ? `${Number(b.distanceKmAtAssign) < 10 ? Number(b.distanceKmAtAssign).toFixed(1) : Math.round(Number(b.distanceKmAtAssign))} km`
              : '—'
          }
        />
        <KV
          k="Distance surcharge"
          v={`₹${Number(b.distanceSurchargeAmount || 0).toFixed(2)}${
            Number(b.distanceExtraKm || 0) > 0 && Number(b.distanceSurchargePerKm || 0) > 0
              ? ` (${Number(b.distanceExtraKm)} km × ₹${Number(b.distanceSurchargePerKm)}/km)`
              : ''
          }`}
          last
        />
        <View style={styles.subSectionRule} />
        <Text style={styles.subHead}>Payment</Text>
        <KV k="Mode" v={paymentModeLabel(b)} />
        <KV k="Payment hold" v={paymentStatusLabel(b.paymentStatus)} />
        <KV k="Payment step" v={marketplacePaymentStatusLabel(b.payment?.status)} />
        <KV k="Amount" v={paymentAmountLabel(b)} bold last />
        {b.offlinePaymentRejectReason && b.payment?.status === 'pending' ? (
          <View style={styles.warnBox}>
            <Text style={styles.warnTitle}>Admin note</Text>
            <Text style={styles.warnBody}>{b.offlinePaymentRejectReason}</Text>
          </View>
        ) : null}
      </Card>

      {showCreatePlan ? (
        <Card style={styles.footerCard}>
          <SectionTitle title="Create home plan" hint="Set sessions, fee, and coverage for the patient to approve." />
          <HomePlanFormPhysio booking={b} busy={busy} onSubmit={(payload) => createPlan(b._id, payload)} />
        </Card>
      ) : null}

      {!hasSchedulePlan ? (
        <Card style={styles.footerCard}>
          <SectionTitle title="Quick action" hint="Single-session bookings only." />
          <Button
            title={b.sessionStatus === 'completed' ? 'Completed' : 'Mark complete'}
            disabled={busy || b.sessionStatus === 'completed' || !canMarkComplete}
            loading={busy}
            onPress={() => completeSession(b._id)}
          />
          {!canMarkComplete && b.sessionStatus !== 'completed' ? (
            <Text style={styles.mutedSm}>{paymentBlockReason}</Text>
          ) : null}
        </Card>
      ) : null}

      <Modal transparent visible={Boolean(noShowRow)} animationType="fade">
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <Text style={styles.h2}>Mark no-show</Text>
            <Text style={styles.mutedSm}>
              Session #{noShowRow?.n} · {noShowRow ? formatBookingDateAndSlot(noShowRow.date, noShowRow.time) : ''}
            </Text>
            <Text style={[styles.k, { marginTop: 12 }]}>Reason (optional)</Text>
            <TextInput
              style={styles.ta}
              value={noShowReason}
              onChangeText={setNoShowReason}
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <Button
                variant="outline"
                title="Cancel"
                onPress={() => {
                  setNoShowRow(null)
                  setNoShowReason('')
                }}
              />
              <Button
                title={busySessionKey ? 'Saving…' : 'Mark no-show'}
                loading={busySessionKey != null}
                disabled={busySessionKey != null}
                onPress={submitNoShow}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={recordCollectionOpen} animationType="slide">
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <Text style={styles.h2}>Record collection</Text>
            <Text style={styles.mutedSm}>
              Outstanding ₹{outstanding.toFixed(2)}. Admin verifies before unlocking a session.
            </Text>
            <Text style={[styles.k, { marginTop: 12 }]}>Amount</Text>
            <TextInput style={styles.inp} keyboardType="decimal-pad" value={recordAmount} onChangeText={setRecordAmount} />
            <Text style={[styles.k, { marginTop: 12 }]}>Note (optional)</Text>
            <TextInput style={styles.ta} value={recordNote} onChangeText={setRecordNote} multiline />
            {recordErr ? <Text style={styles.errSm}>{recordErr}</Text> : null}
            <View style={styles.modalActions}>
              <Button
                variant="outline"
                title="Cancel"
                onPress={() => {
                  setRecordCollectionOpen(false)
                  setRecordErr('')
                }}
              />
              <Button title={recordBusy ? 'Saving…' : 'Submit'} loading={recordBusy} onPress={submitRecordCollection} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={Boolean(rescheduleRow)} animationType="fade" onRequestClose={closeRescheduleModal}>
        <View style={styles.modalRootFlex}>
          <Pressable style={styles.modalBackdropFill} onPress={closeRescheduleModal} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={[styles.modalCard, styles.rescheduleCard]}>
            <Text style={styles.rescheduleTitle}>Reschedule session</Text>
            {rescheduleRow && booking ? (
              <Text style={styles.rescheduleSub}>
                {(rescheduleRow.n != null
                  ? `Session #${rescheduleRow.n}`
                  : rescheduleRow.sessionId
                    ? 'This session'
                    : 'Visit') +
                  ' — currently ' +
                  formatBookingDateAndSlot(
                    rescheduleRow.date || booking.date,
                    rescheduleRow.time || booking.timeSlot,
                  )}
              </Text>
            ) : null}
            {booking?.rescheduled && booking.previousDate != null && !rescheduleRow?.sessionId ? (
              <Text style={styles.reschedulePrev}>
                Previously: {formatBookingDateAndSlot(booking.previousDate, booking.previousTimeSlot)}
              </Text>
            ) : null}

            <Text style={styles.rescheduleLabel}>New date</Text>
            {Platform.OS === 'ios' && iosSupportsCompactDate() ? (
              <View style={styles.rescheduleIosDateWrap}>
                <DateTimePicker
                  value={rescheduleDate}
                  mode="date"
                  display="compact"
                  themeVariant="light"
                  minimumDate={rescheduleMinDate}
                  onChange={(_, selected) => selected && setRescheduleDate(selected)}
                />
              </View>
            ) : Platform.OS === 'ios' ? (
              <>
                <Pressable style={styles.rescheduleDateTap} onPress={() => setIosRescheduleDateOpen((o) => !o)}>
                  <Text style={styles.rescheduleDateTapTxt}>{formatDmyDots(rescheduleDate)}</Text>
                  <Text style={styles.rescheduleCalendarIcon} accessibilityLabel="Pick date">
                    📅
                  </Text>
                </Pressable>
                {iosRescheduleDateOpen ? (
                  <>
                    <DateTimePicker
                      value={rescheduleDate}
                      mode="date"
                      display="spinner"
                      minimumDate={rescheduleMinDate}
                      themeVariant="light"
                      onChange={(_, selected) => {
                        if (selected) setRescheduleDate(selected)
                      }}
                    />
                    <Button title="Done" variant="outline" onPress={() => setIosRescheduleDateOpen(false)} />
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Pressable style={styles.rescheduleDateTap} onPress={() => setAndroidRescheduleDateOpen(true)}>
                  <Text style={styles.rescheduleDateTapTxt}>{formatDmyDots(rescheduleDate)}</Text>
                  <Text style={styles.rescheduleCalendarIcon}>📅</Text>
                </Pressable>
                {androidRescheduleDateOpen ? (
                  <DateTimePicker
                    value={rescheduleDate}
                    mode="date"
                    display="calendar"
                    minimumDate={rescheduleMinDate}
                    themeVariant="light"
                    onChange={(ev, selected) => {
                      setAndroidRescheduleDateOpen(false)
                      if (ev?.type !== 'dismissed' && selected) setRescheduleDate(selected)
                    }}
                  />
                ) : null}
              </>
            )}

            <Text style={[styles.rescheduleLabel, styles.rescheduleLabelSpaced]}>New time slot</Text>
            <View style={styles.slotGrid}>
              {DAILY_SLOTS.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.slotPick, rescheduleSlot === s && styles.slotPickOn]}
                  onPress={() => setRescheduleSlot(s)}
                >
                  <Text style={[styles.slotPickTxt, rescheduleSlot === s && styles.slotPickTxtOn]}>
                    {formatBookingTimeSlot(s)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button variant="outline" title="Cancel" onPress={closeRescheduleModal} disabled={rescheduleBusy} />
              <Button
                title={rescheduleBusy ? 'Saving…' : 'Save new time'}
                onPress={saveReschedule}
                loading={rescheduleBusy}
                disabled={rescheduleBusy}
              />
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </BookingDetailChrome>
  )
}

function KV({ k, v, cap, bold, last }) {
  return (
    <View style={[styles.kvRow, last && styles.kvRowLast]}>
      <Text style={styles.kvK}>{k}</Text>
      <Text style={[styles.kvV, bold && styles.kvBold, cap && styles.kvCap]}>{v}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.slate50 },
  screenBody: { backgroundColor: colors.slate50 },
  sectionGapMd: { height: 12 },
  timelineInnerGap: { height: 6 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  accentBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
    marginRight: 10,
    marginTop: 3,
    minHeight: 36,
  },
  sectionTitleTextCol: { flex: 1, minWidth: 0 },
  sectionTitleRight: { paddingTop: 2, paddingLeft: 4 },
  sectionHint: { marginTop: 4, fontSize: 12, color: colors.slate500, lineHeight: 17, fontWeight: '500' },
  subHead: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '800',
    color: colors.teal800,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  subSectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginVertical: 16,
  },
  heroCard: { padding: 0, overflow: 'hidden' },
  heroStripe: { height: 4, width: '100%', backgroundColor: colors.brand },
  heroInner: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginTop: 14,
    marginBottom: 12,
  },
  heroPatientRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  heroPatientCol: { flex: 1, minWidth: 0 },
  heroPatientName: { marginTop: 4, fontSize: 17, fontWeight: '800', color: colors.slate900 },
  directionsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.brand,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  directionsBtnOff: { opacity: 0.45 },
  directionsBtnTxt: { fontSize: 13, fontWeight: '800', color: colors.white },
  physioSelfBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  bannerMint: {
    marginTop: 12,
    marginHorizontal: 0,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.35)',
    backgroundColor: colors.brandSoft,
  },
  bannerMintTxt: { fontWeight: '700', fontSize: 13, color: colors.teal800, lineHeight: 19 },
  notesCard: { paddingTop: 4 },
  notesHeaderPress: { marginBottom: 8 },
  chevron: { fontSize: 14, color: colors.brand, fontWeight: '800' },
  noteEditorWrap: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  footerCard: { marginTop: 12 },
  kvRowLast: { borderBottomWidth: 0 },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  customHeaderHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  customHeaderBack: { fontSize: 24, fontWeight: '600', color: colors.brand, marginTop: -2 },
  customHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.brand,
  },
  customHeaderRightSpacer: { width: 44 },
  scroll: { flex: 1, backgroundColor: colors.slate50 },
  pad: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, backgroundColor: colors.slate50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.slate50 },
  k: { fontSize: 11, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase' },
  v: { marginTop: 4, fontSize: 15, fontWeight: '600', color: colors.slate900 },
  h1: { marginTop: 4, fontSize: 22, fontWeight: '800', color: colors.slate900 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.slate900, letterSpacing: -0.2 },
  muted: { fontSize: 14, color: colors.slate500 },
  mutedSm: { marginTop: 4, fontSize: 12, color: colors.slate500 },
  err: { fontSize: 15, color: colors.red600, marginBottom: 12 },
  errSm: { marginTop: 8, color: colors.red600, fontSize: 13 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: { backgroundColor: colors.amber50, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.amber200 },
  pillTxt: { fontSize: 12, fontWeight: '700', color: colors.amber950 },
  pillMuted: { backgroundColor: colors.slate50, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.slate200 },
  pillTxtSm: { fontSize: 11, fontWeight: '600', color: colors.slate800 },
  pillTealOutline: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.45)',
  },
  sep: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: 10 },
  issue: { marginTop: 6, fontSize: 14, color: colors.slate800, lineHeight: 20 },
  help: { marginTop: 6, fontSize: 12, color: colors.slate500, lineHeight: 17 },
  infoStripe: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.35)',
  },
  infoStripeTxt: { fontSize: 12, color: colors.slate900 },
  outlineMini: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  outlineMiniTxt: { fontSize: 12, fontWeight: '700', color: colors.slate900 },
  ta: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 10,
    minHeight: 72,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.slate900,
    backgroundColor: colors.slate50,
  },
  taOnFill: { backgroundColor: colors.white },
  inp: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.slate900,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  kvK: { fontSize: 13, color: colors.slate500 },
  kvV: { fontSize: 13, fontWeight: '600', color: colors.slate900, flexShrink: 1, textAlign: 'right' },
  kvBold: { fontWeight: '800' },
  kvCap: { textTransform: 'capitalize' },
  warnBox: { marginTop: 12, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2' },
  warnTitle: { fontWeight: '700', color: '#9f1239' },
  warnBody: { marginTop: 4, fontSize: 12, color: '#9f1239' },
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 },
  modalRootFlex: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 24 },
  modalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  modalCard: {
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rescheduleCard: {
    maxHeight: '92%',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    borderRadius: 20,
  },
  rescheduleTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900, letterSpacing: -0.3 },
  rescheduleSub: { marginTop: 8, fontSize: 14, color: colors.slate500, lineHeight: 21, fontWeight: '500' },
  reschedulePrev: { marginTop: 8, fontSize: 12, color: colors.amber800, fontWeight: '600' },
  rescheduleLabel: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  rescheduleLabelSpaced: { marginTop: 20 },
  rescheduleIosDateWrap: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  rescheduleDateTap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  rescheduleDateTapTxt: { fontSize: 15, fontWeight: '600', color: colors.slate900 },
  rescheduleCalendarIcon: { fontSize: 18 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  slotPick: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSubtle },
  slotPickOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  slotPickTxt: { fontSize: 11, fontWeight: '600', color: colors.slate700 },
  slotPickTxtOn: { color: colors.brandHover },
})
