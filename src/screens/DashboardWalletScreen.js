import { memo, useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatBookingDateAndSlot } from '../utils/date'
import EmptyState from '../components/ui/EmptyState'
import LoadingScreen from '../components/ui/LoadingScreen'
import Chip from '../components/ui/Chip'
import { colors } from '../theme/colors'
import { figmaTokens } from '../theme/figmaTokens'
import { surfaceListShell } from '../theme/surfaceCard'
import { font, type } from '../theme/typography'
import { formatInr } from '../utils/currency'
import { paymentBadge } from '../utils/dashboardUtils'
import { useWalletSummary } from '../api/queries'

export default function DashboardWalletScreen({ navigation }) {
  const { data, isLoading, isRefetching, refetch } = useWalletSummary()
  const summary = data || { walletBalance: 0, totalSpend: 0, heldTotal: 0, releasedTotal: 0, recentPayments: [] }

  const totalSpend = summary.totalSpend || 0
  const heldTotal = summary.heldTotal || 0
  const releasedTotal = summary.releasedTotal || 0
  const lines = summary.recentPayments || []

  if (isLoading && !summary.recentPayments) return <LoadingScreen />

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[colors.brand]}
          tintColor={colors.brand}
        />
      }
    >
      {/* Ambient Top Background Halo Glow */}
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

      {/* Wallet Credits (Referral) Card */}
      <View style={styles.referralCardContainer}>
        <View style={styles.referralCard}>
          <View style={styles.referralCardTop}>
            <View>
              <Text style={styles.referralCardLabel}>WALLET CREDITS (REFERRAL)</Text>
              <Text style={styles.referralCardAmount}>{formatInr(summary.walletBalance)}</Text>
              <Text style={styles.referralCardSub}>Available to use at checkout</Text>
            </View>
            <View style={styles.referralCardIconWrap}>
              <Ionicons name="gift-outline" size={20} color={figmaTokens.primary} />
            </View>
          </View>
        </View>
      </View>

      {/* Hero spend card */}
      <View style={styles.heroCardContainer}>
        <View style={styles.heroCard}>
          {/* Ambient inner glow bubbles */}
          <View style={styles.cardGlowBubble1} />
          <View style={styles.cardGlowBubble2} />
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
          <Ionicons name="add-circle-outline" size={16} color={figmaTokens.primary} />
          <Text style={styles.bookBtnTxt}>Book a session</Text>
        </Pressable>
      </View>
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
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="card-outline" size={13} color={figmaTokens.primary} />
              </View>
              <Text style={styles.sectionTitle}>Paid sessions</Text>
            </View>
            <Text style={styles.sectionCount}>{lines.length} total</Text>
          </View>
          <View style={styles.txList}>
            {lines.map((b, index) => (
              <WalletRow
                key={b._id}
                booking={b}
                amount={b.totalAmount || 0}
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
        <Ionicons name="receipt-outline" size={14} color={figmaTokens.primary} />
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
  scroll: { paddingBottom: 36, position: 'relative' },

  // Ambient Header glows
  ambientHeaderGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(162, 240, 239, 0.18)',
    zIndex: 0,
  },
  ambientHeaderGlow2: {
    position: 'absolute',
    top: -50,
    left: '20%',
    width: '60%',
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(13, 107, 107, 0.05)',
    zIndex: 0,
  },

  // Hero card
  heroCardContainer: {
    margin: 16,
    borderRadius: 20,
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 4,
    zIndex: 2,
  },
  heroCard: {
    borderRadius: 20,
    backgroundColor: figmaTokens.primary,
    padding: 18,
    gap: 20,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardGlowBubble1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  cardGlowBubble2: {
    position: 'absolute',
    bottom: -60,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
    color: 'rgba(255,255,255,0.75)',
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
    color: 'rgba(255,255,255,0.7)',
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  heroStatLabel: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  heroStatValue: { fontFamily: font.bold, fontSize: type.base, color: '#fff' },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bookBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  bookBtnTxt: { fontFamily: font.bold, fontSize: type.base, color: figmaTokens.primary },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: figmaTokens.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  sectionCount: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },

  emptyWrap: { margin: 16, zIndex: 1 },

  // Transaction list
  txList: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginHorizontal: 16,
    marginBottom: 16,
    zIndex: 1,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  txRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(15, 23, 42, 0.06)' },
  txRowPressed: { backgroundColor: colors.slate50, opacity: 0.85 },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: figmaTokens.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txBody: { flex: 1, minWidth: 0 },
  txDate: { fontFamily: font.bold, fontSize: type.sm, color: colors.textPrimary },
  txPhysio: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  txRight: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  txAmount: { fontFamily: font.bold, fontSize: type.sm, color: colors.textPrimary },
  referralCardContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    zIndex: 2,
  },
  referralCard: {
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    padding: 18,
  },
  referralCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referralCardLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: '#064e3b',
    marginBottom: 4,
  },
  referralCardAmount: {
    fontFamily: font.bold,
    fontSize: 26,
    color: '#065f46',
    letterSpacing: -0.5,
  },
  referralCardSub: {
    marginTop: 2,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: '#047857',
  },
  referralCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
