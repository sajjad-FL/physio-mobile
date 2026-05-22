import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import RazorpayCheckout from 'react-native-razorpay'
import { api } from '../api/client'
import { formatBookingDateAndSlot } from '../utils/date'
import { bookingStatusBadge, paymentBadge } from '../utils/dashboardUtils'
import {
  marketplacePaymentStatusLabel,
  paymentAmountLabel,
  paymentModeLabel,
  paymentStatusLabel,
  sessionStatusLabel,
} from '../utils/bookingDisplay'
import { normalizeSessionRows } from '../utils/physioBookingHelpers'
import InstallmentsPhysioCard from '../components/physio/InstallmentsPhysioCard'
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

export default function UserBookingDetailScreen({ route, navigation }) {
  const { id } = route.params || {}
  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [sessionReviewTarget, setSessionReviewTarget] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeDescription, setDisputeDescription] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  // Payment states & handlers
  const [installmentOpen, setInstallmentOpen] = useState(false)
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)

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
        name: 'PhysioKhom',
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
          }
        })
        .catch((error) => {
          Toast.show({
            type: 'error',
            text1: error.description ? `Payment failed: ${error.description}` : `Payment error: ${error.message || JSON.stringify(error)}`,
          })
        })
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e.response?.data?.message || e.message || 'Failed to start payment',
      })
    } finally {
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
        name: 'PhysioKhom',
        description: 'Physiotherapy Installment Payment',
        order_id: orderId,
        prefill: cleanRazorpayPrefill(prefill),
        theme: { color: colors.brand },
      }

      if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
        setPaymentError('Native SDK not found. Rebuild the app with npx expo run:android or run:ios.')
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
          }
        })
        .catch((error) => {
          setPaymentError(error.description ? `Payment failed: ${error.description}` : `Payment error: ${error.message || JSON.stringify(error)}`)
        })
    } catch (e) {
      setPaymentError(e.response?.data?.message || e.message || 'Could not start payment')
    } finally {
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

  useEffect(() => { load() }, [load])

  const approvePlan = useCallback(async () => {
    if (!b?._id) return
    try {
      await api.patch(`/bookings/${b._id}/approve`)
      Toast.show({ type: 'success', text1: 'Plan approved. You can proceed with payment.' })
      load()
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not approve plan' })
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
  // Live Transit state
  const [transitPhase, setTransitPhase] = useState('In Transit')

  // Rehab Exercises state
  const getExercisesForIssue = (issueName) => {
    const issueLower = String(issueName || '').toLowerCase()
    if (issueLower.includes('back')) {
      return [
        { id: 'stretch', name: 'Lumbar Extension Stretch', target: '3 Sets x 10 Reps', hold: 10, desc: 'Place hands on hips, gently lean backward to extension. Avoid sudden moves.', tip: 'Keep breathing normally, do not hold breath.' },
        { id: 'cobra', name: 'Cobra Pose / Bhujangasana', target: '3 Sets x 5 Reps', hold: 15, desc: 'Lie on your stomach, palms under shoulders. Press down to raise your upper chest off ground.', tip: 'Relax shoulders down and away from ears.' },
        { id: 'bridge', name: 'Glute Bridge Holds', target: '3 Sets x 12 Reps', hold: 5, desc: 'Lie on back with knees bent. Squeeze glutes and lift hips to create a straight line.', tip: 'Do not arch lower back excessively.' }
      ]
    } else if (issueLower.includes('knee')) {
      return [
        { id: 'raise', name: 'Straight Leg Raises', target: '3 Sets x 10 Reps', hold: 5, desc: 'Lie on back, bend one knee. Tighten quad of straight leg and lift to 45 degrees.', tip: 'Ensure the lifting knee stays fully straight.' },
        { id: 'quad', name: 'Isometric Quad Sets', target: '3 Sets x 15 Reps', hold: 10, desc: 'Place a small towel under knee. Press back of knee down to squeeze thigh muscle.', tip: 'Focus on feeling the contraction in your quadriceps.' }
      ]
    } else if (issueLower.includes('stroke') || issueLower.includes('paralysis') || issueLower.includes('neuro')) {
      return [
        { id: 'grasp', name: 'Grip & Ball Squeeze', target: '3 Sets x 15 Reps', hold: 5, desc: 'Hold a therapy ball or rolled towel. Squeeze tightly and release slowly.', tip: 'Try to coordinate smooth movement.' },
        { id: 'ankle', name: 'Seated Ankle Pumps', target: '3 Sets x 20 Reps', hold: 2, desc: 'Point toes down, then pull toes up toward your shins. Rest and repeat.', tip: 'Helps improve blood circulation and ankle mobility.' }
      ]
    } else if (issueLower.includes('neck') || issueLower.includes('cervical')) {
      return [
        { id: 'retract', name: 'Cervical Retraction (Chin Tucks)', target: '3 Sets x 10 Reps', hold: 5, desc: 'Sit upright. Draw your chin straight backward (like making a double chin).', tip: 'Keep eyes looking straight ahead, don\'t tilt head.' },
        { id: 'trap', name: 'Upper Trapezius Stretch', target: '3 Sets x 6 Reps', hold: 15, desc: 'Tilt your ear toward your shoulder. Use hand for a gentle extra stretch.', tip: 'Keep the opposite shoulder relaxed and low.' }
      ]
    } else {
      return [
        { id: 'deep_breath', name: 'Diaphragmatic Breathing', target: '3 Sets x 10 Reps', hold: 5, desc: 'Place one hand on stomach. Inhale deep through nose, exhale through pursed lips.', tip: 'Your stomach should rise and fall, not your chest.' },
        { id: 'mobility', name: 'Gentle Joint Mobilization', target: '3 Sets x 10 Reps', hold: 5, desc: 'Perform gentle, slow pain-free range of motion for the affected joint.', tip: 'Stop immediately if pain increases.' }
      ]
    }
  }

  const exercises = useMemo(() => getExercisesForIssue(b?.issue), [b?.issue])
  const [completedExercises, setCompletedExercises] = useState({})
  const [selectedExercise, setSelectedExercise] = useState(null)
  
  const completedCount = useMemo(() => Object.values(completedExercises).filter(Boolean).length, [completedExercises])
  const totalExercises = exercises.length
  const completionPercentage = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0

  // Stopwatch state & logic
  const [timerSeconds, setTimerSeconds] = useState(30)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerIntervalRef = useRef(null)

  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current)
            setTimerRunning(false)
            return 30
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [timerRunning])

  const toggleTimer = () => setTimerRunning(!timerRunning)
  const resetTimer = () => {
    setTimerRunning(false)
    setTimerSeconds(30)
  }

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

  const st = bookingStatusBadge(b.status, b.sessionStatus, b.paymentStatus)
  const pay = paymentBadge(b.paymentStatus)
  const paymentSummary = b.paymentSummary || null
  const paymentsList = Array.isArray(b.payments) ? b.payments : []
  const rows = normalizeSessionRows(b)
  const sessionsCount = paymentSummary?.sessionsCount || (Array.isArray(b.schedule) && b.schedule.length > 0 ? b.schedule.length : 1)
  const isOfflinePlan = b.serviceType === 'home' && b.homePlanPaymentMode === 'offline'
  const isOnlineBooking = b.serviceType === 'online' || (b.serviceType === 'home' && b.homePlanPaymentMode === 'online')
  const outstanding = Number(paymentSummary?.outstanding || 0)
  const perSession = Number(paymentSummary?.amountPerSession || 0)
  const planReady = b.serviceType === 'online' || b.planStatus === 'approved'
  const showInstallments = planReady && (sessionsCount > 1 || isOnlineBooking) && (Number(b.totalAmount || 0) > 0 || paymentsList.length > 0)
  const showLegacyPay = b.paymentStatus === 'pending' && planReady && !(b.serviceType === 'home' && b.homePlanPaymentMode === 'offline')
  const reviewedSessionIds = new Set(reviews.map((r) => (r.sessionId ? String(r.sessionId) : 'booking')))
  const overallReview = reviews.find((r) => !r.sessionId)
  const hasCompletedSession = rows.some((r) => r.status === 'completed')
  const physioName = typeof b.physioId === 'object' ? b.physioId?.name : 'Physiotherapist'

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero card ─────────────────────────────── */}
      <View style={styles.heroCard}>
        {/* Brand band */}
        <View style={styles.heroBand}>
          <View style={styles.heroGlow} pointerEvents="none" />
          <Text style={styles.heroLabel}>VISIT</Text>
          <Text style={styles.heroDate}>{formatBookingDateAndSlot(b.date, b.timeSlot)}</Text>
          {b.rescheduled && b.previousDate ? (
            <View style={styles.rescheduledRow}>
              <Ionicons name="swap-horizontal-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.rescheduledTxt}>
                Rescheduled from {formatBookingDateAndSlot(b.previousDate, b.previousTimeSlot)}
              </Text>
            </View>
          ) : null}
          <View style={styles.bandChipRow}>
            <BandChip label={st.label} />
            <BandChip label={pay.label} />
            <BandChip label={sessionStatusLabel(b)} />
          </View>
        </View>
        {/* Physio row */}
        <View style={styles.heroPhysioSection}>
          <View style={styles.heroPhysioIconWrap}>
            <Ionicons name="person-outline" size={16} color={colors.brand} />
          </View>
          <View style={styles.heroPhysioText}>
            <Text style={styles.heroPhysioLabel}>Physiotherapist</Text>
            <Text style={styles.heroPhysioName}>
              {typeof b.physioId === 'object' ? b.physioId?.name : 'Not assigned yet'}
            </Text>
            {b.physioId?.specialization ? (
              <Text style={styles.heroPhysioSub}>{b.physioId.specialization}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Therapist Live Transit Tracker ────────────────── */}
      {b.serviceType === 'home' && b.status !== 'completed' && (
        <View style={styles.transitCard}>
          <View style={styles.transitHeader}>
            <View style={styles.transitIconRing}>
              <View style={styles.transitIconPulse} />
              <Ionicons name="navigate" size={16} color="#ffffff" />
            </View>
            <View style={styles.transitHeaderText}>
              <Text style={styles.transitTitle}>Therapist Live Transit Tracker</Text>
              <Text style={styles.transitEta}>
                {transitPhase === 'Dispatched' && `${physioName} is preparing for visit`}
                {transitPhase === 'In Transit' && `${physioName} is arriving in 14 mins`}
                {transitPhase === 'Arrived' && `${physioName} has arrived at your location`}
                {transitPhase === 'Treating' && `Session in progress with ${physioName}`}
              </Text>
            </View>
          </View>

          {/* Interactive Simulation Switcher for demo purposes */}
          <View style={styles.demoControlsContainer}>
            <Text style={styles.demoLabel}>Demo Simulator:</Text>
            <View style={styles.demoControls}>
              {['Dispatched', 'In Transit', 'Arrived', 'Treating'].map((ph) => (
                <TouchableOpacity
                  key={ph}
                  style={[styles.demoBtn, transitPhase === ph && styles.demoBtnActive]}
                  onPress={() => setTransitPhase(ph)}
                >
                  <Text style={[styles.demoBtnTxt, transitPhase === ph && styles.demoBtnTxtActive]}>
                    {ph}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stepper progress */}
          <View style={styles.transitStepper}>
            {[
              { id: 'Dispatched', label: 'Dispatched', icon: 'car-outline' },
              { id: 'In Transit', label: 'In Transit', icon: 'navigate-outline' },
              { id: 'Arrived', label: 'Arrived', icon: 'pin-outline' },
              { id: 'Treating', label: 'Treating', icon: 'medical-outline' },
            ].map((step, idx) => {
              const phasesList = ['Dispatched', 'In Transit', 'Arrived', 'Treating'];
              const currentIdx = phasesList.indexOf(transitPhase);
              const stepIdx = phasesList.indexOf(step.id);
              
              const isCompleted = stepIdx < currentIdx;
              const isActive = stepIdx === currentIdx;
              const isPending = stepIdx > currentIdx;

              return (
                <View key={step.id} style={styles.stepperItem}>
                  <View style={[
                    styles.stepperDot,
                    isCompleted && styles.stepperDotCompleted,
                    isActive && styles.stepperDotActive,
                    isPending && styles.stepperDotPending
                  ]}>
                    <Ionicons name={step.icon} size={12} color={isActive || isCompleted ? '#ffffff' : '#64748b'} />
                  </View>
                  <Text style={[
                    styles.stepperLabel,
                    isActive && styles.stepperLabelActive,
                    isCompleted && styles.stepperLabelCompleted
                  ]}>
                    {step.label}
                  </Text>
                  {idx < 3 && (
                    <View style={[
                      styles.stepperLine,
                      stepIdx < currentIdx && styles.stepperLineCompleted
                    ]} />
                  )}
                </View>
              )
            })}
          </View>

          {/* Security PIN verification block */}
          <View style={styles.pinContainer}>
            <View style={styles.pinTextSection}>
              <Text style={styles.pinLabel}>Safety Verification PIN</Text>
              <Text style={styles.pinDescription}>Verify this code with {physioName} upon arrival.</Text>
            </View>
            <View style={styles.pinValueCard}>
              <Text style={styles.pinValue}>8492</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Plan approval banner ───────────────────── */}
      {b.serviceType === 'home' && b.planStatus === 'proposed' ? (
        <View style={styles.banner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.brand} />
          <Text style={styles.bannerTxt}>Your physiotherapist proposed a plan. Review and approve it to continue.</Text>
          <Pressable style={styles.bannerBtn} onPress={approvePlan}>
            <Text style={styles.bannerBtnTxt}>Approve</Text>
          </Pressable>
        </View>
      ) : null}

      {/* ── Participants ──────────────────────────── */}
      <View style={styles.sectionCard}>
        <SectionTitle icon="people-outline" title="Participants" />
        <InfoRow icon="person-circle-outline" label="You" value={b.userId?.name || '—'} sub={b.userId?.phone} />
        <View style={styles.rowDivider} />
        <InfoRow
          icon="medical-outline"
          label="Physiotherapist"
          value={typeof b.physioId === 'object' ? b.physioId?.name : 'Not assigned yet'}
          sub={b.physioId?.phone || b.physioId?.specialization}
          onPress={
            typeof b.physioId === 'object' && b.physioId?._id
              ? () => navigation.navigate('PublicPhysician', { id: b.physioId._id })
              : undefined
          }
        />
        <View style={styles.rowDivider} />
        <InfoRow icon="fitness-outline" label="Issue" value={b.issue || '—'} />
        <View style={styles.rowDivider} />
        <InfoRow
          icon="home-outline"
          label="Service type"
          value={String(b.serviceType || 'home').charAt(0).toUpperCase() + String(b.serviceType || 'home').slice(1)}
        />
      </View>

      {/* ── Installments ──────────────────────────── */}
      {showInstallments ? (
        <View style={styles.installmentsWrap}>
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
                style={styles.payInstallmentBtn}
                onPress={openInstallmentModal}
              >
                <Ionicons name="card-outline" size={14} color={colors.brand} />
                <Text style={styles.payInstallmentTxt}>Pay next installment</Text>
              </Pressable>
            ) : null}
          </InstallmentsPhysioCard>
        </View>
      ) : null}

      {/* ── Active Recovery Roadmap & Milestone Tracker ──────────────────────── */}
      <View style={styles.sectionCard}>
        <SectionTitle icon="fitness-outline" title="Active Recovery Roadmap" />
        
        {/* Overall Completion Progress */}
        {(() => {
          const totalCompleted = rows.filter(r => r.status === 'completed').length
          const progressPercent = rows.length > 0 ? (totalCompleted / rows.length) * 100 : 0
          return (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Rehab Completion</Text>
                <Text style={styles.progressVal}>
                  {totalCompleted} of {rows.length} Sessions ({Math.round(progressPercent)}%)
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          )
        })()}

        {/* Phase Timeline Cards */}
        {(() => {
          const total = rows.length
          let phase1Max = Math.max(1, Math.round(total * 0.3))
          let phase2Max = Math.max(phase1Max + 1, Math.round(total * 0.7))

          if (total <= 3) {
            phase1Max = 1
            phase2Max = 2
          }

          const groupedSessions = {
            1: [],
            2: [],
            3: [],
          }

          rows.forEach((r) => {
            if (r.n <= phase1Max) {
              groupedSessions[1].push(r)
            } else if (r.n <= phase2Max) {
              groupedSessions[2].push(r)
            } else {
              groupedSessions[3].push(r)
            }
          })

          const phases = [
            {
              id: 1,
              title: 'Phase 1: Pain Relief & Mobilization',
              description: 'Reduce acute pain, restore basic range of motion, and decrease joint inflammation.',
              target: 'Milestone: >50% pain reduction & basic mobility',
              icon: 'water-outline',
            },
            {
              id: 2,
              title: 'Phase 2: Strengthening & Activation',
              description: 'Rebuild muscle support, correct movement patterns, and activate stabilizer muscles.',
              target: 'Milestone: Joint load tolerance & stability',
              icon: 'flash-outline',
            },
            {
              id: 3,
              title: 'Phase 3: Functional Restoration & Discharge',
              description: 'Advanced coordination, high-load training, and transition to self-guided Home Exercises.',
              target: 'Milestone: 100% active recovery & discharge',
              icon: 'shield-checkmark-outline',
            },
          ]

          // Determine active phase
          let activePhaseId = 1
          const activeSession = rows.find(r => r.status !== 'completed')
          if (activeSession) {
            if (activeSession.n <= phase1Max) {
              activePhaseId = 1
            } else if (activeSession.n <= phase2Max) {
              activePhaseId = 2
            } else {
              activePhaseId = 3
            }
          } else {
            activePhaseId = 4 // All sessions are completed
          }

          return (
            <View style={styles.roadmapContainer}>
              {phases.map((phase, idx) => {
                const phaseSessions = groupedSessions[phase.id]
                const isLast = idx === phases.length - 1
                
                // Determine phase status
                let status = 'LOCKED'
                if (phase.id < activePhaseId) {
                  status = 'ACCOMPLISHED'
                } else if (phase.id === activePhaseId) {
                  status = 'IN_PROGRESS'
                }

                // Node styling helper values
                let statusColor = colors.slate300
                let statusIcon = 'lock-closed-outline'
                if (status === 'ACCOMPLISHED') {
                  statusColor = colors.success
                  statusIcon = 'checkmark-circle'
                } else if (status === 'IN_PROGRESS') {
                  statusColor = colors.brand
                  statusIcon = 'pulse-outline'
                }

                return (
                  <View style={styles.phaseContainer} key={phase.id}>
                    {/* Left Column (Timeline path and marker) */}
                    <View style={styles.phaseLeftColumn}>
                      <View style={[
                        styles.phaseIndicatorNode,
                        status === 'ACCOMPLISHED' && styles.phaseIndicatorNodeAccomplished,
                        status === 'IN_PROGRESS' && styles.phaseIndicatorNodeInProgress,
                        status === 'LOCKED' && styles.phaseIndicatorNodeLocked
                      ]}>
                        <Ionicons name={statusIcon} size={13} color={statusColor} />
                      </View>
                      {!isLast ? (
                        <View style={[
                          styles.phaseConnectorLine,
                          status === 'ACCOMPLISHED' && styles.phaseConnectorLineAccomplished,
                          status === 'IN_PROGRESS' && styles.phaseConnectorLineInProgress,
                          status === 'LOCKED' && styles.phaseConnectorLineLocked
                        ]} />
                      ) : null}
                    </View>

                    {/* Right Column (Phase details card) */}
                    <View style={[
                      styles.phaseCard,
                      status === 'ACCOMPLISHED' && styles.phaseCardAccomplished,
                      status === 'IN_PROGRESS' && styles.phaseCardInProgress,
                      status === 'LOCKED' && styles.phaseCardLocked
                    ]}>
                      {/* Phase Header */}
                      <View style={styles.phaseCardHeader}>
                        <View style={styles.phaseTitleRow}>
                          <Ionicons name={phase.icon} size={14} color={statusColor} style={{ marginRight: 5 }} />
                          <Text style={[
                            styles.phaseTitle,
                            status === 'LOCKED' && styles.phaseTitleLocked
                          ]}>
                            {phase.title}
                          </Text>
                        </View>
                        <View style={[
                          styles.phaseStatusBadge,
                          status === 'ACCOMPLISHED' && styles.phaseStatusBadgeAccomplished,
                          status === 'IN_PROGRESS' && styles.phaseStatusBadgeInProgress,
                          status === 'LOCKED' && styles.phaseStatusBadgeLocked
                        ]}>
                          <Text style={[
                            styles.phaseStatusBadgeTxt,
                            status === 'ACCOMPLISHED' && styles.phaseStatusBadgeTxtAccomplished,
                            status === 'IN_PROGRESS' && styles.phaseStatusBadgeTxtInProgress,
                            status === 'LOCKED' && styles.phaseStatusBadgeTxtLocked
                          ]}>
                            {status === 'ACCOMPLISHED' ? 'Completed' : status === 'IN_PROGRESS' ? 'Active' : 'Locked'}
                          </Text>
                        </View>
                      </View>

                      {/* Phase Description */}
                      <Text style={[
                        styles.phaseDescription,
                        status === 'LOCKED' && styles.phaseDescriptionLocked
                      ]}>
                        {phase.description}
                      </Text>

                      {/* Milestone Badge */}
                      <View style={[
                        styles.phaseMilestoneBox,
                        status === 'ACCOMPLISHED' && styles.phaseMilestoneBoxAccomplished,
                        status === 'IN_PROGRESS' && styles.phaseMilestoneBoxInProgress,
                        status === 'LOCKED' && styles.phaseMilestoneBoxLocked
                      ]}>
                        <Ionicons 
                          name={status === 'ACCOMPLISHED' ? "ribbon" : "flag-outline"} 
                          size={12} 
                          color={status === 'ACCOMPLISHED' ? colors.success : status === 'IN_PROGRESS' ? colors.brand : colors.slate500} 
                        />
                        <Text style={[
                          styles.phaseMilestoneTxt,
                          status === 'ACCOMPLISHED' && styles.phaseMilestoneTxtAccomplished,
                          status === 'IN_PROGRESS' && styles.phaseMilestoneTxtInProgress,
                          status === 'LOCKED' && styles.phaseMilestoneTxtLocked
                        ]}>
                          {phase.target}
                        </Text>
                      </View>

                      {/* Phase Sessions */}
                      {phaseSessions.length > 0 ? (
                        <View style={styles.nestedSessionsList}>
                          {phaseSessions.map((r, sIdx) => {
                            const done = r.status === 'completed'
                            const reviewed = reviewedSessionIds.has(String(r.sessionId || 'booking'))
                            return (
                              <View 
                                key={r.key} 
                                style={[
                                  styles.nestedSessionRow,
                                  done && styles.nestedSessionRowDone,
                                  sIdx === phaseSessions.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }
                                ]}
                              >
                                <View style={[
                                  styles.nestedSessionIndicator,
                                  done ? styles.nestedSessionIndicatorDone : styles.nestedSessionIndicatorPending
                                ]}>
                                  {done ? (
                                    <Ionicons name="checkmark" size={10} color={colors.white} />
                                  ) : (
                                    <Text style={styles.nestedSessionNumText}>{r.n}</Text>
                                  )}
                                </View>
                                
                                <View style={styles.nestedSessionDetails}>
                                  <Text style={[
                                    styles.nestedSessionTitle,
                                    done && styles.nestedSessionTitleDone
                                  ]}>
                                    Session #{r.n}
                                  </Text>
                                  <Text style={styles.nestedSessionTime}>
                                    {formatBookingDateAndSlot(r.date, r.time)}
                                  </Text>
                                </View>

                                {/* Action button */}
                                {done && !reviewed ? (
                                  <Pressable
                                    style={styles.nestedRateBtn}
                                    onPress={() => {
                                      setSessionReviewTarget(r)
                                      setReviewOpen(false)
                                    }}
                                  >
                                    <Ionicons name="star-outline" size={11} color={colors.brand} />
                                    <Text style={styles.nestedRateBtnTxt}>Rate</Text>
                                  </Pressable>
                                ) : (
                                  <View style={[styles.nestedRateBtn, styles.nestedRateBtnMuted]}>
                                    <Ionicons
                                      name={reviewed ? 'star' : 'lock-closed-outline'}
                                      size={10}
                                      color={reviewed ? colors.warning : colors.slate300}
                                    />
                                    <Text style={styles.nestedRateBtnMutedTxt}>
                                      {reviewed ? 'Reviewed' : 'Locked'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )
                          })}
                        </View>
                      ) : (
                        <View style={styles.lockedPromoBox}>
                          <Ionicons name="lock-closed-outline" size={12} color={colors.slate400} />
                          <Text style={styles.lockedPromoTxt}>
                            {total === 1 
                              ? "Upgrade to a multi-session plan to unlock milestone tracking." 
                              : "This phase will activate as you complete earlier sessions."
                            }
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )
        })()}
      </View>

      {/* ── Daily Rehab Companion Card ────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.rehabHeaderRow}>
          <SectionTitle icon="fitness-outline" title="Daily Rehabilitation Companion" />
          <View style={styles.rehabProgressBadge}>
            <Text style={styles.rehabProgressBadgeTxt}>
              {completedCount}/{totalExercises} Done
            </Text>
          </View>
        </View>
        
        <Text style={styles.rehabSub}>
          Complete your daily home exercise plan prescribed for your recovery roadmap.
        </Text>

        <View style={styles.rehabProgressContainer}>
          <View style={styles.rehabProgressBarBg}>
            <View style={[styles.rehabProgressBarFill, { width: `${completionPercentage}%` }]} />
          </View>
          <Text style={styles.rehabPercentTxt}>{Math.round(completionPercentage)}% Completed Today</Text>
        </View>

        <View style={styles.exerciseList}>
          {exercises.map((ex) => {
            const isCompleted = !!completedExercises[ex.id];
            return (
              <View key={ex.id} style={[styles.exerciseRow, isCompleted && styles.exerciseRowCompleted]}>
                <TouchableOpacity
                  style={styles.exerciseCheckbox}
                  onPress={() => {
                    setCompletedExercises(prev => ({
                      ...prev,
                      [ex.id]: !prev[ex.id]
                    }))
                  }}
                >
                  <View style={[styles.checkboxBox, isCompleted && styles.checkboxBoxChecked]}>
                    {isCompleted && (
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exerciseDetailsBtn}
                  onPress={() => {
                    setSelectedExercise(ex)
                    setTimerSeconds(30)
                    setTimerRunning(false)
                  }}
                >
                  <View style={styles.exerciseTitleCol}>
                    <Text style={[styles.exerciseName, isCompleted && styles.exerciseNameCompleted]}>
                      {ex.name}
                    </Text>
                    <Text style={styles.exerciseTarget}>{ex.target} • Hold for {ex.hold}s</Text>
                  </View>
                  <View style={styles.exArrowWrap}>
                    <Text style={styles.exStartBtnTxt}>Guide</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.brand} />
                  </View>
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      </View>

      {/* ── Plan details ─────────────────────────── */}
      <View style={styles.sectionCard}>
        <SectionTitle icon="document-text-outline" title="Plan details" />
        <KV k="Sessions" v={b.sessions != null ? String(b.sessions) : '—'} />
        <KV k="Price / session" v={b.amountPerSession != null ? `₹${b.amountPerSession}` : '—'} />
        {b.discountPercent != null ? <KV k="Discount" v={`${b.discountPercent}%`} /> : null}
        <KV k="Plan status" v={b.planStatus || '—'} last />
      </View>

      {/* ── Payment ──────────────────────────────── */}
      <View style={styles.sectionCard}>
        <SectionTitle icon="card-outline" title="Payment" />
        <KV k="Mode" v={paymentModeLabel(b)} />
        <KV k="Amount" v={paymentAmountLabel(b)} />
        <KV k="Payment hold" v={paymentStatusLabel(b.paymentStatus)} />
        <KV k="Payment step" v={marketplacePaymentStatusLabel(b.payment?.status)} last={!showLegacyPay} />
        {showLegacyPay ? (
          <Pressable
            style={[styles.payFullBtn, paymentLoading && { opacity: 0.7 }]}
            onPress={payLegacy}
            disabled={paymentLoading}
          >
            <Ionicons name="card-outline" size={18} color={colors.white} />
            <Text style={styles.payFullBtnTxt}>{paymentLoading ? 'Processing…' : 'Pay full amount'}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* ── Feedback ──────────────────────────────── */}
      {overallReview || hasCompletedSession ? (
        <View style={styles.sectionCard}>
          <SectionTitle icon="star-outline" title="Your feedback" />
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
                style={({ pressed }) => [styles.feedbackBtn, pressed && styles.feedbackBtnPressed]}
                onPress={() => setReviewOpen(true)}
              >
                <Ionicons name="star-outline" size={16} color={colors.white} />
                <Text style={styles.feedbackBtnTxt}>Rate your session</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {/* ── Actions ──────────────────────────────── */}
      <View style={styles.actionsCard}>
        {b.serviceType === 'home' && b.planStatus === 'proposed' ? (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, pressed && { opacity: 0.85 }]}
            onPress={approvePlan}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
            <Text style={styles.actionBtnPrimaryTxt}>Approve plan</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.actionBtnOutline, pressed && { opacity: 0.7 }]}
          onPress={() => setDisputeOpen(true)}
        >
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={styles.actionBtnOutlineTxt}>Raise dispute</Text>
        </Pressable>
      </View>

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
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              value={disputeReason}
              onChangeText={setDisputeReason}
              style={styles.inp}
              placeholder="Short reason for the dispute"
              placeholderTextColor={colors.slate300}
            />
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Description</Text>
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
            <Text style={styles.inputLabel}>Rating</Text>
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

            <Text style={styles.inputLabel}>Payment Amount (₹)</Text>
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

      {/* ── Exercise Detail Modal with Stopwatch ──────────────────── */}
      <Modal
        transparent
        visible={!!selectedExercise}
        animationType="slide"
        onRequestClose={() => setSelectedExercise(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedExercise(null)} />
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            {selectedExercise ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconWrap, { backgroundColor: colors.teal50 }]}>
                    <Ionicons name="fitness-outline" size={18} color={colors.brand} />
                  </View>
                  <View style={styles.modalHeaderText}>
                    <Text style={styles.modalTitle}>{selectedExercise.name}</Text>
                    <Text style={styles.modalSub}>{selectedExercise.target}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedExercise(null)} hitSlop={12} style={styles.modalClose}>
                    <Ionicons name="close" size={18} color={colors.slate400} />
                  </Pressable>
                </View>
                
                <ScrollView contentContainerStyle={styles.exerciseModalScroll}>
                  <View style={styles.guideCard}>
                    <Text style={styles.guideHeading}>Instructions</Text>
                    <Text style={styles.guideText}>{selectedExercise.desc}</Text>
                    
                    <View style={styles.tipBox}>
                      <Ionicons name="bulb-outline" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                      <Text style={styles.tipText}>
                        <Text style={{ fontWeight: '700' }}>Pro Tip: </Text>
                        {selectedExercise.tip}
                      </Text>
                    </View>
                  </View>

                  {/* Stopwatch section */}
                  <View style={styles.stopwatchCard}>
                    <Text style={styles.stopwatchTitle}>Hold / Rest Timer</Text>
                    
                    <View style={styles.stopwatchDigitsBox}>
                      <Text style={styles.stopwatchDigits}>
                        00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                      </Text>
                      <Text style={styles.stopwatchUnit}>sec</Text>
                    </View>

                    <View style={styles.stopwatchControls}>
                      <TouchableOpacity
                        style={[styles.stopwatchBtn, styles.stopwatchBtnReset]}
                        onPress={resetTimer}
                      >
                        <Text style={styles.stopwatchBtnResetText}>Reset</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.stopwatchBtn,
                          timerRunning ? styles.stopwatchBtnPause : styles.stopwatchBtnStart
                        ]}
                        onPress={toggleTimer}
                      >
                        <Ionicons
                          name={timerRunning ? "pause-outline" : "play-outline"}
                          size={16}
                          color="#ffffff"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.stopwatchBtnStartText}>
                          {timerRunning ? 'Pause' : 'Start'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.exerciseCompleteModalBtn,
                      completedExercises[selectedExercise.id] && styles.exerciseCompleteModalBtnDone
                    ]}
                    onPress={() => {
                      setCompletedExercises(prev => ({
                        ...prev,
                        [selectedExercise.id]: !prev[selectedExercise.id]
                      }))
                      setSelectedExercise(null)
                    }}
                  >
                    <Ionicons
                      name={completedExercises[selectedExercise.id] ? "checkmark-done-circle" : "checkmark-circle-outline"}
                      size={18}
                      color="#ffffff"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.exerciseCompleteModalBtnTxt}>
                      {completedExercises[selectedExercise.id] ? 'Completed!' : 'Mark Exercise Completed'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : null}
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

function BandChip({ label }) {
  return (
    <View style={styles.bandChip}>
      <Text style={styles.bandChipTxt}>{label}</Text>
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

  installmentsWrap: {},
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
})
