import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../api/client'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'
import { formatBookingVisitWithCondition } from '../utils/bookingDisplay'
import {
  paymentStatusLabel,
  marketplacePaymentStatusLabel,
  formatPaidAt,
  paymentModeLabel,
  bookingCodeBadge,
  serviceTypeLabel,
} from '../utils/bookingDisplay'
import { assetUrl } from '../utils/assetUrl'

function formatRupees(n) {
  const v = Number(n || 0)
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const STATUS_LABEL = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  collected: 'Collected — pending verification',
  verified: 'Verified',
  rejected: 'Rejected',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

function installmentModeLabel(p) {
  const channel = String(p?.meta?.collectionChannel || '').toLowerCase()
  if (channel === 'phonepe_qr') return 'PhonePe QR'
  if (channel === 'cash') return 'Cash'
  if (p?.mode === 'online') return 'Online (Razorpay)'
  if (p?.mode === 'offline') return 'Cash / UPI'
  return p?.mode || '—'
}

function KV({ label, value, last }) {
  return (
    <View style={[styles.kvRow, last && styles.kvRowLast]}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  )
}

export default function PaymentDetailScreen({ navigation, route }) {
  const bookingId = route.params?.bookingId
  const paymentId = route.params?.paymentId || null
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!bookingId) return
    try {
      setError('')
      const res = await api.get(`/bookings/${bookingId}`)
      setBooking(res.data)
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load payment details')
      setBooking(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [bookingId])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load]),
  )

  const payments = useMemo(() => {
    const list = Array.isArray(booking?.payments) ? [...booking.payments] : []
    return list.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
  }, [booking])

  const selectedPayment = useMemo(() => {
    if (!paymentId) return null
    return payments.find((p) => String(p._id) === String(paymentId)) || null
  }, [payments, paymentId])

  const summary = booking?.paymentSummary || {}
  const totalAmount = Number(summary.totalAmount || booking?.totalAmount || 0)
  const totalPaid = Number(summary.totalPaid || booking?.totalPaid || 0)
  const outstanding = Number.isFinite(Number(summary.outstanding))
    ? Number(summary.outstanding)
    : Math.max(0, totalAmount - totalPaid)

  if (loading && !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    )
  }

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTxt}>{error || 'Payment details unavailable'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnTxt}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  const b = booking
  const bookingRef = bookingCodeBadge(b)
  const proofUrl = selectedPayment?.proofUrl ? assetUrl(selectedPayment.proofUrl) : ''

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            load()
          }}
          tintColor={colors.brand}
          colors={[colors.brand]}
        />
      }
    >
      <Pressable
        onPress={() => navigation.navigate('BookingDetail', { id: bookingId })}
        style={styles.backLink}
      >
        <Ionicons name="arrow-back" size={16} color={colors.brand} />
        <Text style={styles.backLinkTxt}>Back to session</Text>
      </Pressable>

      <Text style={styles.kicker}>PAYMENT DETAILS</Text>
      <Text style={styles.heroAmount}>
        {selectedPayment ? formatRupees(selectedPayment.amount) : formatRupees(totalAmount || b.totalAmount)}
      </Text>
      <Text style={styles.heroSub}>
        {formatBookingVisitWithCondition(b)}
        {bookingRef ? ` · ${bookingRef}` : ''}
      </Text>

      {selectedPayment ? (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>This payment</Text>
            <View style={styles.chip}>
              <Text style={styles.chipTxt}>{STATUS_LABEL[selectedPayment.status] || selectedPayment.status}</Text>
            </View>
          </View>
          <KV label="Amount" value={formatRupees(selectedPayment.amount)} />
          <KV label="Mode" value={installmentModeLabel(selectedPayment)} />
          <KV
            label="Recorded"
            value={formatDateTime(
              selectedPayment.verifiedAt || selectedPayment.collectedAt || selectedPayment.createdAt,
            )}
          />
          {selectedPayment.razorpayPaymentId ? (
            <KV label="Razorpay ID" value={selectedPayment.razorpayPaymentId} />
          ) : null}
          {selectedPayment.note ? <KV label="Note" value={selectedPayment.note} /> : null}
          {selectedPayment.status === 'rejected' && selectedPayment.rejectReason ? (
            <KV label="Rejection" value={selectedPayment.rejectReason} />
          ) : null}
          {proofUrl ? (
            <Pressable onPress={() => Linking.openURL(proofUrl)} style={styles.proofBtn}>
              <Text style={styles.proofBtnTxt}>View proof screenshot</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => navigation.setParams({ paymentId: undefined })}
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnTxt}>View all payments for this booking</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Booking payment summary</Text>
        <KV label="Visit type" value={serviceTypeLabel(b.serviceType)} />
        <KV label="Payment mode" value={paymentModeLabel(b)} />
        <KV label="Plan total" value={formatRupees(totalAmount || b.totalAmount)} />
        <KV label="Received" value={formatRupees(totalPaid)} />
        <KV label="Outstanding" value={formatRupees(Math.max(0, outstanding))} />
        <KV label="Hold status" value={paymentStatusLabel(b.paymentStatus)} />
        <KV label="Payment step" value={marketplacePaymentStatusLabel(b.payment?.status)} />
        <KV label="Paid at" value={formatPaidAt(b) || '—'} last />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{payments.length ? 'Payment history' : 'No installments yet'}</Text>
        {payments.length === 0 ? (
          <Text style={styles.emptyTxt}>
            Payments and collections for this booking will appear here once recorded.
          </Text>
        ) : (
          payments.map((p) => {
            const active = String(p._id) === String(paymentId)
            return (
              <Pressable
                key={p._id}
                onPress={() => navigation.setParams({ paymentId: String(p._id) })}
                style={[styles.payRow, active && styles.payRowActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.payAmt}>{formatRupees(p.amount)}</Text>
                  <Text style={styles.payMeta}>
                    {installmentModeLabel(p)} · {formatDateTime(p.verifiedAt || p.collectedAt || p.createdAt)}
                  </Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipTxt}>{STATUS_LABEL[p.status] || p.status}</Text>
                </View>
              </Pressable>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.canvas },
  errorTxt: { fontFamily: font.medium, fontSize: type.sm, color: colors.slate600, textAlign: 'center' },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.brand,
  },
  backBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backLinkTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
  kicker: {
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.slate500,
  },
  heroAmount: {
    marginTop: 6,
    fontFamily: font.bold,
    fontSize: 28,
    color: colors.ink,
  },
  heroSub: { marginTop: 4, fontFamily: font.medium, fontSize: type.sm, color: colors.slate500, lineHeight: 20 },
  card: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    padding: 16,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  cardTitle: { fontFamily: font.bold, fontSize: type.sm, color: colors.ink },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate100,
  },
  kvRowLast: { borderBottomWidth: 0 },
  kvLabel: { fontFamily: font.medium, fontSize: type.sm, color: colors.slate500, flexShrink: 0 },
  kvValue: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
  },
  emptyTxt: { marginTop: 8, fontFamily: font.medium, fontSize: type.sm, color: colors.slate500, lineHeight: 20 },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.slate100,
  },
  payRowActive: { backgroundColor: '#f0fdfa', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12 },
  payAmt: { fontFamily: font.bold, fontSize: type.sm, color: colors.ink },
  payMeta: { marginTop: 2, fontFamily: font.medium, fontSize: 12, color: colors.slate500 },
  chip: {
    borderRadius: 999,
    backgroundColor: colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipTxt: { fontFamily: font.semiBold, fontSize: 10, color: colors.slate700 },
  proofBtn: { marginTop: 10, paddingVertical: 10 },
  proofBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
  linkBtn: { marginTop: 8, paddingVertical: 6 },
  linkBtnTxt: { fontFamily: font.semiBold, fontSize: 12, color: colors.brand },
})
