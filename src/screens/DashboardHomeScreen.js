import { memo, useCallback, useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AttachStep } from 'react-native-spotlight-tour'
import { Ionicons } from '@expo/vector-icons'
import { useMyBookings, useMyDisputes, useProfile } from '../api/queries'
import { usePatientAppTour } from '../tour/usePatientAppTour'
import { formatBookingDateAndSlot, formatBookingTimeSlot } from '../utils/date'
import { bookingStatusBadge } from '../utils/dashboardUtils'
import { pickNextSession, todayYmd, normalizeSessionRows, listSameDaySiblings } from '../utils/physioBookingHelpers'
import { getTechniqueByIssue } from '../constants/techniques'
import Chip from '../components/ui/Chip'
import ServicesSection from '../components/ServicesSection'
import { DetailSkeleton } from '../components/ui/skeletons'
import { formatInr } from '../utils/currency'
import { colors } from '../theme/colors'
import { figmaTokens } from '../theme/figmaTokens'
import { font, type, leading } from '../theme/typography'

const BOOKING_PARAMS = { page: 1, limit: 100 }
const DISPUTE_PARAMS = { page: 1, limit: 20 }

function isBookingActive(b) {
  return b?.status !== 'completed' && b?.sessionStatus !== 'completed' && b?.paymentStatus !== 'refunded'
}

function isPlanActive(b) {
  if (!isBookingActive(b)) return false
  if (b?.planStatus === 'live' || b?.planStatus === 'approved') return true
  return ['plan_live', 'physio_assigned', 'payment_recorded', 'in_treatment'].includes(b?.workflowStatus)
}

function countsTowardSessionsLeft(b) {
  if (!isPlanActive(b)) return false
  if (isTechniqueBooking(b) && !b?.physioId) return false
  return true
}

function isTechniqueBooking(b) {
  return (
    b?.carePath === 'technique_managed' ||
    b?.carePath === 'technique_direct' ||
    Boolean(getTechniqueByIssue(b?.issue))
  )
}

function estimateOutstanding(b) {
  if (!isBookingActive(b)) return 0
  const fromSummary = Number(b?.paymentSummary?.outstanding)
  if (Number.isFinite(fromSummary)) return Math.max(0, fromSummary)
  const total = Number(b?.totalAmount) || 0
  if (total <= 0) return 0
  const paidStatuses = new Set(['paid', 'held', 'released', 'collected', 'verified'])
  if (paidStatuses.has(b?.paymentStatus)) return 0
  return total
}

function sessionsLeftOnBooking(b) {
  const rows = normalizeSessionRows(b).filter((r) => !r.complimentary)
  if (!rows.length) {
    if (!isBookingActive(b)) return 0
    return 1
  }
  return rows.filter((r) => r.status !== 'completed' && r.status !== 'no_show').length
}

function careAssigneeLabel(b) {
  if (b?.physioId?.name) return b.physioId.name
  if (b?.managerId?.name) return `${b.managerId.name} (care manager)`
  if (b?.managerId) return 'Care manager assigning…'
  return 'Awaiting care team'
}

function conditionLabel(b) {
  return String(b?.issue || '').trim() || null
}

export default function DashboardHomeScreen({ navigation }) {
  const { data: bookings, isLoading: bookingsLoading, isRefetching: bookingsRefetching, refetch: refetchBookings } = useMyBookings(BOOKING_PARAMS)
  const { data: disputesData, isLoading: disputesLoading, isRefetching: disputesRefetching, refetch: refetchDisputes } = useMyDisputes(DISPUTE_PARAMS)
  const { data: profile, isLoading: profileLoading, isRefetching: profileRefetching, refetch: refetchProfile } = useProfile()

  const ptRefreshing = bookingsRefetching || disputesRefetching || profileRefetching

  const onRefresh = useCallback(() => {
    refetchBookings()
    refetchDisputes()
    refetchProfile()
  }, [refetchBookings, refetchDisputes, refetchProfile])

  const loading = bookingsLoading || disputesLoading || profileLoading
  const needsProfile = !loading && !bookings && !disputesData

  const firstName = useMemo(() => {
    const raw = profile?.name?.trim()
    return raw ? raw.split(/\s+/)[0] : null
  }, [profile])

  const todayStr = useMemo(
    () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  )

  const openDisputes = useMemo(
    () => (disputesData?.rows || []).filter((d) => d.status === 'open' || d.status === 'under_review').length,
    [disputesData],
  )

  const today = useMemo(() => todayYmd(), [])
  const nextSession = useMemo(() => pickNextSession(bookings || [], today), [bookings, today])
  const isToday = nextSession && String(nextSession.row.date) === today

  const sameDaySiblings = useMemo(
    () => listSameDaySiblings(bookings || [], nextSession, today),
    [bookings, nextSession, today],
  )

  const activeBookings = useMemo(() => (bookings || []).filter(isBookingActive), [bookings])
  const inCare = Boolean(nextSession) || activeBookings.length > 0

  const sessionsLeft = useMemo(() => {
    const live = activeBookings.filter(countsTowardSessionsLeft)
    return live.reduce((sum, b) => sum + sessionsLeftOnBooking(b), 0)
  }, [activeBookings])

  const sessionsLeftLabel = useMemo(() => {
    const live = activeBookings.filter(countsTowardSessionsLeft)
    const carePlans = live.filter((b) => !isTechniqueBooking(b))
    const techniques = live.filter((b) => isTechniqueBooking(b))
    const careLeft = carePlans.reduce((sum, b) => sum + sessionsLeftOnBooking(b), 0)
    const techLeft = techniques.reduce((sum, b) => sum + sessionsLeftOnBooking(b), 0)
    if (carePlans.length && techniques.length) return `Care ${careLeft} · Technique ${techLeft}`
    if (carePlans.length === 1) return conditionLabel(carePlans[0]) || 'Care plan'
    if (carePlans.length > 1) return `${carePlans.length} care plans`
    if (techniques.length === 1) return conditionLabel(techniques[0]) || 'Technique'
    if (techniques.length > 1) return `${techniques.length} technique visits`
    return 'No active plan'
  }, [activeBookings])

  const amountDue = useMemo(
    () => (bookings || []).reduce((sum, b) => sum + estimateOutstanding(b), 0),
    [bookings],
  )

  const myCareList = useMemo(() => {
    const all = [...(bookings || [])]
    const byRecent = (a, b) =>
      String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
    const activePlans = all.filter(isPlanActive).sort(byRecent)
    if (activePlans.length >= 2) return activePlans.slice(0, 2)
    if (activePlans.length === 1) {
      const filler = all.filter((b) => !isPlanActive(b) && isBookingActive(b)).sort(byRecent)
      return [...activePlans, ...filler].slice(0, 2)
    }
    return all.filter(isBookingActive).sort(byRecent).slice(0, 2)
  }, [bookings])

  const heroAssignee = nextSession
    ? nextSession.booking.physioId?.name
      ? {
          name: nextSession.booking.physioId.name,
          detail: `${nextSession.booking.physioId.specialization || 'Verified Physiotherapist'} · ${
            nextSession.booking.serviceType === 'online' ? 'Online' : 'At Home'
          }`,
        }
      : nextSession.booking.managerId?.name
        ? {
            name: nextSession.booking.managerId.name,
            detail: 'Care manager · assigning your physiotherapist',
          }
        : {
            name: 'Care team assigning…',
            detail: nextSession.booking.serviceType === 'online' ? 'Online visit' : 'Home visit',
          }
    : null

  usePatientAppTour({ hasUpcomingBooking: Boolean(nextSession) })

  if (loading) {
    return (
      <View style={[styles.center, { justifyContent: 'flex-start' }]}>
        <View style={styles.ambientHeaderGlow} pointerEvents="none" />
        <View style={styles.ambientHeaderGlow2} pointerEvents="none" />
        <View style={{ flex: 1, padding: 16, width: '100%' }}>
          <DetailSkeleton />
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={ptRefreshing}
          onRefresh={onRefresh}
          colors={[colors.brand]}
          tintColor={colors.brand}
        />
      }
    >
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

      <AttachStep index={0}>
        <View style={styles.headerSection}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerGreeting}>
              Hi, {firstName || 'there'}
            </Text>
            <Text style={styles.headerTitle}>{todayStr}</Text>
          </View>
        </View>
      </AttachStep>

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
            <Text style={styles.bannerText}>Add date of birth, gender, and address to book appointments.</Text>
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

      {nextSession ? (
        <AttachStep index={1} fill>
          <View style={styles.nextCardContainer}>
            <Pressable
              style={({ pressed }) => [styles.nextCard, pressed && styles.nextCardDim]}
              onPress={() =>
                navigation.navigate('Bookings', {
                  screen: 'BookingDetail',
                  params: { id: nextSession.booking._id },
                })
              }
            >
              <View style={styles.cardGlowBubble1} />
              <View style={styles.cardGlowBubble2} />

              <View style={styles.nextHeaderRow}>
                <View style={styles.nextContent}>
                  <View style={styles.nextBadgeContainer}>
                    <Ionicons name="pulse" size={10} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.nextBadge}>UPCOMING SESSION</Text>
                  </View>
                  <Text style={styles.nextDate}>
                    {isToday
                      ? formatBookingTimeSlot(nextSession.row.time)
                      : formatBookingDateAndSlot(nextSession.row.date, nextSession.row.time)}
                    {conditionLabel(nextSession.booking)
                      ? ` (${conditionLabel(nextSession.booking)})`
                      : ''}
                  </Text>
                </View>
                <View style={styles.nextStatusIndicator}>
                  <View style={styles.nextStatusDot} />
                  <Text style={styles.nextStatusText}>{isToday ? 'Today' : 'Scheduled'}</Text>
                </View>
              </View>

              <View style={styles.nextDetailsBox}>
                <View style={styles.nextDocAvatar}>
                  <Ionicons name="person" size={16} color={figmaTokens.primary} />
                </View>
                <View style={styles.nextDocInfo}>
                  <Text style={styles.nextDocName}>{heroAssignee?.name}</Text>
                  <Text style={styles.nextDocSub}>{heroAssignee?.detail}</Text>
                </View>
              </View>
              <Text style={styles.nextHint}>
                Tap for details, notes, and payment
                {sameDaySiblings.length > 0
                  ? ` · +${sameDaySiblings.length} more visit${sameDaySiblings.length === 1 ? '' : 's'} this day`
                  : ''}
              </Text>
            </Pressable>
          </View>
        </AttachStep>
      ) : (
        <AttachStep index={1} fill>
          <Pressable
            style={({ pressed }) => [styles.bookCta, pressed && styles.dimmed]}
            onPress={() => navigation.navigate('PhysioList')}
          >
            <View style={styles.bookCtaIconWrap}>
              <Ionicons name="add-circle-outline" size={24} color={figmaTokens.primary} />
            </View>
            <View style={styles.bookCtaBody}>
              <Text style={styles.bookCtaTitle}>Book a home visit</Text>
              <Text style={styles.bookCtaSub}>Help is one tap away — verified physios near you</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={figmaTokens.primary} />
          </Pressable>
        </AttachStep>
      )}

      {sameDaySiblings.length > 0 ? (
        <View style={styles.sameDayBlock}>
          <Text style={styles.sameDayLabel}>Also {isToday ? 'today' : 'that day'}</Text>
          {sameDaySiblings.map((item) => {
            const technique = isTechniqueBooking(item.booking)
            return (
              <Pressable
                key={`${item.booking._id}-${item.row.sessionId || item.row.key || item.row.n}`}
                style={({ pressed }) => [styles.sameDayCard, pressed && styles.dimmed]}
                onPress={() =>
                  navigation.navigate('Bookings', {
                    screen: 'BookingDetail',
                    params: { id: item.booking._id },
                  })
                }
              >
                <View style={styles.sameDayBody}>
                  <View style={styles.actTitleRow}>
                    <View style={[styles.typeBadge, technique ? styles.typeBadgeTech : styles.typeBadgeCare]}>
                      <Text
                        style={[
                          styles.typeBadgeTxt,
                          technique ? styles.typeBadgeTxtTech : styles.typeBadgeTxtCare,
                        ]}
                      >
                        {technique ? 'Technique' : 'Care plan'}
                      </Text>
                    </View>
                    <Text style={styles.sameDayDate} numberOfLines={2}>
                      {formatBookingDateAndSlot(item.row.date, item.row.time)}
                      {conditionLabel(item.booking) ? ` (${conditionLabel(item.booking)})` : ''}
                    </Text>
                  </View>
                  <Text style={styles.actPhysio} numberOfLines={1}>
                    {careAssigneeLabel(item.booking)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.slate300} />
              </Pressable>
            )
          })}
        </View>
      ) : null}

      {inCare ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Sessions left</Text>
            <Text style={styles.statNumber}>{sessionsLeft}</Text>
            <Text style={styles.statSub}>{sessionsLeftLabel}</Text>
          </View>
          <View style={styles.statCard}>
            {amountDue > 0.009 ? (
              <>
                <Text style={styles.statLabel}>Amount due</Text>
                <Text style={styles.statMoney}>{formatInr(amountDue)}</Text>
                <Text style={styles.statSub}>Across open cases</Text>
              </>
            ) : (
              <>
                <Text style={styles.statLabel}>Payment</Text>
                <Text style={[styles.statMoney, { color: colors.teal700 || figmaTokens.primary }]}>On track</Text>
                <Text style={styles.statSub}>Nothing due right now</Text>
              </>
            )}
          </View>
        </View>
      ) : null}

      {inCare ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My care</Text>
            <Pressable onPress={() => navigation.navigate('Bookings')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {myCareList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={28} color={colors.slate300} />
              <Text style={styles.emptyTitle}>No care cases yet</Text>
              <Text style={styles.emptySub}>Your visits and plans will appear here</Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {myCareList.map((item, index) => (
                <ActivityRow
                  key={item._id}
                  item={item}
                  isLast={index === myCareList.length - 1}
                  onPress={() =>
                    navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: item._id } })
                  }
                />
              ))}
            </View>
          )}

          <ServicesSection
            navigation={navigation}
            title="Need something else?"
            intro="Add cupping, needling, or a new concern — your care team can help."
          />
        </>
      ) : (
        <>
          <ServicesSection navigation={navigation} />

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My care</Text>
            <Pressable onPress={() => navigation.navigate('Bookings')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {myCareList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={28} color={colors.slate300} />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySub}>Book a visit and your history will show up here</Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {myCareList.map((item, index) => (
                <ActivityRow
                  key={item._id}
                  item={item}
                  isLast={index === myCareList.length - 1}
                  onPress={() =>
                    navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: item._id } })
                  }
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

const ActivityRow = memo(function ActivityRow({ item, onPress, isLast }) {
  const st = bookingStatusBadge(item.status, item.sessionStatus, item.paymentStatus, item.planStatus)
  const technique = isTechniqueBooking(item)
  const condition = conditionLabel(item)
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
        <View style={styles.actTitleRow}>
          <View style={[styles.typeBadge, technique ? styles.typeBadgeTech : styles.typeBadgeCare]}>
            <Text style={[styles.typeBadgeTxt, technique ? styles.typeBadgeTxtTech : styles.typeBadgeTxtCare]}>
              {technique ? 'Technique' : 'Care plan'}
            </Text>
          </View>
          <Text style={styles.actDate} numberOfLines={1}>
            {formatBookingDateAndSlot(item.date, item.timeSlot)}
            {condition ? ` (${condition})` : ''}
          </Text>
        </View>
        <Text style={styles.actPhysio} numberOfLines={1}>{careAssigneeLabel(item)}</Text>
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
    alignSelf: 'stretch',
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
    width: '100%',
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
  nextContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
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
  nextHint: {
    marginTop: 10,
    fontFamily: font.medium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    zIndex: 2,
  },
  sameDayBlock: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
    zIndex: 1,
  },
  sameDayLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  sameDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(240, 253, 250, 0.9)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  sameDayBody: { flex: 1, minWidth: 0 },
  sameDayDate: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
    flexShrink: 1,
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
    alignSelf: 'stretch',
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
  actTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  typeBadgeTech: {
    backgroundColor: '#fff7ed',
    borderColor: 'rgba(251, 146, 60, 0.35)',
  },
  typeBadgeCare: {
    backgroundColor: '#f0fdfa',
    borderColor: 'rgba(13, 148, 136, 0.3)',
  },
  typeBadgeTxt: {
    fontFamily: font.bold,
    fontSize: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  typeBadgeTxtTech: { color: '#9a3412' },
  typeBadgeTxtCare: { color: '#0f766e' },
  actDate: { fontFamily: font.bold, fontSize: type.sm, color: colors.textPrimary, flexShrink: 1 },
  actPhysio: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  actRight: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
})
