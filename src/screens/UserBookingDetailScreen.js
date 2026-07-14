import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { ActivityIndicator, Animated, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, TouchableOpacity, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import RazorpayCheckout from 'react-native-razorpay'
import { api } from '../api/client'
import { formatBookingDateAndSlot } from '../utils/date'
import {
  marketplacePaymentStatusLabel,
  paymentAmountLabel,
  paymentModeLabel,
  paymentStatusLabel,
  sessionStatusLabel,
  bookingCodeBadge,
} from '../utils/bookingDisplay'
import { isAwaitingPatientConsent, isPlanLive } from '../utils/planStatus'
import { normalizeSessionRows } from '../utils/physioBookingHelpers'
import { openSupportWhatsApp } from '../utils/supportContact'
import InstallmentsPhysioCard from '../components/physio/InstallmentsPhysioCard'
import RequiredMark from '../components/ui/RequiredMark'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'

function cleanRazorpayPrefill(prefill) {
  const out = {}
  if (!prefill || typeof prefill !== 'object') return out
  const name = String(prefill.name || '').trim()
  if (name) out.name = name

  const rawPhone = String(prefill.contact || prefill.phone || '').trim()
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length >= 10) {
    out.contact = digits.slice(-10)
  } else if (rawPhone) {
    out.contact = rawPhone
  }

  const email = String(prefill.email || '').trim()
  if (email && email.includes('@')) {
    out.email = email
  }
  return out
}

const BASE_TABS = [
  { key: 'overview', label: 'Overview', icon: 'home-outline', iconOn: 'home' },
  { key: 'payments', label: 'Payments', icon: 'card-outline', iconOn: 'card' },
]

const TabBar = memo(function TabBar({ activeTab, onChange, tabs, badges = {} }) {
  return (
    <View style={styles.segmentedContainer}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key
        const hasBadge = badges[tab.key]
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.segmentedTab,
              active && styles.segmentedTabActive,
              pressed && { transform: [{ scale: 0.98 }] }
            ]}
            onPress={() => onChange(tab.key)}
          >
            <Ionicons
              name={active ? tab.iconOn : tab.icon}
              size={13}
              color={active ? colors.brand : colors.slate500}
            />
            <Text style={[styles.segmentedTxt, active && styles.segmentedTxtActive]}>
              {tab.label}
            </Text>
            {hasBadge && !active ? <View style={styles.segmentedBadgeDot} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
})

function openWhatsApp(phone) {
  const cleaned = String(phone || '').replace(/\D/g, '')
  const number = cleaned.startsWith('91') && cleaned.length === 12 ? cleaned : '91' + cleaned.slice(-10)
  Linking.openURL(`https://wa.me/${number}`).catch(() => {
    Toast.show({ type: 'error', text1: 'Could not open WhatsApp' })
  })
}

function callPhone(phone) {
  const cleaned = String(phone || '').replace(/\D/g, '')
  const number = cleaned.startsWith('91') && cleaned.length === 12 ? cleaned : '91' + cleaned.slice(-10)
  Linking.openURL(`tel:+${number}`).catch(() => {
    Toast.show({ type: 'error', text1: 'Could not place call' })
  })
}

const SimulatedTransitMap = memo(function SimulatedTransitMap({ transitPhase, physioName }) {
  let therapistPos = { top: 20, left: 30 }
  if (transitPhase === 'Dispatched') {
    therapistPos = { top: 20, left: 30 }
  } else if (transitPhase === 'In Transit') {
    therapistPos = { top: 60, left: 100 }
  } else if (transitPhase === 'Arrived') {
    therapistPos = { top: 95, left: 180 }
  } else if (transitPhase === 'Treating') {
    therapistPos = { top: 95, left: 180 }
  }

  return (
    <View style={styles.simMapContainer}>
      <View style={styles.simMapCanvas}>
        <View style={[styles.simMapRoad, { top: 30, left: 0, right: 0, height: 8 }]} />
        <View style={[styles.simMapRoad, { top: 100, left: 0, right: 0, height: 8 }]} />
        <View style={[styles.simMapRoad, { left: 40, top: 0, bottom: 0, width: 8 }]} />
        <View style={[styles.simMapRoad, { left: 190, top: 0, bottom: 0, width: 8 }]} />

        <View style={styles.simMapRouteLine} />
        
        <View style={[styles.simMapPin, { top: 95, left: 180 }]}>
          <View style={styles.simMapPinPulse} />
          <View style={styles.simMapPinDot}>
            <Ionicons name="pin" size={10} color="#ffffff" />
          </View>
          <Text style={styles.simMapPinLabel}>You</Text>
        </View>

        <View style={[styles.simMapCar, { top: therapistPos.top, left: therapistPos.left }]}>
          <View style={styles.simMapCarPulse} />
          <View style={styles.simMapCarBadge}>
            <Ionicons name="car" size={10} color="#0d9488" />
          </View>
          <Text style={styles.simMapCarLabel}>
            {String(physioName || 'Therapist').split(' ')[0]}
          </Text>
        </View>

        <Text style={[styles.simMapStreetName, { top: 14, left: 52 }]}>Apex Avenue</Text>
        <Text style={[styles.simMapStreetName, { top: 82, left: 84 }]}>Care Street</Text>
      </View>
      <View style={styles.simMapOverlayBanner}>
        <View style={styles.simMapOverlayDot} />
        <Text style={styles.simMapOverlayTxt}>
          {transitPhase === 'Dispatched' && 'Therapist is completing route check'}
          {transitPhase === 'In Transit' && 'Therapist is en route via Apex Avenue'}
          {transitPhase === 'Arrived' && 'Therapist is outside your address'}
          {transitPhase === 'Treating' && 'Session in progress'}
        </Text>
      </View>
    </View>
  )
})

function PendingBookingView({ booking: b, navigation, refreshing, onRefresh }) {
  const pulseAnim = useRef(new Animated.Value(1)).current
  const ringAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.14, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start()
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start()
  }, [pulseAnim, ringAnim])

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] })
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.5, 0.1, 0] })

  const serviceLabel = b.serviceType === 'online' ? 'Online Consultation' : 'Home Visit'
  const bookingRef = bookingCodeBadge(b) || '—'
  const managerName =
    b.managerId && typeof b.managerId === 'object' ? b.managerId.name : null
  const heading = managerName ? 'Your Care Manager is on it' : 'We received your booking'
  const subcopy = managerName
    ? `${managerName} will visit, prepare your plan, and coordinate your physiotherapist.`
    : 'Our team is assigning a care manager for your home visit. You will be notified when your plan is ready.'

  return (
    <View style={styles.pendingRoot}>
      {/* Top bar */}
      <View style={styles.pendingTopBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.pendingBackBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.pendingTopBarTitle}>Booking Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.pendingScroll}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
      >
        {/* Animated pulse icon */}
        <View style={styles.pendingPulseWrap}>
          <Animated.View
            style={[
              styles.pendingRing,
              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
          <Animated.View style={[styles.pendingCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="person-add-outline" size={36} color={colors.brand} />
          </Animated.View>
        </View>

        {/* Headline */}
        <Text style={styles.pendingHeadline}>{heading}</Text>
        <Text style={styles.pendingSubMsg}>{subcopy}</Text>

        {/* Booking summary card */}
        <View style={styles.pendingSummaryCard}>
          <View style={[styles.pendingKvRow]}>
            <Text style={styles.pendingKvLabel}>Date & Time</Text>
            <Text style={styles.pendingKvValue}>{formatBookingDateAndSlot(b.date, b.timeSlot) || '—'}</Text>
          </View>
          {managerName ? (
            <View style={[styles.pendingKvRow]}>
              <Text style={styles.pendingKvLabel}>Care Manager</Text>
              <Text style={styles.pendingKvValue}>{managerName}</Text>
            </View>
          ) : null}
          <View style={[styles.pendingKvRow]}>
            <Text style={styles.pendingKvLabel}>Service</Text>
            <Text style={styles.pendingKvValue}>{serviceLabel}</Text>
          </View>
          <View style={[styles.pendingKvRow, styles.pendingKvRowLast]}>
            <Text style={styles.pendingKvLabel}>Condition</Text>
            <Text style={[styles.pendingKvValue, { flex: 1, textAlign: 'right', marginLeft: 12 }]} numberOfLines={2}>
              {b.issue || '—'}
            </Text>
          </View>
        </View>

        {/* Booking ID chip */}
        <View style={styles.pendingIdChip}>
          <Ionicons name="receipt-outline" size={11} color={colors.textTertiary} />
          <Text style={styles.pendingIdTxt}>Booking ID {bookingRef}</Text>
        </View>

        {/* Status indicator row */}
        <View style={styles.pendingStatusRow}>
          <View style={styles.pendingStatusDot} />
          <Text style={styles.pendingStatusTxt}>Our team is reviewing your request</Text>
        </View>

        {/* Contact support */}
        <Pressable
          style={[styles.pendingSupportBtn, { borderColor: 'rgba(37,211,102,0.35)', backgroundColor: 'rgba(37,211,102,0.08)' }]}
          onPress={openSupportWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          <Text style={[styles.pendingSupportTxt, { color: '#128C7E' }]}>Chat on WhatsApp</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

export default function UserBookingDetailScreen({ route, navigation }) {
  const { id } = route.params || {}
  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reviews, setReviews] = useState([])
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [sessionReviewTarget, setSessionReviewTarget] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeDescription, setDisputeDescription] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [confirmingSessionId, setConfirmingSessionId] = useState(null)

  // Payment states & handlers
  const [installmentOpen, setInstallmentOpen] = useState(false)
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [bookingRes, reviewsRes] = await Promise.all([
        api.get(`/bookings/${id}`),
        api.get(`/reviews/booking/${id}`).catch(() => ({ data: { data: [] } })),
      ])
      setB(bookingRes.data)
      setReviews(Array.isArray(reviewsRes.data?.data) ? reviewsRes.data.data : [])
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to load' })
      setB(null)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [id])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const payLegacy = useCallback(async () => {
    if (!b?._id || paymentLoading) return
    setPaymentLoading(true)
    setPaymentError('')
    try {
      // 1. Create order on backend
      const orderRes = await api.post('/payment/create-order', { bookingId: b._id })
      const { orderId, amount, currency, keyId } = orderRes.data || {}

      // 2. Fetch profile details for prefill
      let prefill = {}
      try {
        const pr = await api.get('/profile')
        prefill = {
          name: pr.data?.name || '',
          contact: pr.data?.phone || '',
          email: pr.data?.email || '',
        }
      } catch {
        prefill = {
          name: b.userId?.name || '',
          contact: b.userId?.phone || '',
        }
      }

      // 3. Open Razorpay native checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'PhysiOkhom',
        description: 'Physiotherapy Booking Payment',
        order_id: orderId,
        prefill: cleanRazorpayPrefill(prefill),
        theme: { color: colors.brand },
      }

      if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
        Toast.show({
          type: 'error',
          text1: 'Native SDK not found. Rebuild the app with npx expo run:android or run:ios.',
        })
        setPaymentLoading(false)
        return
      }

      RazorpayCheckout.open(options)
        .then(async (response) => {
          try {
            // 4. Verify signature on backend
            await api.post('/payment/verify', {
              bookingId: b._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            Toast.show({ type: 'success', text1: 'Payment successful!' })
            load()
          } catch (e) {
            Toast.show({
              type: 'error',
              text1: e.response?.data?.message || e.message || 'Payment verification failed',
            })
          } finally {
            setPaymentLoading(false)
          }
        })
        .catch((error) => {
          const rzp = error?.error || error
          const code = String(rzp?.code || '').toUpperCase()
          const desc = String(rzp?.description || rzp?.message || '').toLowerCase()
          const isCancelled =
            code === 'PAYMENT_CANCELLED' ||
            code === 'BAD_REQUEST_ERROR' ||
            desc.includes('cancel')
          if (!isCancelled) {
            Toast.show({
              type: 'error',
              text1: rzp?.description || rzp?.message || 'Payment failed. Please try again.',
            })
          }
          setPaymentLoading(false)
        })
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e.response?.data?.message || e.message || 'Failed to start payment',
      })
      setPaymentLoading(false)
    }
  }, [b, paymentLoading, load])

  const payInstallment = useCallback(async (amtStr) => {
    if (!b?._id || paymentLoading) return
    const amt = Math.round((Number(amtStr) + Number.EPSILON) * 100) / 100
    if (!Number.isFinite(amt) || amt <= 0) {
      setPaymentError('Enter an amount greater than zero')
      return
    }
    const outstandingVal = Number(b.paymentSummary?.outstanding || 0)
    if (amt > outstandingVal + 0.009) {
      setPaymentError(`Amount must be at most ₹${outstandingVal.toFixed(2)}`)
      return
    }

    setPaymentLoading(true)
    setPaymentError('')
    try {
      // 1. Create installment order on backend
      const created = await api.post('/payment/installments/create', {
        bookingId: b._id,
        amount: amt,
      })
      const { paymentId, orderId, amount: orderAmount, currency, keyId } = created.data || {}

      // 2. Fetch profile details for prefill
      let prefill = {}
      try {
        const pr = await api.get('/profile')
        prefill = {
          name: pr.data?.name || '',
          contact: pr.data?.phone || '',
          email: pr.data?.email || '',
        }
      } catch {
        prefill = {
          name: b.userId?.name || '',
          contact: b.userId?.phone || '',
        }
      }

      // 3. Open Razorpay native checkout
      const options = {
        key: keyId,
        amount: orderAmount,
        currency,
        name: 'PhysiOkhom',
        description: 'Physiotherapy Installment Payment',
        order_id: orderId,
        prefill: cleanRazorpayPrefill(prefill),
        theme: { color: colors.brand },
      }

      if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
        setPaymentError('Native SDK not found. Rebuild the app with npx expo run:android or run:ios.')
        setPaymentLoading(false)
        return
      }

      RazorpayCheckout.open(options)
        .then(async (response) => {
          try {
            // 4. Verify signature on backend
            await api.post('/payment/installments/verify', {
              paymentId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            Toast.show({ type: 'success', text1: 'Installment paid successfully!' })
            setInstallmentOpen(false)
            load()
          } catch (e) {
            setPaymentError(e.response?.data?.message || e.message || 'Verification failed')
          } finally {
            setPaymentLoading(false)
          }
        })
        .catch(async (error) => {
          const rzp = error?.error || error
          const code = String(rzp?.code || '').toUpperCase()
          const desc = String(rzp?.description || rzp?.message || '').toLowerCase()
          const isCancelled =
            code === 'PAYMENT_CANCELLED' ||
            code === 'BAD_REQUEST_ERROR' ||
            desc.includes('cancel')
          // Cancel the pending row on the server so it doesn't reduce outstanding
          try {
            await api.post(`/payment/installments/${paymentId}/cancel`)
          } catch { /* best-effort */ }
          if (!isCancelled) {
            setPaymentError(rzp?.description || rzp?.message || 'Payment failed. Please try again.')
          }
          setPaymentLoading(false)
        })
    } catch (e) {
      setPaymentError(e.response?.data?.message || e.message || 'Could not start payment')
      setPaymentLoading(false)
    }
  }, [b, paymentLoading, load])

  const openInstallmentModal = useCallback(() => {
    const outstandingVal = Number(b?.paymentSummary?.outstanding || 0)
    const perSessionVal = Number(b?.paymentSummary?.amountPerSession || 0)
    const defaultAmt = outstandingVal <= 0 ? 0 : (perSessionVal > 0 ? Math.min(perSessionVal, outstandingVal) : outstandingVal)
    setInstallmentAmount(defaultAmt.toFixed(2))
    setPaymentError('')
    setInstallmentOpen(true)
  }, [b])

  useEffect(() => { load() }, [load])

  const consentToPlan = useCallback(async () => {
    if (!b?._id) return
    try {
      await api.post(`/bookings/${b._id}/consent-plan`)
      Toast.show({ type: 'success', text1: 'Plan is live. Your care team will proceed.' })
      load()
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not submit consent' })
    }
  }, [b?._id, load])

  const submitDispute = useCallback(async () => {
    if (!b?._id || actionBusy) return
    const reason = String(disputeReason || '').trim()
    const description = String(disputeDescription || '').trim()
    if (!reason || !description) {
      Toast.show({ type: 'error', text1: 'Reason and description are required' })
      return
    }
    setActionBusy(true)
    try {
      await api.post('/disputes', { bookingId: b._id, reason, description })
      Toast.show({ type: 'success', text1: 'Dispute raised' })
      setDisputeOpen(false)
      setDisputeReason('')
      setDisputeDescription('')
      load()
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not raise dispute' })
    } finally {
      setActionBusy(false)
    }
  }, [actionBusy, b?._id, disputeDescription, disputeReason, load])

  const confirmSession = useCallback(async (sessionId) => {
    if (!b?._id || !sessionId || confirmingSessionId) return
    setConfirmingSessionId(String(sessionId))
    try {
      const res = await api.post(`/bookings/${b._id}/sessions/${sessionId}/confirm`)
      setB(res.data)
      Toast.show({ type: 'success', text1: 'Session confirmed' })
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not confirm session' })
    } finally {
      setConfirmingSessionId(null)
    }
  }, [b?._id, confirmingSessionId])

  const submitReview = useCallback(
    async (sessionId) => {
      if (!b?._id || actionBusy) return
      setActionBusy(true)
      try {
        await api.post('/reviews', {
          bookingId: b._id,
          sessionId: sessionId || undefined,
          rating: Number(reviewRating),
          comment: reviewComment,
        })
        Toast.show({ type: 'success', text1: 'Review submitted' })
        setReviewOpen(false)
        setSessionReviewTarget(null)
        setReviewComment('')
        setReviewRating(5)
        load()
      } catch (e) {
        Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not submit review' })
      } finally {
        setActionBusy(false)
      }
    },
    [actionBusy, b?._id, load, reviewComment, reviewRating],
  )


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  if (!b) {
    return (
      <View style={styles.center}>
        <Ionicons name="calendar-outline" size={32} color={colors.slate300} />
        <Text style={styles.emptyTxt}>Booking not found</Text>
      </View>
    )
  }

  // Show waiting screen only while assignment is pending (physio hasn't accepted).
  // planStatus === 'proposed' means the physio already engaged with the booking —
  // never send the patient back to the waiting screen at that stage.
  const planAwaitingConsent =
    b.serviceType === 'home' && isAwaitingPatientConsent(b.planStatus)
  const planLive = b.serviceType === 'home' && isPlanLive(b.planStatus)

  if ((b.status === 'pending' || b.status === 'assigned') && !planAwaitingConsent && !planLive) {
    return <PendingBookingView booking={b} navigation={navigation} refreshing={refreshing} onRefresh={onRefresh} />
  }

  const paymentSummary = b.paymentSummary || null
  const paymentsList = Array.isArray(b.payments) ? b.payments : []
  const rows = normalizeSessionRows(b)
  const sessionsCount = paymentSummary?.sessionsCount || (Array.isArray(b.schedule) && b.schedule.length > 0 ? b.schedule.length : 1)
  const isOfflinePlan = b.serviceType === 'home' && b.homePlanPaymentMode === 'offline'
  const isOnlineBooking = b.serviceType === 'online' || (b.serviceType === 'home' && b.homePlanPaymentMode === 'online')
  const outstanding = Number(paymentSummary?.outstanding || 0)
  const perSession = Number(paymentSummary?.amountPerSession || 0)
  const milestoneStatus = Array.isArray(paymentSummary?.milestoneStatus) ? paymentSummary.milestoneStatus : null
  const totalAmount = Number(paymentSummary?.totalAmount ?? b.totalAmount ?? b.payment?.amount ?? 0)
  const totalPaid = Number(paymentSummary?.totalPaid ?? b.totalPaid ?? 0)
  const totalCollected = Number(paymentSummary?.totalCollected ?? 0)
  const effectivePaid = totalPaid + totalCollected
  const planReady = b.serviceType === 'online' || isPlanLive(b.planStatus)
  const showInstallments = planReady && (sessionsCount > 1 || isOnlineBooking) && (Number(b.totalAmount || 0) > 0 || paymentsList.length > 0)
  const showLegacyPay = b.paymentStatus === 'pending' && planReady && !(b.serviceType === 'home' && b.homePlanPaymentMode === 'offline')
  const reviewedSessionIds = new Set(reviews.map((r) => (r.sessionId ? String(r.sessionId) : 'booking')))
  const overallReview = reviews.find((r) => !r.sessionId)
  const hasCompletedSession = rows.some((r) => r.status === 'completed')
  const physioName = (b.physioId && typeof b.physioId === 'object') ? (b.physioId.name || 'Physiotherapist') : 'Physiotherapist'

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      bounces={true}
      alwaysBounceVertical={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.brand]}
          tintColor={colors.brand}
        />
      }
    >
      {/* ── Booking Status Header card ─────────────────────────────── */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopSection}>
          <Text style={styles.headerIssue} numberOfLines={1}>
            {b.issue || '—'}
          </Text>
          {bookingCodeBadge(b) ? (
            <Text style={styles.headerDateCompact} numberOfLines={1}>
              {bookingCodeBadge(b)}
            </Text>
          ) : null}
          <Text style={styles.headerDateCompact} numberOfLines={1}>
            {formatBookingDateAndSlot(b.date, b.timeSlot)}
          </Text>
        </View>
        {b.rescheduled && b.previousDate ? (
          <View style={styles.headerRescheduledBanner}>
            <Ionicons name="swap-horizontal-outline" size={11} color={colors.textSecondary} />
            <Text style={styles.headerRescheduledTxt} numberOfLines={1}>
              From: {formatBookingDateAndSlot(b.previousDate, b.previousTimeSlot)}
            </Text>
          </View>
        ) : null}

        <View style={styles.headerBottomSection}>
          <View style={styles.headerPhysioSection}>
            <View style={styles.headerPhysioAvatarWrap}>
              <Ionicons name="medical" size={16} color={colors.brand} />
            </View>
            <View style={styles.headerPhysioText}>
              <Text style={styles.headerPhysioLabel}>ASSIGNED SPECIALIST</Text>
              <Text style={styles.headerPhysioName}>
                {typeof b.physioId === 'object' ? b.physioId?.name : 'Selecting Specialist...'}
              </Text>
              {b.physioId?.specialization ? (
                <Text style={styles.headerPhysioSub}>{b.physioId.specialization}</Text>
              ) : null}
            </View>
            <View style={styles.headerPhysioBadges}>
              <View style={[styles.headerSessionBadge, { backgroundColor: colors.brandSoft }]}>
                <Text style={[styles.headerSessionBadgeTxt, { color: colors.brand }]}>
                  {String(b.serviceType || 'home').charAt(0).toUpperCase() + String(b.serviceType || 'home').slice(1)}
                </Text>
              </View>
              <View style={[styles.headerSessionBadge, { backgroundColor: colors.brandSoft }]}>
                <Text style={[styles.headerSessionBadgeTxt, { color: colors.brand }]}>
                  {sessionStatusLabel(b)}
                </Text>
              </View>
            </View>
          </View>

          {typeof b.physioId === 'object' ? (
            <View style={styles.headerPhysioActionsRow}>
              {b.physioId?.phone ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.headerPhysioActionBtn,
                      styles.therapistCallBtn,
                      pressed && { transform: [{ scale: 0.95 }] },
                    ]}
                    onPress={() => callPhone(b.physioId.phone)}
                  >
                    <Ionicons name="call" size={12} color={colors.brand} />
                    <Text style={styles.therapistActionBtnTxt}>Call</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.headerPhysioActionBtn,
                      styles.therapistWaBtn,
                      pressed && { transform: [{ scale: 0.95 }] },
                    ]}
                    onPress={() => openWhatsApp(b.physioId.phone)}
                  >
                    <Ionicons name="logo-whatsapp" size={12} color="#25D366" />
                    <Text style={[styles.therapistActionBtnTxt, { color: '#25D366' }]}>WhatsApp</Text>
                  </Pressable>
                </>
              ) : null}
              {b.physioId?._id ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.headerPhysioActionBtn,
                    styles.therapistProfileBtn,
                    pressed && { transform: [{ scale: 0.95 }] },
                  ]}
                  onPress={() => navigation.navigate('PublicPhysician', { id: b.physioId._id })}
                >
                  <Ionicons name="person" size={12} color={colors.white} />
                  <Text style={[styles.therapistActionBtnTxt, { color: colors.white }]}>Profile</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text style={styles.headerMatchingTxt}>
              Matching with a physiotherapist — we are assigning a specialist for your care.
            </Text>
          )}
        </View>

        {b.sessionStatus !== 'completed' ? (
          <View style={styles.headerActionStrip}>
            <Pressable style={styles.headerDisputeBtn} onPress={() => setDisputeOpen(true)}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.warning} />
              <Text style={styles.headerDisputeTxt}>Raise Dispute</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={BASE_TABS}
        badges={{
          overview: planAwaitingConsent,
          payments: b.paymentStatus === 'pending' && planReady && !(b.serviceType === 'home' && b.homePlanPaymentMode === 'offline')
        }}
      />

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <View style={styles.tabPanel}>
          {/* Plan review card — shown when physio has proposed a plan */}
          {planAwaitingConsent ? (
            <View style={styles.planReviewCard}>
              {/* Header */}
              <View style={styles.planReviewHeader}>
                <View style={styles.planReviewIconWrap}>
                  <Ionicons name="document-text-outline" size={20} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planReviewTitle}>Your Care Plan</Text>
                  <Text style={styles.planReviewSub}>Review the details below and consent to proceed</Text>
                </View>
              </View>

              {/* Key metrics row */}
              {(b.sessions != null || b.amountPerSession != null || Number(b.totalAmount || 0) > 0) ? (
                <View style={styles.planReviewGrid}>
                  {b.sessions != null ? (
                    <View style={styles.planReviewMetric}>
                      <Text style={styles.planReviewMetricVal}>{b.sessions}</Text>
                      <Text style={styles.planReviewMetricLbl}>Sessions</Text>
                    </View>
                  ) : null}
                  {b.amountPerSession != null ? (
                    <View style={styles.planReviewMetric}>
                      <Text style={styles.planReviewMetricVal}>₹{b.amountPerSession}</Text>
                      <Text style={styles.planReviewMetricLbl}>Per session</Text>
                    </View>
                  ) : null}
                  {Number(b.totalAmount || 0) > 0 ? (
                    <View style={styles.planReviewMetric}>
                      <Text style={styles.planReviewMetricVal}>₹{Number(b.totalAmount).toFixed(0)}</Text>
                      <Text style={styles.planReviewMetricLbl}>Total</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Payment mode */}
              {b.homePlanPaymentMode ? (
                <View style={styles.planReviewRow}>
                  <Ionicons
                    name={b.homePlanPaymentMode === 'online' ? 'card-outline' : 'cash-outline'}
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.planReviewRowTxt}>
                    Payment: {b.homePlanPaymentMode === 'online' ? 'Online' : 'Offline (cash)'}
                  </Text>
                </View>
              ) : null}

              {/* Discount badge */}
              {b.discountPercent != null && b.discountPercent > 0 ? (
                <View style={styles.planReviewRow}>
                  <Ionicons name="pricetag-outline" size={14} color={colors.brand} />
                  <Text style={[styles.planReviewRowTxt, { color: colors.brand, fontFamily: font.medium }]}>
                    {b.discountPercent}% discount applied
                  </Text>
                </View>
              ) : null}

              {/* Schedule preview */}
              {Array.isArray(b.schedule) && b.schedule.length > 0 ? (
                <View style={styles.planReviewSchedule}>
                  <Text style={styles.planReviewScheduleTitle}>Scheduled Sessions</Text>
                  {b.schedule.slice(0, 3).map((s, i) => (
                    <View key={i} style={styles.planReviewScheduleRow}>
                      <View style={styles.planReviewScheduleDot} />
                      <Text style={styles.planReviewScheduleTxt}>
                        Session {i + 1} — {formatBookingDateAndSlot(s.date, s.time)}
                      </Text>
                    </View>
                  ))}
                  {b.schedule.length > 3 ? (
                    <Text style={styles.planReviewScheduleMore}>+{b.schedule.length - 3} more sessions</Text>
                  ) : null}
                </View>
              ) : null}

              {/* Approve button */}
              <Pressable
                style={({ pressed }) => [
                  styles.planReviewApproveBtn,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                ]}
                onPress={consentToPlan}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
                <Text style={styles.planReviewApproveBtnTxt}>I consent to this plan</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Session Progress */}
          {rows.length > 0 ? (
            <View style={styles.sectionCard}>
              <SectionTitle icon="calendar-outline" title="Session Progress" />
              <View style={styles.nestedSessionsList}>
                {rows.map((r) => {
                  const isCompleted = r.status === 'completed'
                  const isNoShow = r.status === 'no_show'
                  const needsConfirm = isCompleted && !r.patientConfirmed
                  const isConfirmed = isCompleted && r.patientConfirmed
                  const confirming = confirmingSessionId === String(r.sessionId)
                  const paymentAmt = Number(r.paymentAtCompletion || 0)

                  if (needsConfirm) {
                    return (
                      <View key={r.key} style={styles.sessionConfirmCard}>
                        <Text style={styles.sessionConfirmTitle}>
                          Session {r.n} — {formatBookingDateAndSlot(r.date, r.time)}
                        </Text>
                        <Text style={styles.sessionConfirmSub}>
                          Completed by your physiotherapist.
                        </Text>
                        <Text style={styles.sessionConfirmPayLabel}>Payment for this session:</Text>
                        <Text style={styles.sessionConfirmPayAmt}>
                          {paymentAmt > 0
                            ? `₹${paymentAmt.toFixed(2)} collected`
                            : 'No payment recorded'}
                        </Text>
                        <Pressable
                          style={({ pressed }) => [
                            styles.sessionConfirmBtn,
                            (confirming || !r.sessionId) && styles.sessionConfirmBtnDisabled,
                            pressed && !confirming && { opacity: 0.92 },
                          ]}
                          disabled={confirming || !r.sessionId}
                          onPress={() => confirmSession(r.sessionId)}
                        >
                          {confirming ? (
                            <ActivityIndicator size="small" color={colors.white} />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                              <Text style={styles.sessionConfirmBtnTxt}>Confirm session completed</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    )
                  }

                  return (
                    <View
                      key={r.key}
                      style={[
                        styles.nestedSessionRow,
                        (isCompleted || isConfirmed) && styles.nestedSessionRowDone,
                      ]}
                    >
                      <View
                        style={[
                          styles.nestedSessionIndicator,
                          isCompleted ? styles.nestedSessionIndicatorDone : styles.nestedSessionIndicatorPending,
                          isNoShow && { backgroundColor: colors.danger },
                        ]}
                      >
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={10} color={colors.white} />
                        ) : isNoShow ? (
                          <Ionicons name="close" size={10} color={colors.white} />
                        ) : (
                          <Text style={styles.nestedSessionNumText}>{r.n}</Text>
                        )}
                      </View>
                      <View style={styles.nestedSessionDetails}>
                        <Text
                          style={[
                            styles.nestedSessionTitle,
                            isCompleted && styles.nestedSessionTitleDone,
                          ]}
                        >
                          Session {r.n}
                        </Text>
                        <Text style={styles.nestedSessionTime}>
                          {formatBookingDateAndSlot(r.date, r.time)}
                        </Text>
                        {isNoShow && r.noShowReason ? (
                          <Text style={styles.sessionNoShowReason}>{r.noShowReason}</Text>
                        ) : null}
                        {isConfirmed ? (
                          <Text style={styles.sessionConfirmedLine}>
                            Confirmed
                            {paymentAmt > 0 ? ` · ₹${paymentAmt.toFixed(2)} paid` : ''}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.sessionStatusPill,
                          isCompleted && styles.sessionStatusPillDone,
                          isNoShow && styles.sessionStatusPillNoShow,
                          !isCompleted && !isNoShow && styles.sessionStatusPillScheduled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sessionStatusPillTxt,
                            isCompleted && styles.sessionStatusPillTxtDone,
                            isNoShow && styles.sessionStatusPillTxtNoShow,
                          ]}
                        >
                          {isCompleted
                            ? isConfirmed
                              ? 'Confirmed'
                              : 'Completed'
                            : isNoShow
                              ? 'No-show'
                              : 'Scheduled'}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          ) : null}

          {/* Feedback Section */}
          {(overallReview || hasCompletedSession) ? (
            <View style={styles.sectionCard}>
              <SectionTitle icon="star-outline" title="Your Feedback" />
              {overallReview ? (
                <>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= overallReview.rating ? 'star' : 'star-outline'}
                        size={22}
                        color={n <= overallReview.rating ? colors.warning : colors.slate300}
                      />
                    ))}
                    <Text style={styles.starLabel}>{overallReview.rating}/5</Text>
                  </View>
                  {overallReview.comment ? (
                    <Text style={styles.reviewComment}>{overallReview.comment}</Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.feedbackHint}>Share your experience to help other patients.</Text>
                  <Pressable
                    style={({ pressed }) => [styles.feedbackBtn, pressed && { transform: [{ scale: 0.98 }] }]}
                    onPress={() => setReviewOpen(true)}
                  >
                    <Ionicons name="star-outline" size={16} color={colors.white} />
                    <Text style={styles.feedbackBtnTxt}>Rate your session</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : null}
        </View>
      )}



      {activeTab === 'payments' && (
        <View style={styles.tabPanel}>
          {/* Clean Financial Summary Card */}
          {outstanding > 0.009 || (Number(b.totalAmount || 0) > 0) ? (
            <View style={styles.financialCard}>
              <View style={styles.financialHeader}>
                <Ionicons name="receipt-outline" size={16} color={colors.brand} />
                <Text style={styles.financialTitle}>Plan Billing Summary</Text>
              </View>

              <View style={styles.financialDivider} />

              <View style={styles.financialMetrics}>
                <View style={styles.financialMetricCol}>
                  <Text style={styles.financialMetricLabel}>TOTAL PLAN VALUE</Text>
                  <Text style={styles.financialMetricValue}>₹{Number(b.totalAmount || 0).toFixed(2)}</Text>
                </View>
                
                <View style={[styles.financialMetricCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.financialMetricLabel}>OUTSTANDING BALANCE</Text>
                  <Text style={[
                    styles.financialMetricValue, 
                    outstanding > 0.009 ? { color: colors.danger } : { color: colors.success }
                  ]}>
                    ₹{outstanding.toFixed(2)}
                  </Text>
                </View>
              </View>

              {Number(b.totalAmount || 0) > 0 ? (
                <View style={styles.financialProgressContainer}>
                  <View style={styles.financialProgressHeader}>
                    <Text style={styles.financialProgressLabel}>Payment Progress</Text>
                    <Text style={styles.financialProgressText}>
                      ₹{Math.max(0, Number(b.totalAmount || 0) - outstanding).toFixed(2)} Paid ({Math.round(
                        Number(b.totalAmount || 0) > 0 
                          ? ((Math.max(0, Number(b.totalAmount || 0) - outstanding) / Number(b.totalAmount || 0)) * 100) 
                          : 0
                      )}%)
                    </Text>
                  </View>
                  <View style={styles.financialProgressBarBg}>
                    <View style={[
                      styles.financialProgressBarFill, 
                      { 
                        width: `${Number(b.totalAmount || 0) > 0 
                          ? ((Math.max(0, Number(b.totalAmount || 0) - outstanding) / Number(b.totalAmount || 0)) * 100) 
                          : 0}%` 
                      }
                    ]} />
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Installments */}
          {showInstallments ? (
            <View style={styles.installmentsWrap}>
              {/* Milestone payment schedule */}
              {milestoneStatus && milestoneStatus.length > 0 ? (
                <View style={styles.milestoneCard}>
                  <View style={styles.milestoneHeader}>
                    <Ionicons name="time-outline" size={14} color={colors.brand} />
                    <Text style={styles.milestoneHeaderTxt}>Payment Schedule</Text>
                  </View>
                  {milestoneStatus.map((m) => {
                    const reqAmt = Math.ceil(m.requiredPct * totalAmount)
                    const remainingToPay = Math.max(0, reqAmt - effectivePaid)
                    return (
                      <View key={m.bySession} style={[styles.milestoneRow, m.met && styles.milestoneRowMet]}>
                        <View style={[styles.milestoneDot, m.met && styles.milestoneDotMet]}>
                          <Ionicons
                            name={m.met ? 'checkmark' : 'ellipse'}
                            size={8}
                            color={m.met ? '#fff' : colors.amber800}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.milestoneLbl, m.met && styles.milestoneLblMet]}>
                            By session {m.bySession} — ₹{reqAmt.toLocaleString('en-IN')} of total
                          </Text>
                          <Text style={styles.milestoneSub}>
                            {m.met ? 'Paid' : `Pending (You need to pay ₹${remainingToPay.toLocaleString('en-IN')})`}
                          </Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              ) : null}

              <InstallmentsPhysioCard
                title={isOfflinePlan ? 'Collections' : 'Installments'}
                subtitle={
                  isOfflinePlan
                    ? 'Your physiotherapist records each cash/UPI payment. Admin verification unlocks sessions.'
                    : 'Online installment summary for this plan.'
                }
                summary={paymentSummary}
                payments={paymentsList}
                emptyMessage={isOfflinePlan ? 'No collections recorded yet.' : 'No installments yet.'}
              >
                {isOnlineBooking && outstanding > 0.009 ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.payInstallmentBtn,
                      pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
                    ]}
                    onPress={openInstallmentModal}
                  >
                    <Ionicons name="card-outline" size={14} color={colors.white} />
                    <Text style={styles.payInstallmentTxt}>Pay next installment</Text>
                  </Pressable>
                ) : null}
              </InstallmentsPhysioCard>
            </View>
          ) : null}

          {/* Plan details */}
          <View style={styles.sectionCard}>
            <SectionTitle icon="document-text-outline" title="Plan details" />
            <KV k="Sessions" v={b.sessions != null ? String(b.sessions) : '—'} />
            <KV k="Base price / session" v={b.amountPerSession != null ? `₹${b.amountPerSession}` : '—'} />
            {Number(b.distanceSurchargeAmount) > 0 ? (
              <KV k="Travel surcharge / session" v={`₹${Number(b.distanceSurchargeAmount).toFixed(2)}`} />
            ) : null}
            {Number(b.distanceSurchargeAmount) > 0 && b.amountPerSession != null ? (
              <KV k="Effective price / session" v={`₹${(Number(b.amountPerSession) + Number(b.distanceSurchargeAmount)).toFixed(2)}`} />
            ) : null}
            {b.discountPercent != null && b.discountPercent > 0 ? (
              <KV k="Plan discount" v={`${b.discountPercent}% off`} />
            ) : null}
            <KV k="Plan status" v={b.planStatus || '—'} last />
          </View>

          {/* Payment Details */}
          <View style={styles.sectionCard}>
            <SectionTitle icon="card-outline" title="Payment" />
            <KV k="Mode" v={paymentModeLabel(b)} />
            <KV k="Amount" v={paymentAmountLabel(b)} />
            <KV k="Payment hold" v={paymentStatusLabel(b.paymentStatus)} />
            <KV k="Payment step" v={marketplacePaymentStatusLabel(b.payment?.status)} last={!showLegacyPay} />
            {showLegacyPay ? (
              <Pressable
                style={({ pressed }) => [
                  styles.payFullBtn,
                  paymentLoading && { opacity: 0.7 },
                  pressed && { transform: [{ scale: 0.98 }] }
                ]}
                onPress={payLegacy}
                disabled={paymentLoading}
              >
                <Ionicons name="card-outline" size={18} color={colors.white} />
                <Text style={styles.payFullBtnTxt}>{paymentLoading ? 'Processing…' : 'Pay full amount'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      {/* ── Dispute modal ─────────────────────────── */}
      <Modal transparent visible={disputeOpen} animationType="fade" onRequestClose={() => setDisputeOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDisputeOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Raise dispute</Text>
                <Text style={styles.modalSub}>Describe the issue with your booking</Text>
              </View>
              <Pressable onPress={() => setDisputeOpen(false)} hitSlop={12} style={styles.modalClose}>
                <Ionicons name="close" size={16} color={colors.slate400} />
              </Pressable>
            </View>
            <View style={styles.modalDivider} />
            <Text style={styles.inputLabel}>Reason<RequiredMark /></Text>
            <TextInput
              value={disputeReason}
              onChangeText={setDisputeReason}
              style={styles.inp}
              placeholder="Short reason for the dispute"
              placeholderTextColor={colors.slate300}
            />
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Description<RequiredMark /></Text>
            <TextInput
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              style={styles.ta}
              placeholder="Describe what happened in detail…"
              placeholderTextColor={colors.slate300}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setDisputeOpen(false)}>
                <Text style={styles.modalBtnCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSubmit, actionBusy && { opacity: 0.7 }]}
                onPress={submitDispute}
                disabled={actionBusy}
              >
                {actionBusy ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : null}
                <Text style={styles.modalBtnSubmitTxt}>{actionBusy ? 'Submitting…' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Review modal ──────────────────────────── */}
      <Modal
        transparent
        visible={reviewOpen || Boolean(sessionReviewTarget)}
        animationType="fade"
        onRequestClose={() => {
          setReviewOpen(false)
          setSessionReviewTarget(null)
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { setReviewOpen(false); setSessionReviewTarget(null) }}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.amber50 }]}>
                <Ionicons name="star-outline" size={16} color={colors.warning} />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Submit review</Text>
                <Text style={styles.modalSub}>
                  {sessionReviewTarget ? `Session #${sessionReviewTarget.n}` : physioName}
                </Text>
              </View>
              <Pressable
                onPress={() => { setReviewOpen(false); setSessionReviewTarget(null) }}
                hitSlop={12}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={16} color={colors.slate400} />
              </Pressable>
            </View>
            <View style={styles.modalDivider} />
            <Text style={styles.inputLabel}>Rating<RequiredMark /></Text>
            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setReviewRating(n)} hitSlop={6}>
                  <Ionicons
                    name={n <= reviewRating ? 'star' : 'star-outline'}
                    size={32}
                    color={n <= reviewRating ? colors.warning : colors.slate300}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Comment (optional)</Text>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              style={styles.ta}
              placeholder="Share your experience…"
              placeholderTextColor={colors.slate300}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setReviewOpen(false); setSessionReviewTarget(null) }}
              >
                <Text style={styles.modalBtnCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSubmit, actionBusy && { opacity: 0.7 }]}
                onPress={() => submitReview(sessionReviewTarget?.sessionId)}
                disabled={actionBusy}
              >
                {actionBusy ? <ActivityIndicator size="small" color={colors.white} /> : null}
                <Text style={styles.modalBtnSubmitTxt}>{actionBusy ? 'Submitting…' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Installment Payment modal ───────────────── */}
      <Modal transparent visible={installmentOpen} animationType="fade" onRequestClose={() => !paymentLoading && setInstallmentOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !paymentLoading && setInstallmentOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.teal50 }]}>
                <Ionicons name="card-outline" size={16} color={colors.brand} />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Pay installment</Text>
                <Text style={styles.modalSub}>
                  Outstanding balance: ₹{outstanding.toFixed(2)}
                </Text>
              </View>
              <Pressable
                onPress={() => !paymentLoading && setInstallmentOpen(false)}
                hitSlop={12}
                style={styles.modalClose}
                disabled={paymentLoading}
              >
                <Ionicons name="close" size={16} color={colors.slate400} />
              </Pressable>
            </View>
            <View style={styles.modalDivider} />

            <Text style={styles.inputLabel}>Payment Amount (₹)<RequiredMark /></Text>
            <TextInput
              value={installmentAmount}
              onChangeText={setInstallmentAmount}
              style={styles.inp}
              placeholder="0.00"
              placeholderTextColor={colors.slate300}
              keyboardType="decimal-pad"
              editable={!paymentLoading}
            />
            {perSession > 0 ? (
              <Text style={{ fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary, marginTop: 6 }}>
                Typical installment: ₹{perSession.toFixed(2)} per session.
              </Text>
            ) : null}

            {paymentError ? (
              <View style={{ marginTop: 12, padding: 10, backgroundColor: colors.rose50, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSubtle, borderStyle: 'solid' }}>
                <Text style={{ fontFamily: font.regular, fontSize: type.xs, color: colors.rose900 }}>{paymentError}</Text>
              </View>
            ) : null}

            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setInstallmentOpen(false)}
                disabled={paymentLoading}
              >
                <Text style={styles.modalBtnCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSubmit, paymentLoading && { opacity: 0.7 }]}
                onPress={() => payInstallment(installmentAmount)}
                disabled={paymentLoading}
              >
                {paymentLoading ? <ActivityIndicator size="small" color={colors.white} style={{ marginRight: 6 }} /> : null}
                <Text style={styles.modalBtnSubmitTxt}>
                  {paymentLoading ? 'Processing…' : `Pay ₹${Number(installmentAmount || 0).toFixed(2)}`}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>


    </ScrollView>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={13} color={colors.brand} />
      </View>
      <Text style={styles.sectionTitleTxt}>{title}</Text>
    </View>
  )
}

function InfoRow({ icon, label, value, sub, onPress }) {
  const content = (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={14} color={colors.brand} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
        {sub ? <Text style={styles.infoSub}>{sub}</Text> : null}
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={14} color={colors.slate400} style={{ alignSelf: 'center', marginLeft: 8 }} />
      ) : null}
    </View>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
        {content}
      </Pressable>
    )
  }

  return content
}

function KV({ k, v, last }) {
  return (
    <View style={[styles.kvRow, last && styles.kvRowLast]}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  )
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: 16, paddingBottom: 44, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.canvas },
  emptyTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary },

  // Hero card
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  heroBand: {
    backgroundColor: colors.brand,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroDate: {
    fontFamily: font.bold,
    fontSize: type['2xl'],
    color: colors.white,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  rescheduledRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  rescheduledTxt: { fontFamily: font.medium, fontSize: type.xs, color: 'rgba(255,255,255,0.8)' },
  bandChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bandChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bandChipTxt: { fontFamily: font.semiBold, fontSize: 10, color: colors.white },

  heroPhysioSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  heroPhysioIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroPhysioText: { flex: 1 },
  heroPhysioLabel: { fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary },
  heroPhysioName: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary, marginTop: 1 },
  heroPhysioSub: { marginTop: 1, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.teal50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    padding: 14,
  },
  bannerTxt: { flex: 1, fontFamily: font.regular, fontSize: type.xs, color: colors.teal800, lineHeight: leading.xs },
  bannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.brand,
  },
  bannerBtnTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.white },

  // Plan review card (planStatus === 'proposed')
  planReviewCard: {
    borderRadius: 16,
    backgroundColor: colors.teal50,
    borderWidth: 1.5,
    borderColor: colors.brand,
    padding: 16,
    gap: 14,
  },
  planReviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  planReviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planReviewTitle: {
    fontFamily: font.semiBold,
    fontSize: type.base,
    color: colors.teal800,
    marginBottom: 2,
  },
  planReviewSub: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.teal800,
    lineHeight: leading.xs,
    opacity: 0.75,
  },
  planReviewGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  planReviewMetric: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  planReviewMetricVal: {
    fontFamily: font.bold,
    fontSize: type.md,
    color: colors.textPrimary,
  },
  planReviewMetricLbl: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planReviewRowTxt: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
  },
  planReviewSchedule: {
    gap: 6,
  },
  planReviewScheduleTitle: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.teal800,
    marginBottom: 2,
  },
  planReviewScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planReviewScheduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
    flexShrink: 0,
  },
  planReviewScheduleTxt: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  planReviewScheduleMore: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textTertiary,
    marginTop: 2,
    paddingLeft: 14,
  },
  planReviewApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 2,
  },
  planReviewApproveBtnTxt: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.white,
  },

  // Section cards
  sectionCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    ...CARD_SHADOW,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitleTxt: {
    fontFamily: font.semiBold,
    fontSize: type.base,
    color: colors.textPrimary,
  },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle, marginVertical: 12 },

  // InfoRow
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  infoBody: { flex: 1 },
  infoLabel: { fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary },
  infoValue: { marginTop: 2, fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  infoSub: { marginTop: 1, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },

  // Recovery Roadmap styles
  progressContainer: {
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textSecondary,
  },
  progressVal: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.brand,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.slate200,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 3,
  },
  roadmapContainer: {
    marginTop: 4,
  },
  phaseContainer: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 16,
  },
  phaseLeftColumn: {
    width: 32,
    alignItems: 'center',
    marginRight: 10,
  },
  phaseIndicatorNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: 4,
  },
  phaseIndicatorNodeAccomplished: {
    borderColor: colors.success,
    backgroundColor: colors.emerald50,
  },
  phaseIndicatorNodeInProgress: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  phaseIndicatorNodeLocked: {
    borderColor: colors.slate300,
    backgroundColor: colors.slate50,
  },
  phaseConnectorLine: {
    position: 'absolute',
    top: 30,
    bottom: -22,
    width: 1.5,
    left: 15,
    zIndex: 1,
  },
  phaseConnectorLineAccomplished: {
    backgroundColor: colors.success,
  },
  phaseConnectorLineInProgress: {
    backgroundColor: colors.brand,
  },
  phaseConnectorLineLocked: {
    backgroundColor: colors.slate200,
  },
  phaseCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    backgroundColor: colors.white,
  },
  phaseCardAccomplished: {
    borderColor: colors.borderSubtle,
    backgroundColor: '#fafbfc',
    opacity: 0.9,
  },
  phaseCardInProgress: {
    borderColor: colors.brand,
    backgroundColor: colors.white,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  phaseCardLocked: {
    borderColor: colors.borderSubtle,
    backgroundColor: colors.slate50,
    opacity: 0.75,
  },
  phaseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  phaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  phaseTitleLocked: {
    color: colors.textSecondary,
  },
  phaseStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  phaseStatusBadgeAccomplished: {
    backgroundColor: colors.emerald50,
  },
  phaseStatusBadgeInProgress: {
    backgroundColor: colors.brandSoft,
  },
  phaseStatusBadgeLocked: {
    backgroundColor: colors.slate100,
  },
  phaseStatusBadgeTxt: {
    fontFamily: font.semiBold,
    fontSize: 9,
  },
  phaseStatusBadgeTxtAccomplished: {
    color: colors.success,
  },
  phaseStatusBadgeTxtInProgress: {
    color: colors.brand,
  },
  phaseStatusBadgeTxtLocked: {
    color: colors.slate500,
  },
  phaseDescription: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    lineHeight: leading.xs,
    marginBottom: 10,
  },
  phaseDescriptionLocked: {
    color: colors.textTertiary,
  },
  phaseMilestoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  phaseMilestoneBoxAccomplished: {
    backgroundColor: colors.emerald50,
  },
  phaseMilestoneBoxInProgress: {
    backgroundColor: colors.brandSoft,
  },
  phaseMilestoneBoxLocked: {
    backgroundColor: colors.slate100,
  },
  phaseMilestoneTxt: {
    fontFamily: font.medium,
    fontSize: 10,
  },
  phaseMilestoneTxtAccomplished: {
    color: colors.success,
  },
  phaseMilestoneTxtInProgress: {
    color: colors.brand,
  },
  phaseMilestoneTxtLocked: {
    color: colors.slate500,
  },
  nestedSessionsList: {
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
    paddingTop: 8,
  },
  nestedSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  nestedSessionRowDone: {
    opacity: 0.9,
  },
  nestedSessionIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nestedSessionIndicatorDone: {
    backgroundColor: colors.success,
  },
  nestedSessionIndicatorPending: {
    backgroundColor: colors.slate200,
  },
  nestedSessionNumText: {
    fontFamily: font.bold,
    fontSize: 9,
    color: colors.textSecondary,
  },
  nestedSessionDetails: {
    flex: 1,
  },
  nestedSessionTitle: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textPrimary,
  },
  nestedSessionTitleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  nestedSessionTime: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 1,
  },
  nestedRateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
  },
  nestedRateBtnTxt: {
    fontFamily: font.semiBold,
    fontSize: 9,
    color: colors.brand,
  },
  sessionConfirmCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.amber200,
    backgroundColor: colors.amber50,
  },
  sessionConfirmTitle: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.slate900,
  },
  sessionConfirmSub: {
    marginTop: 6,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.slate600,
    lineHeight: 18,
  },
  sessionConfirmPayLabel: {
    marginTop: 12,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.slate700,
  },
  sessionConfirmPayAmt: {
    marginTop: 4,
    fontFamily: font.bold,
    fontSize: type.base,
    color: colors.slate900,
  },
  sessionConfirmBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  sessionConfirmBtnDisabled: {
    opacity: 0.7,
  },
  sessionConfirmBtnTxt: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.white,
  },
  sessionConfirmedLine: {
    marginTop: 4,
    fontFamily: font.semiBold,
    fontSize: 10,
    color: colors.success,
  },
  sessionNoShowReason: {
    marginTop: 4,
    fontFamily: font.regular,
    fontSize: 10,
    color: colors.danger,
  },
  sessionStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.slate100,
  },
  sessionStatusPillScheduled: {
    backgroundColor: colors.slate100,
  },
  sessionStatusPillDone: {
    backgroundColor: colors.teal50,
  },
  sessionStatusPillNoShow: {
    backgroundColor: '#fef2f2',
  },
  sessionStatusPillTxt: {
    fontFamily: font.semiBold,
    fontSize: 9,
    color: colors.slate600,
  },
  sessionStatusPillTxtDone: {
    color: colors.brand,
  },
  sessionStatusPillTxtNoShow: {
    color: colors.danger,
  },
  nestedRateBtnMuted: {
    borderColor: colors.borderSubtle,
    backgroundColor: colors.slate50,
  },
  nestedRateBtnMutedTxt: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.textTertiary,
  },
  lockedPromoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: colors.slate100,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.slate300,
  },
  lockedPromoTxt: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 9,
    color: colors.textSecondary,
  },

  // KV rows
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  kvRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  kvKey: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  kvVal: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary, maxWidth: '60%', textAlign: 'right' },

  // Feedback
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  starLabel: { marginLeft: 6, fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary },
  reviewComment: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: leading.sm },
  feedbackHint: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, marginBottom: 14 },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  feedbackBtnPressed: { opacity: 0.85 },
  feedbackBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },

  // Actions card
  actionsCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 10,
    ...CARD_SHADOW,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  actionBtnPrimary: {
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnPrimaryTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.white },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  actionBtnOutlineTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.warning },

  installmentsWrap: { gap: 10 },

  // ── Milestone schedule card ──────────────────
  milestoneCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.15)',
    backgroundColor: 'rgba(240,253,250,0.9)',
    padding: 14,
    gap: 10,
  },
  milestoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  milestoneHeaderTxt: { fontWeight: '700', fontSize: 13, color: colors.brand },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(13,148,136,0.08)',
  },
  milestoneRowMet: {},
  milestoneDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.amber100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  milestoneDotMet: { backgroundColor: colors.success },
  milestoneLbl: { fontSize: 12, fontWeight: '600', color: colors.slate700 },
  milestoneLblMet: { color: colors.success },
  milestoneSub: { fontSize: 10, color: colors.slate400, marginTop: 1 },
  payInstallmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: colors.brand,
    marginTop: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  payInstallmentTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },
  payAmtHint: { marginTop: 5, fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary },
  payErrTxt: { marginTop: 8, fontFamily: font.semiBold, fontSize: type.xs, color: colors.danger },
  walletToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
  },
  walletToggleTxt: { flex: 1, fontFamily: font.medium, fontSize: type.sm, color: colors.textPrimary },

  // Razorpay WebView
  webviewModal: { flex: 1, backgroundColor: colors.brand },
  webviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.brand,
  },
  webviewHeaderTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.white },
  webviewCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: { flex: 1, backgroundColor: colors.white },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.canvas,
  },
  webviewLoadingTxt: { fontFamily: font.medium, fontSize: type.sm, color: colors.textSecondary },
  webviewFallbackTxt: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modals
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 0,
  },
  modalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontFamily: font.bold, fontSize: type.md, color: colors.textPrimary },
  modalSub: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary, marginTop: 1 },
  modalClose: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginVertical: 14,
  },
  inputLabel: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.textSecondary, marginBottom: 6 },
  inp: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
  },
  ta: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 88,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
    textAlignVertical: 'top',
  },
  starPicker: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  modalBtnCancel: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  modalBtnCancelTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary },
  modalBtnSubmit: {
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalBtnSubmitTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },
  payFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand,
    marginTop: 14,
  },
  payFullBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },

  // Transit tracker styles
  transitCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  transitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  transitIconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  transitIconPulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: colors.brand,
    opacity: 0.3,
    transform: [{ scale: 1.3 }],
  },
  transitHeaderText: {
    flex: 1,
  },
  transitTitle: {
    fontFamily: font.bold,
    fontSize: 13,
    color: '#ffffff',
  },
  transitEta: {
    fontFamily: font.medium,
    fontSize: 10.5,
    color: '#cbd5e1',
    marginTop: 2,
  },
  demoControlsContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 14,
  },
  demoLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  demoControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  demoBtnActive: {
    backgroundColor: colors.brand,
  },
  demoBtnTxt: {
    fontFamily: font.bold,
    fontSize: 8.5,
    color: '#94a3b8',
  },
  demoBtnTxtActive: {
    color: '#ffffff',
  },
  transitStepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
    paddingHorizontal: 8,
  },
  stepperItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepperDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepperDotActive: {
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  stepperDotCompleted: {
    backgroundColor: '#10b981',
  },
  stepperDotPending: {
    backgroundColor: '#1e293b',
  },
  stepperLabel: {
    fontFamily: font.bold,
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  stepperLabelActive: {
    color: colors.brand,
  },
  stepperLabelCompleted: {
    color: '#10b981',
  },
  stepperLine: {
    position: 'absolute',
    left: '50%',
    right: '-50%',
    top: 11,
    height: 2,
    backgroundColor: '#334155',
    zIndex: 1,
  },
  stepperLineCompleted: {
    backgroundColor: '#10b981',
  },
  pinContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pinTextSection: {
    flex: 1,
  },
  pinLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  pinDescription: {
    fontFamily: font.regular,
    fontSize: 8.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  pinValueCard: {
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pinValue: {
    fontFamily: font.bold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 1.5,
  },

  // Daily Rehab Styles
  rehabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rehabProgressBadge: {
    backgroundColor: colors.teal50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rehabProgressBadgeTxt: {
    fontFamily: font.bold,
    fontSize: 10,
    color: colors.brand,
  },
  rehabSub: {
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  rehabProgressContainer: {
    marginBottom: 12,
  },
  rehabProgressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  rehabProgressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  rehabPercentTxt: {
    fontFamily: font.medium,
    fontSize: 9,
    color: '#10b981',
    marginTop: 4,
  },
  exerciseList: {
    gap: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 10,
  },
  exerciseRowCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  exerciseCheckbox: {
    paddingRight: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxBoxChecked: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  exerciseDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseTitleCol: {
    flex: 1,
  },
  exerciseName: {
    fontFamily: font.bold,
    fontSize: 12,
    color: '#1e293b',
  },
  exerciseNameCompleted: {
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  exerciseTarget: {
    fontFamily: font.medium,
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 1,
  },
  exArrowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  exStartBtnTxt: {
    fontFamily: font.bold,
    fontSize: 10,
    color: colors.brand,
  },

  // Exercise modal styles
  exerciseModalScroll: {
    paddingVertical: 12,
    gap: 14,
  },
  guideCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  guideHeading: {
    fontFamily: font.bold,
    fontSize: 12,
    color: '#1e293b',
    marginBottom: 6,
  },
  guideText: {
    fontFamily: font.regular,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginTop: 10,
  },
  tipText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 10.5,
    color: '#b45309',
    lineHeight: 14,
  },
  stopwatchCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  stopwatchTitle: {
    fontFamily: font.bold,
    fontSize: 10.5,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stopwatchDigitsBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
  },
  stopwatchDigits: {
    fontFamily: font.bold,
    fontSize: 36,
    color: '#38bdf8',
  },
  stopwatchUnit: {
    fontFamily: font.bold,
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  stopwatchControls: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  stopwatchBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  stopwatchBtnReset: {
    backgroundColor: '#334155',
  },
  stopwatchBtnResetText: {
    fontFamily: font.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  stopwatchBtnStart: {
    backgroundColor: '#10b981',
  },
  stopwatchBtnPause: {
    backgroundColor: '#ef4444',
  },
  stopwatchBtnStartText: {
    fontFamily: font.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  exerciseCompleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 6,
  },
  exerciseCompleteModalBtnDone: {
    backgroundColor: '#10b981',
  },
  exerciseCompleteModalBtnTxt: {
    fontFamily: font.bold,
    fontSize: 13,
    color: '#ffffff',
  },
  // Apple Segmented Control Tab bar styles
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 2,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 10,
    position: 'relative',
  },
  segmentedTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedTxt: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.slate500,
  },
  segmentedTxtActive: {
    fontFamily: font.bold,
    color: colors.brand,
  },
  segmentedBadgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.white,
  },
  tabPanel: {
    gap: 12,
  },

  // Transit collapsed styles
  transitCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  transitStatusBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  transitStatusDotCompact: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  transitStatusTextCompact: {
    fontFamily: font.bold,
    fontSize: 9.5,
    color: '#10b981',
  },
  pinCompactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pinCompactLabel: {
    fontFamily: font.medium,
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  pinCompactValue: {
    fontFamily: font.bold,
    fontSize: 10.5,
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Booking Status Header card styles
  headerCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  headerTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.slate50,
  },
  headerIssue: {
    flexShrink: 1,
    maxWidth: '38%',
    fontFamily: font.bold,
    fontSize: type.md,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerDateCompact: {
    flex: 1,
    textAlign: 'right',
    fontFamily: font.bold,
    fontSize: type.md,
    lineHeight: leading.md,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerServiceType: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.textSecondary,
  },
  headerMiddleSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerDateLabel: {
    fontFamily: font.bold,
    fontSize: 8,
    letterSpacing: 1,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  headerDate: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerRescheduledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.slate50,
  },
  headerRescheduledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  headerRescheduledTxt: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textSecondary,
  },
  headerMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  headerMetaItem: { flex: 1 },
  headerMetaLabel: {
    fontFamily: font.bold,
    fontSize: 8,
    letterSpacing: 0.8,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  headerMetaValue: {
    marginTop: 3,
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  headerBottomSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  headerPhysioSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerPhysioAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  headerPhysioText: {
    flex: 1,
  },
  headerPhysioLabel: {
    fontFamily: font.bold,
    fontSize: 8,
    letterSpacing: 1,
    color: colors.textTertiary,
  },
  headerPhysioName: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
    marginTop: 2,
  },
  headerPhysioSub: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerSessionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerSessionBadgeTxt: {
    fontFamily: font.bold,
    fontSize: 9,
  },
  headerPhysioBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  headerPhysioActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  headerPhysioActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerMatchingTxt: {
    marginTop: 10,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  headerActionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 2,
    backgroundColor: colors.white,
  },
  headerApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerApproveTxt: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.white,
  },
  headerDisputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning + '15',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  headerDisputeTxt: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.warning,
  },

  // Simulated Vector Map styles (Light Clean Theme)
  simMapContainer: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.slate50,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  simMapCanvas: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.slate50,
  },
  simMapRoad: {
    position: 'absolute',
    backgroundColor: colors.slate200,
    opacity: 0.8,
  },
  simMapRouteLine: {
    position: 'absolute',
    top: 36,
    left: 46,
    width: 150,
    height: 70,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.brand, // Clean brand route path
    borderStyle: 'solid',
    opacity: 0.8,
  },
  simMapPin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    marginLeft: -10,
  },
  simMapPinPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    opacity: 0.2,
  },
  simMapPinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simMapPinLabel: {
    fontFamily: font.bold,
    fontSize: 7,
    color: colors.textPrimary,
    marginTop: 2,
    backgroundColor: colors.white,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  simMapCar: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    marginLeft: -10,
  },
  simMapCarPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand,
    opacity: 0.2,
  },
  simMapCarBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  simMapCarLabel: {
    fontFamily: font.bold,
    fontSize: 7,
    color: colors.brand,
    marginTop: 2,
    backgroundColor: colors.white,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  simMapStreetName: {
    position: 'absolute',
    fontFamily: font.medium,
    fontSize: 7,
    color: colors.textTertiary,
  },
  simMapOverlayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
  },
  simMapOverlayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  simMapOverlayTxt: {
    fontFamily: font.semiBold,
    fontSize: 9,
    color: colors.textSecondary,
  },

  // Billing Overview Card styles
  financialCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  financialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  financialTitle: {
    fontFamily: font.bold,
    fontSize: type.base,
    color: colors.textPrimary,
  },
  financialDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 12,
  },
  financialMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  financialMetricCol: {
    flex: 1,
  },
  financialMetricLabel: {
    fontFamily: font.bold,
    fontSize: 8,
    letterSpacing: 0.8,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  financialMetricValue: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  financialProgressContainer: {
    marginTop: 4,
  },
  financialProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  financialProgressLabel: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textSecondary,
  },
  financialProgressText: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.textPrimary,
  },
  financialProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.slate100,
    overflow: 'hidden',
  },
  financialProgressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.brand,
  },

  // Fitness exercise tag styles
  exerciseTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  exerciseTagText: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textSecondary,
  },
  exerciseTagDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.slate400,
  },
  exerciseDiffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.slate100,
  },
  exerciseDiffBadgeLight: {
    backgroundColor: '#ecfdf5',
  },
  exerciseDiffBadgeMedium: {
    backgroundColor: '#fffbeb',
  },
  exerciseDiffText: {
    fontFamily: font.bold,
    fontSize: 8,
    color: colors.textSecondary,
  },
  exerciseDurText: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textTertiary,
  },

  // Apple Watch/Nike Circular Stopwatch HUD styles
  stopwatchRingOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  simStopwatchRing: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: '#0b0f19',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Therapist Card styles
  therapistCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 14,
    ...CARD_SHADOW,
  },
  therapistCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  therapistAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.brandSoft,
  },
  therapistCardInfo: {
    flex: 1,
  },
  therapistLabel: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textTertiary,
  },
  therapistName: {
    fontFamily: font.bold,
    fontSize: type.md,
    color: colors.textPrimary,
    marginTop: 2,
  },
  therapistSub: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  therapistActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  therapistActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  therapistCallBtn: {
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
  },
  therapistWaBtn: {
    borderColor: 'rgba(37, 211, 102, 0.15)',
    backgroundColor: 'rgba(37, 211, 102, 0.05)',
  },
  therapistProfileBtn: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  therapistActionBtnTxt: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.brand,
  },
  noTherapistCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  noTherapistIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  noTherapistTxt: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  noTherapistSub: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Pending booking focused view ──────────────────────────────────────────
  pendingRoot: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  pendingTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  pendingBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTopBarTitle: {
    fontFamily: font.bold,
    fontSize: type.base,
    color: colors.textPrimary,
  },
  pendingScroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 48,
  },
  pendingPulseWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  pendingRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  pendingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingHeadline: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  pendingSubMsg: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  pendingSummaryCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingKvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  pendingKvRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  pendingKvLabel: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textTertiary,
  },
  pendingKvValue: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textPrimary,
  },
  pendingIdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.slate100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'center',
    marginTop: 16,
  },
  pendingIdTxt: {
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  pendingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 20,
  },
  pendingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  pendingStatusTxt: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textSecondary,
  },
  pendingSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand + '40',
    backgroundColor: colors.brandSoft,
  },
  pendingSupportTxt: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.brand,
  },
})
