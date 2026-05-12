import { memo, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatBookingDateAndSlot } from '../utils/date'
import EmptyState from '../components/ui/EmptyState'
import LoadingScreen from '../components/ui/LoadingScreen'
import Chip from '../components/ui/Chip'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'
import { formatInr } from '../utils/currency'
import { paymentBadge } from '../utils/dashboardUtils'
import { useMyBookings } from '../api/queries'

export default function DashboardWalletScreen({ navigation }) {
  const { data, isLoading } = useMyBookings({ page: 1, limit: 100 })
  const bookings = data || []

  const { totalSpend, lines } = useMemo(() => {
    let sum = 0
    const rows = []
    for (const b of bookings) {
      const amt = Number(b.totalAmount) || 0
      const paid = b.paymentStatus === 'released' || b.paymentStatus === 'held' || b.paymentStatus === 'paid'
      if (paid && amt) {
        sum += amt
        rows.push({ b, amt })
      }
    }
    rows.sort((a, b) => String(b.b.createdAt || '').localeCompare(String(a.b.createdAt || '')))
    return { totalSpend: sum, lines: rows.slice(0, 15) }
  }, [bookings])

  const heldTotal = useMemo(
    () => bookings.reduce((s, b) => (b.paymentStatus === 'held' ? s + (Number(b.totalAmount) || 0) : s), 0),
    [bookings],
  )
  const releasedTotal = useMemo(
    () => bookings.reduce((s, b) => (b.paymentStatus === 'released' ? s + (Number(b.totalAmount) || 0) : s), 0),
    [bookings],
  )

  if (isLoading && !bookings.length) return <LoadingScreen />

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero spend card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>TOTAL CARE SPEND</Text>
            <Text style={styles.heroAmount}>{formatInr(totalSpend)}</Text>
            <Text style={styles.heroSub}>Held and released payments</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="wallet-outline" size={22} color="rgba(255,255,255,0.7)" />
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Held</Text>
            <Text style={styles.heroStatValue}>{formatInr(heldTotal)}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Released</Text>
            <Text style={styles.heroStatValue}>{formatInr(releasedTotal)}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.bookBtn, pressed && styles.bookBtnPressed]}
          onPress={() => navigation.navigate('PhysioList')}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.brand} />
          <Text style={styles.bookBtnTxt}>Book a session</Text>
        </Pressable>
      </View>

      {/* Transaction list */}
      {lines.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            bordered
            title="No paid sessions yet"
            message="Sessions where payment is secured or completed will appear here."
          />
        </View>
      ) : (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Paid sessions</Text>
            <Text style={styles.sectionCount}>{lines.length} total</Text>
          </View>
          <View style={styles.txList}>
            {lines.map(({ b, amt }, index) => (
              <WalletRow
                key={b._id}
                booking={b}
                amount={amt}
                isLast={index === lines.length - 1}
                onPress={() => navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: b._id } })}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  )
}

const WalletRow = memo(function WalletRow({ booking, amount, isLast, onPress }) {
  const pay = paymentBadge(booking.paymentStatus)
  return (
    <Pressable
      style={({ pressed }) => [styles.txRow, !isLast && styles.txRowDivider, pressed && styles.txRowPressed]}
      onPress={onPress}
    >
      <View style={styles.txIconWrap}>
        <Ionicons name="receipt-outline" size={14} color={colors.slate400} />
      </View>
      <View style={styles.txBody}>
        <Text style={styles.txDate} numberOfLines={1}>
          {formatBookingDateAndSlot(booking.date, booking.timeSlot)}
        </Text>
        <Text style={styles.txPhysio} numberOfLines={1}>{booking.physioId?.name || 'Physio'}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>{formatInr(amount)}</Text>
        <Chip label={pay.label} bg={pay.bg} fg={pay.fg} border={pay.border} size="sm" />
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  scroll: { paddingBottom: 36 },

  // Hero card
  heroCard: {
    margin: 16,
    borderRadius: 20,
    backgroundColor: colors.brand,
    padding: 22,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    gap: 18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontFamily: font.bold,
    fontSize: type.xs,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroAmount: {
    fontFamily: font.bold,
    fontSize: 32,
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 36,
  },
  heroSub: {
    marginTop: 5,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: 'rgba(255,255,255,0.65)',
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroStatLabel: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  heroStatValue: { fontFamily: font.bold, fontSize: type.base, color: '#fff' },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
  },
  bookBtnPressed: { opacity: 0.85 },
  bookBtnTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.brand },

  // Section header
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  sectionCount: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },

  emptyWrap: { margin: 16 },

  // Transaction list
  txList: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  txRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  txRowPressed: { backgroundColor: colors.slate50 },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txBody: { flex: 1, minWidth: 0 },
  txDate: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  txPhysio: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  txRight: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  txAmount: { fontFamily: font.bold, fontSize: type.sm, color: colors.textPrimary },
})
