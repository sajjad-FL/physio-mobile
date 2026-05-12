import { memo, useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMyBookings, useMyDisputes, useProfile } from '../api/queries'
import { formatBookingDateAndSlot } from '../utils/date'
import { bookingStatusBadge } from '../utils/dashboardUtils'
import Chip from '../components/ui/Chip'
import { formatInr } from '../utils/currency'
import { colors } from '../theme/colors'
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

      {/* ── Hero ─────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.greeting}>Hi, {firstName || 'there'}</Text>
          <Text style={styles.subGreeting}>{todayStr}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{avatarInitial}</Text>
        </View>
      </View>

      {/* ── Banners ──────────────────────────────── */}
      {needsProfile && (
        <Pressable
          style={({ pressed }) => [styles.infoBanner, pressed && styles.dimmed]}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.bannerIconWrap}>
            <Ionicons name="person-outline" size={16} color={colors.brand} />
          </View>
          <View style={styles.bannerBody}>
            <Text style={styles.bannerTitle}>Complete your profile</Text>
            <Text style={styles.bannerText}>Add date of birth, gender, and address to book sessions.</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={colors.brand} />
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
        <Pressable
          style={({ pressed }) => [styles.nextCard, pressed && styles.nextCardDim]}
          onPress={() =>
            navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: nextBooking._id } })
          }
        >
          <View style={styles.nextContent}>
            <Text style={styles.nextBadge}>NEXT SESSION</Text>
            <Text style={styles.nextDate}>{formatBookingDateAndSlot(nextBooking.date, nextBooking.timeSlot)}</Text>
            <Text style={styles.nextPhysio}>{nextBooking.physioId?.name || 'Physio TBD'}</Text>
          </View>
          <Ionicons name="arrow-forward-circle-outline" size={34} color="rgba(255,255,255,0.35)" />
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.bookCta, pressed && styles.dimmed]}
          onPress={() => navigation.navigate('PhysioList')}
        >
          <View style={styles.bookCtaIconWrap}>
            <Ionicons name="add-circle-outline" size={24} color={colors.brand} />
          </View>
          <View style={styles.bookCtaBody}>
            <Text style={styles.bookCtaTitle}>Book a session</Text>
            <Text style={styles.bookCtaSub}>Find a physio near you</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.brand} />
        </Pressable>
      )}

      {/* ── Stats ────────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statHead}>
            <Text style={styles.statLabel}>SESSIONS</Text>
            <View style={[styles.statIconBadge, { backgroundColor: colors.teal50 }]}>
              <Ionicons name="calendar-outline" size={12} color={colors.brand} />
            </View>
          </View>
          <Text style={styles.statNumber}>{totalSessions}</Text>
          <Text style={styles.statSub}>all time</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHead}>
            <Text style={styles.statLabel}>CARE SPEND</Text>
            <View style={[styles.statIconBadge, { backgroundColor: colors.emerald50 }]}>
              <Ionicons name="wallet-outline" size={12} color={colors.emerald700} />
            </View>
          </View>
          <Text style={styles.statMoney}>{formatInr(revenueTotal)}</Text>
          <Text style={styles.statSub}>held + released</Text>
        </View>
      </View>

      {/* ── Recent activity ───────────────────────── */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
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
        <Ionicons name="calendar-outline" size={14} color={colors.slate400} />
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
  scroll: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas },
  dimmed: { opacity: 0.75 },

  // ── Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  heroText: { flex: 1 },
  greeting: {
    fontFamily: font.bold,
    fontSize: type['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subGreeting: {
    marginTop: 2,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  avatarInitial: { fontFamily: font.bold, fontSize: type.md, color: colors.white },

  // ── Banners
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  bannerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.teal800 },
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
    borderRadius: 12,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  warningTxt: { flex: 1, fontFamily: font.medium, fontSize: type.sm, color: colors.amber800 },

  // ── Next session hero card
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: colors.brand,
    paddingVertical: 22,
    paddingHorizontal: 22,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 8,
  },
  nextCardDim: { opacity: 0.88 },
  nextContent: { flex: 1 },
  nextBadge: {
    fontFamily: font.bold,
    fontSize: type.xs,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  nextDate: {
    fontFamily: font.bold,
    fontSize: type['2xl'],
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  nextPhysio: {
    marginTop: 5,
    fontFamily: font.medium,
    fontSize: type.sm,
    color: 'rgba(255,255,255,0.72)',
  },

  // ── Book CTA (no upcoming session)
  bookCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  bookCtaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bookCtaBody: { flex: 1 },
  bookCtaTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.brand },
  bookCtaSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.sm, color: colors.teal800 },

  // ── Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
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
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 0.7,
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
    marginTop: 8,
    fontFamily: font.bold,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -1.5,
    lineHeight: 36,
  },
  statMoney: {
    marginTop: 8,
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

  // ── Section header
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  seeAll: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },

  // ── Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 7,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  emptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary },

  // ── Activity list
  activityList: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
  actRowPressed: { backgroundColor: colors.slate50 },
  actIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actBody: { flex: 1, minWidth: 0 },
  actDate: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  actPhysio: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  actRight: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
})
