import { memo, useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMyBookings, useMyDisputes, useProfile } from '../api/queries'
import { formatBookingDateAndSlot } from '../utils/date'
import { bookingStatusBadge } from '../utils/dashboardUtils'
import Chip from '../components/ui/Chip'
import { formatInr } from '../utils/currency'
import { colors } from '../theme/colors'
import { figmaTokens } from '../theme/figmaTokens'
import { font, type, leading } from '../theme/typography'

const BOOKING_PARAMS = { page: 1, limit: 100 }
const DISPUTE_PARAMS = { page: 1, limit: 20 }

export default function DashboardHomeScreen({ navigation }) {
  const { data: bookings, isLoading: bookingsLoading } = useMyBookings(BOOKING_PARAMS)
  const { data: disputesData, isLoading: disputesLoading } = useMyDisputes(DISPUTE_PARAMS)
  const { data: profile, isLoading: profileLoading } = useProfile()

  const loading = bookingsLoading || disputesLoading || profileLoading
  const needsProfile = !loading && !bookings && !disputesData

  const firstName = useMemo(() => {
    const raw = profile?.name?.trim()
    return raw ? raw.split(/\s+/)[0] : null
  }, [profile])

  const avatarInitial = useMemo(
    () => firstName?.[0]?.toUpperCase() ?? profile?.name?.[0]?.toUpperCase() ?? '?',
    [firstName, profile],
  )

  const todayStr = useMemo(
    () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  )

  const openDisputes = useMemo(
    () => (disputesData?.rows || []).filter((d) => d.status === 'open' || d.status === 'under_review').length,
    [disputesData],
  )

  const nextBooking = useMemo(() => {
    const list = bookings || []
    return list.find((b) => b.sessionStatus !== 'completed') || null
  }, [bookings])

  const totalSessions = useMemo(() => (bookings || []).length, [bookings])

  const revenueTotal = useMemo(
    () =>
      (bookings || []).reduce((sum, b) => {
        const amt = Number(b.totalAmount) || 0
        if (!amt) return sum
        const paid = b.paymentStatus === 'released' || b.paymentStatus === 'held' || b.paymentStatus === 'paid'
        return paid ? sum + amt : sum
      }, 0),
    [bookings],
  )

  const recent = useMemo(
    () =>
      [...(bookings || [])]
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 5),
    [bookings],
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Ambient Top Background Halo Glow */}
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

      {/* ── Personalized Dashboard Header Section ────────────────── */}
      <View style={styles.headerSection}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerGreeting}>
            Hi, {firstName ? firstName.toUpperCase() : 'THERE'}
          </Text>
          <Text style={styles.headerTitle}>{todayStr}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.profileAvatarCircle}>
            <Text style={styles.profileAvatarText}>{avatarInitial}</Text>
          </View>
        </View>
      </View>

      {/* ── Banners ──────────────────────────────── */}
      {needsProfile && (
        <Pressable
          style={({ pressed }) => [styles.infoBanner, pressed && styles.dimmed]}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.bannerIconWrap}>
            <Ionicons name="person-outline" size={16} color={figmaTokens.primary} />
          </View>
          <View style={styles.bannerBody}>
            <Text style={styles.bannerTitle}>Complete your profile</Text>
            <Text style={styles.bannerText}>Add date of birth, gender, and address to book sessions.</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={figmaTokens.primary} />
        </Pressable>
      )}

      {openDisputes > 0 && (
        <Pressable
          style={({ pressed }) => [styles.warningBanner, pressed && styles.dimmed]}
          onPress={() => navigation.navigate('Disputes')}
        >
          <Ionicons name="alert-circle" size={16} color={colors.warning} />
          <Text style={styles.warningTxt}>
            {openDisputes} open dispute{openDisputes === 1 ? '' : 's'} — tap to review
          </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.amber800} />
        </Pressable>
      )}

      {/* ── Next session (hero card) ──────────────── */}
      {nextBooking ? (
        <View style={styles.nextCardContainer}>
          <Pressable
            style={({ pressed }) => [styles.nextCard, pressed && styles.nextCardDim]}
            onPress={() =>
              navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: nextBooking._id } })
            }
          >
            {/* Ambient inner glow bubbles */}
            <View style={styles.cardGlowBubble1} />
            <View style={styles.cardGlowBubble2} />

            <View style={styles.nextHeaderRow}>
              <View style={styles.nextContent}>
                <View style={styles.nextBadgeContainer}>
                  <Ionicons name="pulse" size={10} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.nextBadge}>UPCOMING SESSION</Text>
                </View>
                <Text style={styles.nextDate}>{formatBookingDateAndSlot(nextBooking.date, nextBooking.timeSlot)}</Text>
              </View>
              <View style={styles.nextStatusIndicator}>
                <View style={styles.nextStatusDot} />
                <Text style={styles.nextStatusText}>
                  {nextBooking.status === 'paid' ? 'Secured' : 'Scheduled'}
                </Text>
              </View>
            </View>
            {/* Doctor Details Box */}
            <View style={styles.nextDetailsBox}>
              <View style={styles.nextDocAvatar}>
                <Ionicons name="person" size={16} color={figmaTokens.primary} />
              </View>
              <View style={styles.nextDocInfo}>
                <Text style={styles.nextDocName}>{nextBooking.physioId?.name || 'Physio TBD'}</Text>
                <Text style={styles.nextDocSub}>
                  {nextBooking.physioId?.specialization || 'Verified Physiotherapist'} · At Home
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.bookCta, pressed && styles.dimmed]}
          onPress={() => navigation.navigate('PhysioList')}
        >
          <View style={styles.bookCtaIconWrap}>
            <Ionicons name="add-circle-outline" size={24} color={figmaTokens.primary} />
          </View>
          <View style={styles.bookCtaBody}>
            <Text style={styles.bookCtaTitle}>Book a session</Text>
            <Text style={styles.bookCtaSub}>Find a physio near you</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={figmaTokens.primary} />
        </Pressable>
      )}

      {/* ── Stats ────────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statHead}>
            <Text style={styles.statLabel}>Sessions</Text>
            <View style={[styles.statIconBadge, { backgroundColor: figmaTokens.mintSoft }]}>
              <Ionicons name="calendar-outline" size={12} color={figmaTokens.primary} />
            </View>
          </View>
          <Text style={styles.statNumber}>{totalSessions}</Text>
          <Text style={styles.statSub}>all time</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHead}>
            <Text style={styles.statLabel}>Care Spend</Text>
            <View style={[styles.statIconBadge, { backgroundColor: figmaTokens.mintSoft }]}>
              <Ionicons name="wallet-outline" size={12} color={figmaTokens.primary} />
            </View>
          </View>
          <Text style={styles.statMoney}>{formatInr(revenueTotal)}</Text>
          <Text style={styles.statSub}>held + released</Text>
        </View>
      </View>

      {/* ── Recent activity ───────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name="calendar-outline" size={13} color={figmaTokens.primary} />
          </View>
          <Text style={styles.sectionTitle}>Recent activity</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Bookings')}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {recent.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="calendar-outline" size={28} color={colors.slate300} />
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySub}>Your session history will appear here</Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {recent.map((item, index) => (
            <ActivityRow
              key={item._id}
              item={item}
              isLast={index === recent.length - 1}
              onPress={() =>
                navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: item._id } })
              }
            />
          ))}
        </View>
      )}

    </ScrollView>
  )
}

const ActivityRow = memo(function ActivityRow({ item, onPress, isLast }) {
  const st = bookingStatusBadge(item.status, item.sessionStatus, item.paymentStatus)
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actRow,
        !isLast && styles.actRowDivider,
        pressed && styles.actRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.actIconWrap}>
        <Ionicons name="calendar-outline" size={14} color={figmaTokens.primary} />
      </View>
      <View style={styles.actBody}>
        <Text style={styles.actDate} numberOfLines={1}>
          {formatBookingDateAndSlot(item.date, item.timeSlot)}
        </Text>
        <Text style={styles.actPhysio} numberOfLines={1}>{item.physioId?.name || 'Physio'}</Text>
      </View>
      <View style={styles.actRight}>
        <Chip label={st.label} bg={st.bg} fg={st.fg} border={st.border} />
        <Ionicons name="chevron-forward" size={13} color={colors.slate300} />
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32, position: 'relative' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas },
  dimmed: { opacity: 0.75 },

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

  // ── Header Section
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingTop: 16,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerGreeting: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: figmaTokens.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontFamily: font.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: figmaTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  profileAvatarText: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.white,
  },

  // ── Banners
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(240, 253, 250, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.12)',
    zIndex: 1,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  bannerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontFamily: font.bold, fontSize: type.sm, color: colors.teal800 },
  bannerText: {
    marginTop: 1,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    lineHeight: leading.xs,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 251, 235, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    zIndex: 1,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  warningTxt: { flex: 1, fontFamily: font.bold, fontSize: type.sm, color: colors.amber800 },

  // ── Next session hero card (matching hubCard in HomeScreen.js)
  nextCardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 4,
    zIndex: 2,
  },
  nextCard: {
    borderRadius: 20,
    backgroundColor: figmaTokens.primary, // Brand teal color
    paddingVertical: 18,
    paddingHorizontal: 18,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextCardDim: { opacity: 0.94 },
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
  nextHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    zIndex: 2,
  },
  nextBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextBadge: {
    fontFamily: font.bold,
    fontSize: 8,
    letterSpacing: 0.3,
    color: '#fff',
    textTransform: 'uppercase',
  },
  nextDate: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: '#fff',
    marginTop: 6,
  },
  nextStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nextStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22c55e',
  },
  nextStatusText: {
    fontFamily: font.bold,
    fontSize: 8,
    color: '#4ade80',
    textTransform: 'uppercase',
  },
  progressSection: {
    marginBottom: 14,
    zIndex: 2,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: font.medium,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  progressPercent: {
    fontFamily: font.bold,
    fontSize: 10,
    color: '#fff',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  nextDetailsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 2,
  },
  nextDocAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nextDocInfo: {
    flex: 1,
  },
  nextDocName: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.white,
  },
  nextDocSub: {
    fontFamily: font.regular,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  nextActionsRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 3,
  },
  nextQuickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  nextQuickActionText: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },

  // ── Book CTA (no upcoming session)
  bookCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    zIndex: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  bookCtaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e6f4f3', // figmaTokens.mintSoft
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bookCtaBody: { flex: 1 },
  bookCtaTitle: { fontFamily: font.bold, fontSize: type.base, color: figmaTokens.primary },
  bookCtaSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },

  // ── Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 24,
    zIndex: 1,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    zIndex: 1,
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  statIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    marginTop: 6,
    fontFamily: font.bold,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -1.0,
    lineHeight: 36,
  },
  statMoney: {
    marginTop: 6,
    fontFamily: font.bold,
    fontSize: type['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  statSub: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
  },

  // ── Section Header Row
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
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
    backgroundColor: '#e6f4f3', // figmaTokens.mintSoft
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  seeAll: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: figmaTokens.primary,
  },

  // ── Empty State
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 7,
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textSecondary },
  emptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary },

  // ── Activity List
  activityList: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    overflow: 'hidden',
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 11,
  },
  actRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  actRowPressed: { backgroundColor: colors.slate50, opacity: 0.85 },
  actIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#e6f4f3', // figmaTokens.mintSoft
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actBody: { flex: 1, minWidth: 0 },
  actDate: { fontFamily: font.bold, fontSize: type.sm, color: colors.textPrimary },
  actPhysio: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  actRight: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
})
