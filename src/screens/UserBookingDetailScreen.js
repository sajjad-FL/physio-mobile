import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
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

      {/* ── Session timeline ──────────────────────── */}
      <View style={styles.sectionCard}>
        <SectionTitle icon="calendar-outline" title="Session timeline" />
        {rows.map((r, idx) => {
          const done = r.status === 'completed'
          const reviewed = reviewedSessionIds.has(String(r.sessionId || 'booking'))
          return (
            <View key={r.key}>
              {idx > 0 ? <View style={styles.rowDivider} /> : null}
              <View style={styles.timelineRow}>
                <View style={[styles.sessionBadge, done ? styles.sessionBadgeDone : styles.sessionBadgePending]}>
                  <Text style={[styles.sessionNum, done ? styles.sessionNumDone : styles.sessionNumPending]}>
                    {r.n}
                  </Text>
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineDate}>{formatBookingDateAndSlot(r.date, r.time)}</Text>
                  <View style={styles.timelineStatusRow}>
                    <View style={[styles.sessionStatusDot, done ? styles.dotDone : styles.dotPending]} />
                    <Text style={[styles.sessionStatusTxt, done ? styles.sessionStatusTxtDone : null]}>
                      {done ? 'Completed' : 'Scheduled'}
                    </Text>
                  </View>
                </View>
                {done && !reviewed ? (
                  <Pressable
                    style={styles.rateBtn}
                    onPress={() => {
                      setSessionReviewTarget(r)
                      setReviewOpen(false)
                    }}
                  >
                    <Ionicons name="star-outline" size={12} color={colors.brand} />
                    <Text style={styles.rateBtnTxt}>Rate</Text>
                  </Pressable>
                ) : (
                  <View style={[styles.rateBtn, styles.rateBtnMuted]}>
                    <Ionicons
                      name={reviewed ? 'star' : 'lock-closed-outline'}
                      size={12}
                      color={reviewed ? colors.warning : colors.slate300}
                    />
                    <Text style={styles.rateBtnMutedTxt}>{reviewed ? 'Reviewed' : 'Locked'}</Text>
                  </View>
                )}
              </View>
            </View>
          )
        })}
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

  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionBadgeDone: { backgroundColor: colors.teal50 },
  sessionBadgePending: { backgroundColor: colors.slate100 },
  sessionNum: { fontFamily: font.bold, fontSize: type.sm },
  sessionNumDone: { color: colors.brand },
  sessionNumPending: { color: colors.slate500 },
  timelineBody: { flex: 1 },
  timelineDate: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  timelineStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  sessionStatusDot: { width: 6, height: 6, borderRadius: 3 },
  dotDone: { backgroundColor: colors.success },
  dotPending: { backgroundColor: colors.slate300 },
  sessionStatusTxt: { fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary },
  sessionStatusTxtDone: { color: colors.success },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
    flexShrink: 0,
  },
  rateBtnTxt: { fontFamily: font.semiBold, fontSize: 10, color: colors.brand },
  rateBtnMuted: { borderColor: colors.borderSubtle, backgroundColor: colors.slate50 },
  rateBtnMutedTxt: { fontFamily: font.regular, fontSize: 10, color: colors.textTertiary },

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
})
