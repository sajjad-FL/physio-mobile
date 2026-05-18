import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../api/client'
import BookingSessionTimelinePhysio from '../components/physio/BookingSessionTimelinePhysio'
import HomePlanFormPhysio from '../components/physio/HomePlanFormPhysio'
import InstallmentsPhysioCard from '../components/physio/InstallmentsPhysioCard'
import SessionProgressPhysio from '../components/physio/SessionProgressPhysio'
import { DAILY_SLOTS } from '../constants/slots'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'
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
import DropdownField from '../components/ui/DropdownField'

const RESCHEDULE_SLOT_OPTIONS = DAILY_SLOTS.map((s) => ({
  value: s,
  label: formatBookingTimeSlot(s),
}))

const BASE_TABS = [
  { key: 'overview', label: 'Overview', icon: 'home-outline', iconOn: 'home' },
  { key: 'sessions', label: 'Sessions', icon: 'calendar-outline', iconOn: 'calendar' },
  { key: 'payments', label: 'Payment', icon: 'card-outline', iconOn: 'card' },
  { key: 'plan', label: 'Plan', icon: 'clipboard-outline', iconOn: 'clipboard' },
  { key: 'notes', label: 'Notes', icon: 'document-text-outline', iconOn: 'document-text' },
]

const TabBar = memo(function TabBar({ activeTab, onChange, tabs, badges = {} }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScroll}
      contentContainerStyle={styles.tabScrollContent}
      nestedScrollEnabled
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.key
        const hasBadge = badges[tab.key]
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tabBtn, active && styles.tabBtnActive]}
            onPress={() => onChange(tab.key)}
          >
            <View style={styles.tabIconWrap}>
              <Ionicons
                name={active ? tab.iconOn : tab.icon}
                size={13}
                color={active ? colors.white : colors.slate400}
              />
              {hasBadge && !active ? <View style={styles.tabBadgeDot} /> : null}
            </View>
            <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
})

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

function iosSupportsCompactDate() {
  if (Platform.OS !== 'ios') return false
  const v = Platform.Version
  if (typeof v === 'number') return v >= 14
  const n = parseFloat(String(v))
  return !Number.isNaN(n) && n >= 14
}

function patientInitial(name) {
  const s = (name || '?').trim()
  return s ? s.slice(0, 1).toUpperCase() : '?'
}

function openWhatsApp(phone) {
  const cleaned = String(phone || '').replace(/\D/g, '')
  const number = cleaned.startsWith('91') && cleaned.length === 12 ? cleaned : '91' + cleaned.slice(-10)
  Linking.openURL(`https://wa.me/${number}`)
}

function callPhone(phone) {
  const cleaned = String(phone || '').replace(/\D/g, '')
  const number = cleaned.startsWith('91') && cleaned.length === 12 ? cleaned : '91' + cleaned.slice(-10)
  Linking.openURL(`tel:+${number}`)
}

const BookingDetailChrome = memo(function BookingDetailChrome({ navigation, insetsTop, title, subtitle, children }) {
  return (
    <View style={styles.screenRoot}>
      <View style={[styles.customHeader, { paddingTop: insetsTop + 6 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.white} />
        </Pressable>
        <View style={styles.customHeaderCenter}>
          <Text style={styles.customHeaderTitle} numberOfLines={1}>{title || 'Booking Details'}</Text>
          {subtitle ? <Text style={styles.customHeaderSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={styles.customHeaderSpacer} />
      </View>
      {children}
    </View>
  )
})

const SectionTitle = memo(function SectionTitle({ title, hint, icon = 'information-circle-outline', right }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={14} color={colors.brand} />
      </View>
      <View style={styles.sectionTitleBody}>
        <Text style={styles.h2}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      {right ? <View style={styles.sectionTitleRight}>{right}</View> : null}
    </View>
  )
})

const SessionNoteEditor = memo(function SessionNoteEditor({ row, onSaved }) {
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
      <View style={styles.noteEditorHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.noteEditorN}>Session {row.n}</Text>
          <Text style={styles.noteEditorDate}>{formatBookingDateAndSlot(row.date, row.time)}</Text>
        </View>
        <Pressable
          style={[styles.saveNoteBtn, busy && styles.saveNoteBtnBusy]}
          onPress={save}
          disabled={busy}
          hitSlop={4}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.textTertiary} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={13} color={colors.white} />
              <Text style={styles.saveNoteBtnTxt}>Save</Text>
            </>
          )}
        </Pressable>
      </View>
      <TextInput
        style={styles.ta}
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Observations, exercises, follow-up…"
        placeholderTextColor={colors.slate400}
      />
      <Text style={styles.noteEditorTs}>
        {meta.updatedAt ? `Saved ${new Date(meta.updatedAt).toLocaleString('en-IN')}` : 'Not saved yet'}
      </Text>
    </View>
  )
})

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
  const [activeTab, setActiveTab] = useState('overview')

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

  useEffect(() => { load() }, [load])

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
    if (unlockedSessions <= 0) return 'Collect at least one installment before completing any session.'
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
  const noteRows = useMemo(() => (booking ? normalizeSessionRows(booking) : []), [booking])
  const multiNotes = noteRows.length > 1

  const toggleNotes = useCallback(() => {
    if (!multiNotes) return
    setNotesExpanded((o) => !o)
  }, [multiNotes])

  if (loading) {
    return (
      <BookingDetailChrome navigation={navigation} insetsTop={insets.top}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </BookingDetailChrome>
    )
  }

  if (error || !booking) {
    return (
      <BookingDetailChrome navigation={navigation} insetsTop={insets.top}>
        <View style={styles.center}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="warning-outline" size={28} color={colors.warning} />
          </View>
          <Text style={styles.err}>{error || 'Not found'}</Text>
          <Pressable style={styles.backBtnOutline} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnOutlineTxt}>Go back</Text>
          </Pressable>
        </View>
      </BookingDetailChrome>
    )
  }

  const b = booking
  const busy = busyId === b._id
  const canStartNavigation = Boolean(b.userId?.coordinates || String(b.userId?.location || '').trim())
  const hasPhone = Boolean(b.userId?.phone)
  const scrollBottomPad = 14 + insets.bottom + 14

  return (
    <BookingDetailChrome
      navigation={navigation}
      insetsTop={insets.top}
      title={b.userId?.name || 'Booking'}
      subtitle={formatBookingDateAndSlot(b.date, b.timeSlot)}
    >
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

        {/* ── Hero card ──────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Brand band: service type + date + status pills */}
          <View style={styles.heroBand}>
            <View style={styles.heroBandTopRow}>
              <View style={styles.heroBandLabelWrap}>
                <Ionicons
                  name={b.serviceType === 'online' ? 'videocam-outline' : 'home-outline'}
                  size={11}
                  color="rgba(255,255,255,0.85)"
                />
                <Text style={styles.heroBandLabel}>
                  {b.serviceType === 'online' ? 'ONLINE SESSION' : 'HOME VISIT'}
                </Text>
              </View>
              {b.rescheduled ? (
                <View style={styles.heroBandReschedTag}>
                  <Ionicons name="refresh-outline" size={10} color={colors.amber800} />
                  <Text style={styles.heroBandReschedTxt}>Rescheduled</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.heroBandDate}>{formatBookingDateAndSlot(b.date, b.timeSlot)}</Text>
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillTxt}>{sessionStatusLabel(b)}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillTxt}>Hold: {paymentStatusLabel(b.paymentStatus)}</Text>
              </View>
              {b.payment?.status != null ? (
                <View style={styles.pill}>
                  <Text style={styles.pillTxt}>Pay: {marketplacePaymentStatusLabel(b.payment.status)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Patient section: avatar + name + phone + issue */}
          <View style={styles.heroPatientSection}>
            <View style={styles.heroPatientTop}>
              <View style={styles.heroAvatarWrap}>
                <Text style={styles.heroAvatarTxt}>{patientInitial(b.userId?.name)}</Text>
              </View>
              <View style={styles.heroPatientInfo}>
                <Text style={styles.heroPatientName} numberOfLines={1}>{b.userId?.name ?? '—'}</Text>
                {b.userId?.phone ? (
                  <View style={styles.heroPhoneRow}>
                    <Ionicons name="call-outline" size={11} color={colors.textTertiary} />
                    <Text style={styles.heroPatientPhone}>{b.userId.phone}</Text>
                  </View>
                ) : null}
                {b.issue ? (
                  <View style={styles.heroIssueRow}>
                    <Ionicons name="medical-outline" size={11} color={colors.brand} />
                    <Text style={styles.heroIssue} numberOfLines={2}>{b.issue}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Contact + navigation actions */}
            <View style={styles.heroContactRow}>
              <Pressable
                style={[styles.heroContactBtn, styles.heroCallBtn, !hasPhone && styles.heroContactBtnOff]}
                disabled={!hasPhone}
                onPress={() => callPhone(b.userId.phone)}
              >
                <Ionicons name="call" size={14} color={hasPhone ? colors.brand : colors.slate300} />
                <Text style={[styles.heroContactBtnTxt, styles.heroCallBtnTxt, !hasPhone && styles.heroContactBtnTxtOff]}>
                  Call
                </Text>
              </Pressable>

              <Pressable
                style={[styles.heroContactBtn, styles.heroWaBtn, !hasPhone && styles.heroContactBtnOff]}
                disabled={!hasPhone}
                onPress={() => openWhatsApp(b.userId.phone)}
              >
                <Ionicons name="logo-whatsapp" size={14} color={hasPhone ? '#25D366' : colors.slate300} />
                <Text style={[styles.heroContactBtnTxt, styles.heroWaBtnTxt, !hasPhone && styles.heroContactBtnTxtOff]}>
                  WhatsApp
                </Text>
              </Pressable>

              {b.serviceType !== 'online' ? (
                <Pressable
                  style={[styles.heroContactBtn, styles.heroNavBtn, !canStartNavigation && styles.heroContactBtnOff]}
                  disabled={!canStartNavigation}
                  onPress={() => openGoogleMapsDestination({
                    coordinates: b.userId?.coordinates,
                    address: b.userId?.location,
                  })}
                >
                  <Ionicons name="navigate" size={14} color={canStartNavigation ? colors.white : colors.slate300} />
                  <Text style={[styles.heroContactBtnTxt, styles.heroNavBtnTxt, !canStartNavigation && styles.heroContactBtnTxtOff]}>
                    Navigate
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Plan pending banner ────────────────────── */}
        {showPlanPending ? (
          <View style={styles.bannerMint}>
            <Ionicons name="time-outline" size={14} color={colors.teal800} />
            <Text style={styles.bannerMintTxt}>Awaiting patient approval on the proposed plan.</Text>
          </View>
        ) : null}

        {/* ── Tab bar ────────────────────────────────── */}
        <TabBar
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={b.serviceType === 'home' ? BASE_TABS : BASE_TABS.filter((t) => t.key !== 'plan')}
          badges={{ plan: showCreatePlan }}
        />

        {/* ── Overview tab ───────────────────────────── */}
        {activeTab === 'overview' ? (
          <>
            <SessionProgressPhysio booking={b} />

            <View style={styles.sectionGap} />
            <View style={styles.sectionCard}>
              <SectionTitle
                title="People & clinical context"
                hint="Referral and your assignment on this case."
                icon="people-outline"
              />
              <View style={styles.physioSelfBox}>
                <View style={styles.physioSelfIconWrap}>
                  <Ionicons name="person" size={16} color={colors.white} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.k}>You (assigned)</Text>
                  <Text style={styles.v}>{b.physioId?.name ?? '—'}</Text>
                  {b.physioId?.phone ? <Text style={styles.mutedSm}>{b.physioId.phone}</Text> : null}
                  {b.physioId?.specialization ? <Text style={styles.mutedSm}>{b.physioId.specialization}</Text> : null}
                </View>
              </View>
              <View style={styles.issueBox}>
                <Text style={styles.k}>Chief complaint</Text>
                <Text style={styles.issue}>{b.issue}</Text>
              </View>
            </View>
          </>
        ) : null}

        {/* ── Sessions tab ────────────────────────────── */}
        {activeTab === 'sessions' ? (
          <>
            <View style={styles.sectionGap} />
            <View style={styles.sectionCard}>
              <SectionTitle
                title="Session timeline"
                hint="Complete after visits; mark no-show if the patient missed a session."
                icon="calendar-outline"
              />
              {paymentSummary && unlockedSessions < sessionsCount ? (
                <View style={styles.infoStripe}>
                  <Ionicons name="information-circle-outline" size={13} color={colors.teal800} />
                  <Text style={styles.infoStripeTxt}>
                    {unlockedSessions === 0
                      ? 'Collect at least one installment to unlock session #1.'
                      : `You can complete up to session #${unlockedSessions} of ${sessionsCount}.`}
                  </Text>
                </View>
              ) : null}
              <View style={{ height: 8 }} />
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
            </View>
          </>
        ) : null}

        {/* ── Payments tab ────────────────────────────── */}
        {activeTab === 'payments' && showInstallments ? (
          <>
            <View style={styles.sectionGap} />
            <InstallmentsPhysioCard
              title={isOfflinePlan ? 'Collections' : 'Installments'}
              subtitle={
                isOfflinePlan
                  ? 'Record each cash/UPI hand-off.'
                  : 'Patient pays online per installment; each verified payment unlocks the next session.'
              }
              summary={paymentSummary}
              payments={paymentsList}
              emptyMessage={isOfflinePlan ? 'No collections recorded yet.' : 'No online installments yet.'}
            >
              {isOfflinePlan && outstanding > 0.009 && b.planStatus === 'approved' ? (
                <Pressable
                  style={styles.recordCollectionBtn}
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
                  <Ionicons name="add-circle-outline" size={14} color={colors.white} />
                  <Text style={styles.recordCollectionBtnTxt}>Record collection</Text>
                </Pressable>
              ) : null}
            </InstallmentsPhysioCard>
          </>
        ) : null}

        {activeTab === 'payments' ? (
          <>
            <View style={styles.sectionGap} />
            <View style={styles.sectionCard}>
              <SectionTitle title="Plan & payment" hint="Quoted plan and payment state for this booking." icon="card-outline" />
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
            </View>

          </>
        ) : null}

        {/* ── Plan tab ─────────────────────────────────── */}
        {activeTab === 'plan' ? (
          <>
            <View style={styles.sectionGap} />
            {showCreatePlan ? (
              <HomePlanFormPhysio booking={b} busy={busy} onSubmit={(payload) => createPlan(b._id, payload)} />
            ) : showPlanPending ? (
              <View style={styles.planPendingCard}>
                <View style={styles.planPendingIconWrap}>
                  <Ionicons name="hourglass-outline" size={28} color={colors.warning} />
                </View>
                <Text style={styles.planPendingTitle}>Awaiting patient approval</Text>
                <Text style={styles.planPendingBody}>
                  You submitted a plan with {b.sessions} session{b.sessions !== 1 ? 's' : ''} at ₹{b.amountPerSession}/session.
                  The patient will review and approve it.
                </Text>
                <View style={styles.planPendingKVs}>
                  <PlanKV label="Sessions" value={String(b.sessions ?? '—')} />
                  <PlanKV label="Fee/session" value={b.amountPerSession != null ? `₹${b.amountPerSession}` : '—'} />
                  {b.discountPercent != null ? <PlanKV label="Discount" value={`${b.discountPercent}%`} /> : null}
                  <PlanKV label="Total" value={paymentAmountLabel(b)} highlight />
                </View>
              </View>
            ) : b.planStatus === 'approved' ? (
              <View style={styles.planApprovedCard}>
                <View style={styles.planApprovedHead}>
                  <View style={styles.planApprovedIconWrap}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planApprovedTitle}>Plan approved</Text>
                    <Text style={styles.planApprovedSub}>Patient accepted the plan. Sessions are active.</Text>
                  </View>
                </View>
                <View style={styles.planPendingKVs}>
                  <PlanKV label="Sessions" value={String(b.sessions ?? '—')} />
                  <PlanKV label="Fee/session" value={b.amountPerSession != null ? `₹${b.amountPerSession}` : '—'} />
                  {b.discountPercent != null ? <PlanKV label="Discount" value={`${b.discountPercent}%`} /> : null}
                  <PlanKV label="Mode" value={paymentModeLabel(b)} />
                  <PlanKV label="Total" value={paymentAmountLabel(b)} highlight />
                </View>
              </View>
            ) : (
              <View style={styles.planNaCard}>
                <Ionicons name="clipboard-outline" size={28} color={colors.slate300} />
                <Text style={styles.planNaTxt}>No plan for this booking type.</Text>
              </View>
            )}
          </>
        ) : null}

        {/* ── Notes tab ───────────────────────────────── */}
        {activeTab === 'notes' ? (
          <>
            <View style={styles.sectionGap} />
            <View style={styles.sectionCard}>
              {multiNotes ? (
                <Pressable onPress={toggleNotes} style={styles.notesHeaderPress}>
                  <SectionTitle
                    title="Session notes"
                    hint="Patients can read notes you save here."
                    icon="document-text-outline"
                    right={
                      <Ionicons
                        name={notesExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.brand}
                      />
                    }
                  />
                </Pressable>
              ) : (
                <SectionTitle title="Session notes" hint="Patients can read notes you save here." icon="document-text-outline" />
              )}
              {notesExpanded
                ? noteRows.map((r) => <SessionNoteEditor key={r.key} row={r} onSaved={load} />)
                : null}
            </View>
          </>
        ) : null}

        {/* ── Quick action (sessions, no schedule plan) ── */}
        {activeTab === 'sessions' && !hasSchedulePlan ? (
          <View style={[styles.sectionCard, styles.footerCard]}>
            <SectionTitle title="Quick action" hint="Single-session bookings only." icon="flash-outline" />
            <Pressable
              style={[
                styles.completeBtn,
                (busy || b.sessionStatus === 'completed' || !canMarkComplete) && styles.completeBtnDisabled,
              ]}
              disabled={busy || b.sessionStatus === 'completed' || !canMarkComplete}
              onPress={() => completeSession(b._id)}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons
                    name={b.sessionStatus === 'completed' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={16}
                    color={colors.white}
                  />
                  <Text style={styles.completeBtnTxt}>
                    {b.sessionStatus === 'completed' ? 'Completed' : 'Mark complete'}
                  </Text>
                </>
              )}
            </Pressable>
            {!canMarkComplete && b.sessionStatus !== 'completed' ? (
              <Text style={styles.mutedSm}>{paymentBlockReason}</Text>
            ) : null}
          </View>
        ) : null}

        {/* ── No-show modal ──────────────────────────── */}
        <Modal transparent visible={Boolean(noShowRow)} animationType="fade">
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={() => { setNoShowRow(null); setNoShowReason('') }} />
            <View style={styles.modalCard}>
              <View style={styles.modalIconRow}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="person-remove-outline" size={18} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Mark no-show</Text>
                  <Text style={styles.modalSub}>
                    Session #{noShowRow?.n} · {noShowRow ? formatBookingDateAndSlot(noShowRow.date, noShowRow.time) : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.inputLabel}>Reason (optional)</Text>
              <TextInput
                style={styles.ta}
                value={noShowReason}
                onChangeText={setNoShowReason}
                multiline
                maxLength={500}
                placeholder="Briefly describe the situation…"
                placeholderTextColor={colors.slate400}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => { setNoShowRow(null); setNoShowReason('') }}
                >
                  <Text style={styles.modalCancelTxt}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalDangerBtn, busySessionKey && styles.modalBtnBusy]}
                  disabled={busySessionKey != null}
                  onPress={submitNoShow}
                >
                  {busySessionKey ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.modalDangerTxt}>Mark no-show</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Record collection modal ────────────────── */}
        <Modal transparent visible={recordCollectionOpen} animationType="slide">
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={() => { setRecordCollectionOpen(false); setRecordErr('') }} />
            <View style={styles.modalCard}>
              <View style={styles.modalIconRow}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.successBg }]}>
                  <Ionicons name="cash-outline" size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Record collection</Text>
                  <Text style={styles.modalSub}>
                    Outstanding ₹{outstanding.toFixed(2)}. Admin verifies before unlocking a session.
                  </Text>
                </View>
              </View>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.inp}
                keyboardType="decimal-pad"
                value={recordAmount}
                onChangeText={setRecordAmount}
                placeholder="0.00"
                placeholderTextColor={colors.slate400}
              />
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Note (optional)</Text>
              <TextInput style={styles.ta} value={recordNote} onChangeText={setRecordNote} multiline placeholder="Cash / UPI reference…" placeholderTextColor={colors.slate400} />
              {recordErr ? <Text style={styles.errSm}>{recordErr}</Text> : null}
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => { setRecordCollectionOpen(false); setRecordErr('') }}
                >
                  <Text style={styles.modalCancelTxt}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalPrimaryBtn, recordBusy && styles.modalBtnBusy]}
                  disabled={recordBusy}
                  onPress={submitRecordCollection}
                >
                  {recordBusy ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.modalPrimaryTxt}>Submit</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Reschedule modal ───────────────────────── */}
        <Modal
          transparent
          visible={Boolean(rescheduleRow)}
          animationType="fade"
          onRequestClose={closeRescheduleModal}
        >
          <View style={styles.modalRootFlex}>
            <Pressable style={styles.modalBackdrop} onPress={closeRescheduleModal} accessibilityRole="button" accessibilityLabel="Close" />
            <View style={[styles.modalCard, styles.rescheduleCard]}>
              <View style={styles.modalIconRow}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.blue50 }]}>
                  <Ionicons name="calendar-outline" size={18} color={colors.blue600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Reschedule session</Text>
                  {rescheduleRow && booking ? (
                    <Text style={styles.modalSub}>
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
                </View>
              </View>

              {booking?.rescheduled && booking.previousDate != null && !rescheduleRow?.sessionId ? (
                <View style={styles.reschedulePrevBox}>
                  <Ionicons name="arrow-back-outline" size={12} color={colors.amber800} />
                  <Text style={styles.reschedulePrev}>
                    Previously: {formatBookingDateAndSlot(booking.previousDate, booking.previousTimeSlot)}
                  </Text>
                </View>
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
                    <Ionicons name="calendar-outline" size={15} color={colors.brand} />
                    <Text style={styles.rescheduleDateTapTxt}>{formatDmyDots(rescheduleDate)}</Text>
                    <Ionicons name={iosRescheduleDateOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.slate400} />
                  </Pressable>
                  {iosRescheduleDateOpen ? (
                    <>
                      <DateTimePicker
                        value={rescheduleDate}
                        mode="date"
                        display="spinner"
                        minimumDate={rescheduleMinDate}
                        themeVariant="light"
                        onChange={(_, selected) => { if (selected) setRescheduleDate(selected) }}
                      />
                      <Pressable style={styles.modalCancelBtn} onPress={() => setIosRescheduleDateOpen(false)}>
                        <Text style={styles.modalCancelTxt}>Done</Text>
                      </Pressable>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <Pressable style={styles.rescheduleDateTap} onPress={() => setAndroidRescheduleDateOpen(true)}>
                    <Ionicons name="calendar-outline" size={15} color={colors.brand} />
                    <Text style={styles.rescheduleDateTapTxt}>{formatDmyDots(rescheduleDate)}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.slate400} />
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

              <Text style={[styles.rescheduleLabel, { marginTop: 18 }]}>New time slot</Text>
              <DropdownField
                label={null}
                value={rescheduleSlot}
                placeholder="Select a time"
                options={RESCHEDULE_SLOT_OPTIONS}
                onSelect={setRescheduleSlot}
                variant="inline"
              />

              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancelBtn} onPress={closeRescheduleModal} disabled={rescheduleBusy}>
                  <Text style={styles.modalCancelTxt}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalPrimaryBtn, rescheduleBusy && styles.modalBtnBusy]}
                  onPress={saveReschedule}
                  disabled={rescheduleBusy}
                >
                  {rescheduleBusy ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.modalPrimaryTxt}>Save new time</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </BookingDetailChrome>
  )
}

const KV = memo(function KV({ k, v, cap, bold, last }) {
  return (
    <View style={[styles.kvRow, last && styles.kvRowLast]}>
      <Text style={styles.kvK}>{k}</Text>
      <Text style={[styles.kvV, bold && styles.kvBold, cap && styles.kvCap]}>{v}</Text>
    </View>
  )
})

const PlanKV = memo(function PlanKV({ label, value, highlight }) {
  return (
    <View style={styles.planKVRow}>
      <Text style={styles.planKVLabel}>{label}</Text>
      <Text style={[styles.planKVValue, highlight && styles.planKVValueHL]}>{value}</Text>
    </View>
  )
})

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.canvas },
  sectionGap: { height: 10 },
  footerCard: { marginTop: 10 },

  // ── Custom header ────────────────────────────────
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: colors.brand,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    flexShrink: 0,
  },
  customHeaderCenter: { flex: 1, minWidth: 0 },
  customHeaderTitle: {
    fontFamily: font.bold,
    fontSize: type.base,
    color: colors.white,
  },
  customHeaderSub: {
    marginTop: 1,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  customHeaderSpacer: { width: 34 },

  // ── Hero card ────────────────────────────────────
  heroCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroBand: {
    backgroundColor: colors.brandHover,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  heroBandTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroBandLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroBandLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroBandReschedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.amber50,
  },
  heroBandReschedTxt: { fontFamily: font.bold, fontSize: 9, color: colors.amber800 },
  heroBandDate: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.white,
    lineHeight: 26,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillTxt: { fontFamily: font.semiBold, fontSize: 10, color: colors.white },

  // Patient section
  heroPatientSection: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  heroPatientTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.teal50,
    borderWidth: 1.5,
    borderColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroAvatarTxt: { fontFamily: font.bold, fontSize: type.lg, color: colors.brand },
  heroPatientInfo: { flex: 1, minWidth: 0, gap: 3 },
  heroPatientName: { fontFamily: font.bold, fontSize: type.md, color: colors.textPrimary, lineHeight: 22 },
  heroPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroPatientPhone: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  heroIssueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 2 },
  heroIssue: { flex: 1, fontFamily: font.medium, fontSize: type.xs, color: colors.brand, lineHeight: 16 },

  // Contact action row
  heroContactRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  heroContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  heroContactBtnOff: { opacity: 0.4 },
  heroContactBtnTxt: { fontFamily: font.semiBold, fontSize: type.xs },
  heroContactBtnTxtOff: { color: colors.slate300 },
  heroCallBtn: { backgroundColor: colors.teal50, borderColor: colors.brandSoft },
  heroCallBtnTxt: { color: colors.brand },
  heroWaBtn: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  heroWaBtnTxt: { color: '#16a34a' },
  heroNavBtn: { backgroundColor: colors.brand, borderColor: colors.brand },
  heroNavBtnTxt: { color: colors.white },

  // ── Banner ───────────────────────────────────────
  bannerMint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.35)',
    backgroundColor: colors.brandSoft,
  },
  bannerMintTxt: { flex: 1, fontFamily: font.semiBold, fontSize: type.xs, color: colors.teal800, lineHeight: 16 },

  // ── Tab bar ──────────────────────────────────────
  tabIconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  tabBadgeDot: {
    position: 'absolute',
    top: -3,
    right: -5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  tabScroll: {
    marginTop: 12,
    maxWidth: '100%',
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    paddingRight: 10,
    gap: 10,
    flexGrow: 1,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  tabBtnActive: { backgroundColor: colors.brand },
  tabTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.slate400 },
  tabTxtActive: { color: colors.white },

  // ── Section titles ────────────────────────────────
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  sectionTitleBody: { flex: 1, minWidth: 0 },
  sectionTitleRight: { flexShrink: 0, marginTop: 2 },
  h2: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  sectionHint: { marginTop: 3, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary, lineHeight: 16 },

  // ── Section cards ────────────────────────────────
  sectionCard: {
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
  notesHeaderPress: { marginBottom: 4 },

  // ── People section ────────────────────────────────
  physioSelfBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    marginBottom: 12,
  },
  physioSelfIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  issueBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  issue: { marginTop: 6, fontFamily: font.regular, fontSize: type.sm, color: colors.slate700, lineHeight: 18 },

  // ── Info stripe ──────────────────────────────────
  infoStripe: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.35)',
  },
  infoStripeTxt: { flex: 1, fontFamily: font.regular, fontSize: type.xs, color: colors.teal800, lineHeight: 16 },

  // ── Payments ─────────────────────────────────────
  subHead: {
    marginTop: 12,
    marginBottom: 8,
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.teal800,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  subSectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginVertical: 14,
  },
  recordCollectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  recordCollectionBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },
  warnBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
  },
  warnTitle: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.danger },
  warnBody: { marginTop: 4, fontFamily: font.regular, fontSize: type.xs, color: colors.danger, lineHeight: 16 },

  // ── Note editor ───────────────────────────────────
  noteEditorWrap: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  noteEditorHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  noteEditorN: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  noteEditorDate: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  noteEditorTs: { marginTop: 6, fontFamily: font.regular, fontSize: 10, color: colors.textTertiary },
  saveNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.brand,
    flexShrink: 0,
  },
  saveNoteBtnBusy: { opacity: 0.55 },
  saveNoteBtnTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.white },

  // ── Quick action (complete session) ──────────────
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  completeBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  completeBtnTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.white },

  // ── KV rows ──────────────────────────────────────
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  kvRowLast: { borderBottomWidth: 0 },
  kvK: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  kvV: { fontFamily: font.medium, fontSize: type.sm, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  kvBold: { fontFamily: font.bold, color: colors.brand },
  kvCap: { textTransform: 'capitalize' },

  // ── Modals ───────────────────────────────────────
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalRootFlex: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  rescheduleCard: {
    maxHeight: '92%',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  modalIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary },
  modalSub: { marginTop: 3, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: 18 },
  inputLabel: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    alignItems: 'center',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  modalCancelTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDangerBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnBusy: { opacity: 0.6 },
  modalPrimaryTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },
  modalDangerTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },

  // Reschedule modal extras
  reschedulePrevBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  reschedulePrev: { fontFamily: font.medium, fontSize: type.xs, color: colors.amber800 },
  rescheduleLabel: {
    marginTop: 16,
    marginBottom: 10,
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  rescheduleIosDateWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  rescheduleDateTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.canvas,
  },
  rescheduleDateTapTxt: { flex: 1, fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },

  // ── Misc ──────────────────────────────────────────
  scroll: { flex: 1, backgroundColor: colors.canvas },
  pad: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8, backgroundColor: colors.canvas },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.canvas },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  err: { fontFamily: font.medium, fontSize: type.base, color: colors.textSecondary, marginBottom: 16, textAlign: 'center' },
  backBtnOutline: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  backBtnOutlineTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  k: { fontFamily: font.semiBold, fontSize: 10, color: colors.slate500, textTransform: 'uppercase', letterSpacing: 0.4 },
  v: { marginTop: 4, fontFamily: font.medium, fontSize: type.sm, color: colors.textPrimary },
  muted: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  mutedSm: { marginTop: 4, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  errSm: { marginTop: 8, fontFamily: font.semiBold, fontSize: type.xs, color: colors.danger },
  ta: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
    textAlignVertical: 'top',
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
  },
  inp: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 12,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle, marginVertical: 10 },

  // ── Plan tab ─────────────────────────────────────
  planPendingCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  planPendingIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  planPendingTitle: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  planPendingBody: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  planPendingKVs: {
    borderRadius: 12,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  planApprovedCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  planApprovedHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  planApprovedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planApprovedTitle: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.textPrimary,
  },
  planApprovedSub: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  planNaCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  planNaTxt: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  planKVRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  planKVLabel: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
  },
  planKVValue: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  planKVValueHL: {
    fontFamily: font.bold,
    fontSize: type.base,
    color: colors.brand,
  },
})
