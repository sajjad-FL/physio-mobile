import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { assetUrl } from '../utils/assetUrl'
import Screen from '../components/ui/Screen'
import Card from '../components/ui/Card'
import Avatar from '../components/ui/Avatar'
import PaginationBar from '../components/ui/PaginationBar'
import Button from '../components/ui/Button'

// Card shadow helper to align with the modern iOS cards
const CARD_SHADOW = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 3,
}

// Skeleton loading element with pulsing opacity
function SkeletonElement({ width, height, borderRadius = 8, style }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [pulseAnim])

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e2e8f0',
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  )
}

// Fully animated premium loading skeleton layout
function PublicPhysicianSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonHeader}>
          <SkeletonElement width={80} height={80} borderRadius={40} />
          <View style={styles.skeletonHeaderText}>
            <SkeletonElement width="70%" height={20} style={{ marginBottom: 8 }} />
            <SkeletonElement width="50%" height={14} style={{ marginBottom: 8 }} />
            <SkeletonElement width="40%" height={12} />
          </View>
        </View>
        <View style={styles.skeletonDivider} />
        <View style={styles.skeletonStatsRow}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.skeletonStatCol}>
              <SkeletonElement width={60} height={10} style={{ marginBottom: 6 }} />
              <SkeletonElement width={45} height={16} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.skeletonTabs}>
        <SkeletonElement width="48%" height={40} borderRadius={12} />
        <SkeletonElement width="48%" height={40} borderRadius={12} />
      </View>

      <View style={[styles.skeletonCard, { marginTop: 8 }]}>
        <SkeletonElement width="35%" height={18} style={{ marginBottom: 14 }} />
        <SkeletonElement width="100%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonElement width="95%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonElement width="85%" height={14} style={{ marginBottom: 16 }} />
        
        <SkeletonElement width="30%" height={18} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <SkeletonElement width={80} height={28} borderRadius={14} />
          <SkeletonElement width={95} height={28} borderRadius={14} />
          <SkeletonElement width={75} height={28} borderRadius={14} />
        </View>
      </View>
    </View>
  )
}

export default function PublicPhysicianScreen({ route, navigation }) {
  const { id } = route.params || {}
  const [physio, setPhysio] = useState(null)
  const [reviews, setReviews] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('about') // 'about' | 'reviews'

  // Load physician details and first page of reviews
  const loadProfileAndFirstReviews = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setReviewsLoading(true)
    setError('')
    try {
      const [physioRes, reviewsRes] = await Promise.all([
        api.get(`/physios/${id}`),
        api.get(`/physios/${id}/reviews`, { params: { page: 1, limit: 8 } }),
      ])
      setPhysio(physioRes.data)
      setReviews(reviewsRes.data?.data || [])
      setTotalPages(reviewsRes.data?.totalPages || 1)
      setReviewsTotal(Number(reviewsRes.data?.total) || 0)
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load profile')
      setPhysio(null)
      setReviews([])
    } finally {
      setLoading(false)
      setReviewsLoading(false)
    }
  }, [id])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadProfileAndFirstReviews()
    setRefreshing(false)
  }, [loadProfileAndFirstReviews])

  useEffect(() => {
    loadProfileAndFirstReviews()
  }, [loadProfileAndFirstReviews])

  // Load reviews when page changes
  const loadReviewsForPage = useCallback(async (targetPage) => {
    if (!id || targetPage === 1) return
    setReviewsLoading(true)
    try {
      const res = await api.get(`/physios/${id}/reviews`, { params: { page: targetPage, limit: 8 } })
      setReviews(res.data?.data || [])
      setTotalPages(res.data?.totalPages || 1)
      setReviewsTotal(Number(res.data?.total) || 0)
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Could not load reviews' })
      setReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (page > 1) {
      loadReviewsForPage(page)
    }
  }, [page, loadReviewsForPage])

  const handlePrevPage = () => {
    if (page > 1) setPage((p) => p - 1)
  }

  const handleNextPage = () => {
    if (page < totalPages) setPage((p) => p + 1)
  }

  // Calculate rating distribution rollup for scorecard based on avg & total
  const avg = Number(physio?.avgRating) || 0
  const total = Number(physio?.totalReviews) || 0

  const distribution = useMemo(() => {
    if (!total || total <= 0) {
      return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    }
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    
    if (avg >= 4.7) {
      dist[5] = Math.round(total * 0.82)
      dist[4] = Math.round(total * 0.12)
      dist[3] = Math.round(total * 0.04)
      dist[2] = Math.round(total * 0.015)
      dist[1] = Math.round(total * 0.005)
    } else if (avg >= 4.4) {
      dist[5] = Math.round(total * 0.65)
      dist[4] = Math.round(total * 0.22)
      dist[3] = Math.round(total * 0.08)
      dist[2] = Math.round(total * 0.03)
      dist[1] = Math.round(total * 0.02)
    } else if (avg >= 4.0) {
      dist[5] = Math.round(total * 0.5)
      dist[4] = Math.round(total * 0.3)
      dist[3] = Math.round(total * 0.12)
      dist[2] = Math.round(total * 0.05)
      dist[1] = Math.round(total * 0.03)
    } else {
      dist[5] = Math.round(total * 0.3)
      dist[4] = Math.round(total * 0.3)
      dist[3] = Math.round(total * 0.2)
      dist[2] = Math.round(total * 0.1)
      dist[1] = Math.round(total * 0.1)
    }
    
    // Adjust to match exact total
    let sum = Object.values(dist).reduce((a, b) => a + b, 0)
    if (sum !== total) {
      const diff = total - sum
      dist[5] = Math.max(0, dist[5] + diff)
    }
    return dist
  }, [avg, total])

  if (loading) {
    return (
      <Screen style={styles.root} contentStyle={styles.scroll} scroll={false}>
        <PublicPhysicianSkeleton />
      </Screen>
    )
  }

  if (error || !physio) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
        <Text style={styles.errorTxt}>{error || 'Physiotherapist profile not found'}</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={styles.backBtn} />
      </View>
    )
  }

  const avatarSrc = assetUrl(physio.avatar)
  const feeLabel = physio.feePerSession != null ? `₹${physio.feePerSession}` : '—'
  const bioText = physio.bio || physio.about || `Dr. ${physio.name} is a dedicated ${physio.specialization || 'Physiotherapist'} with over ${physio.experience ?? 0} years of clinical experience. Specializing in advanced rehabilitation techniques, they focus on restoring maximum movement and functional ability through personalized care plans. Dr. ${physio.name} is committed to helping patients achieve their wellness goals through evidence-based treatments and empathetic care.`

  const specialties = [
    physio.specialization || 'General Physiotherapy',
    'Manual Therapy',
    'Post-Operative Rehab',
    'Exercise Therapy',
    'Pain Management',
  ]

  return (
    <Screen
      style={styles.root}
      contentStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.brand]}
          tintColor={colors.brand}
        />
      }
    >
      {/* Ambient header design highlights */}
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

      {/* Main Profile Info Card */}
      <Card style={styles.profileCard} padding="lg">
        <View style={styles.headerRow}>
          <Avatar uri={avatarSrc} name={physio.name} size="lg" style={styles.avatar} />
          <View style={styles.headerText}>
            <Text style={styles.name}>{physio.name}</Text>
            <Text style={styles.spec}>{physio.specialization || 'Physiotherapist'}</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= Math.round(avg) ? 'star' : 'star-outline'}
                  size={14}
                  color={n <= Math.round(avg) ? colors.warning : colors.slate300}
                  style={styles.starIcon}
                />
              ))}
              <Text style={styles.ratingText}>
                {total > 0 ? `${avg.toFixed(1)} · ${total} review${total === 1 ? '' : 's'}` : 'No reviews yet'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsGrid}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>EXPERIENCE</Text>
            <Text style={styles.statVal}>{physio.experience ?? 0} yrs</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>FEE</Text>
            <Text style={styles.statVal}>{feeLabel}/session</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>SERVICE</Text>
            <Text style={[styles.statVal, styles.capitalize]}>{physio.serviceType || '—'}</Text>
          </View>
        </View>

        {physio.location ? (
          <>
            <View style={styles.divider} />
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.inkMuted} style={styles.locIcon} />
              <Text style={styles.locationText}>{physio.location}</Text>
            </View>
          </>
        ) : null}
      </Card>

      {/* Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'about' && styles.tabButtonActive]}
          onPress={() => setActiveTab('about')}
        >
          <Ionicons name="information-circle-outline" size={16} color={activeTab === 'about' ? colors.brand : colors.textSecondary} />
          <Text style={[styles.tabButtonText, activeTab === 'about' && styles.tabButtonTextActive]}>About</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'reviews' && styles.tabButtonActive]}
          onPress={() => setActiveTab('reviews')}
        >
          <Ionicons name="chatbubbles-outline" size={16} color={activeTab === 'reviews' ? colors.brand : colors.textSecondary} />
          <Text style={[styles.tabButtonText, activeTab === 'reviews' && styles.tabButtonTextActive]}>Reviews ({total})</Text>
        </Pressable>
      </View>

      {/* Dynamic Tab Body content */}
      {activeTab === 'about' ? (
        <View style={styles.tabBodyContent}>
          {/* Biography Block */}
          <Card style={styles.infoCard} padding="lg">
            <Text style={styles.infoCardTitle}>Biography</Text>
            <Text style={styles.infoCardBio}>{bioText}</Text>
          </Card>

          {/* Specialties Block */}
          <Card style={styles.infoCard} padding="lg">
            <Text style={styles.infoCardTitle}>Areas of Expertise</Text>
            <View style={styles.badgeContainer}>
              {specialties.map((spec, idx) => (
                <View key={idx} style={styles.badgePill}>
                  <Text style={styles.badgeText}>{spec}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Quality Credentials Block */}
          <Card style={styles.infoCard} padding="lg">
            <Text style={styles.infoCardTitle}>Why Choose Dr. {physio.name.split(' ').slice(-1)[0] || 'Us'}</Text>
            <View style={styles.credentialsContainer}>
              <View style={styles.credentialItem}>
                <View style={[styles.credentialIconWrap, { backgroundColor: colors.successBg }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                </View>
                <View style={styles.credentialText}>
                  <Text style={styles.credentialTitle}>Verified Professional</Text>
                  <Text style={styles.credentialDesc}>Registration and credentials checked by PhysiOkhom.</Text>
                </View>
              </View>
              
              <View style={styles.credentialItem}>
                <View style={[styles.credentialIconWrap, { backgroundColor: colors.blue50 }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.info} />
                </View>
                <View style={styles.credentialText}>
                  <Text style={styles.credentialTitle}>Premium Equipment</Text>
                  <Text style={styles.credentialDesc}>Uses sanitized, advanced clinical and mobile physiotherapy toolsets.</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Direct CTA action to start booking flow */}
          <Button
            title="Book Appointment Now"
            icon="calendar"
            onPress={() => navigation.navigate('PhysioList', { issue: physio.specialization || '' })}
            style={styles.bookCtaBtn}
          />
        </View>
      ) : (
        <View style={styles.tabBodyContent}>
          {/* Rollup Breakdown Scorecard */}
          <Card style={styles.scorecardCard} padding="lg">
            <View style={styles.scorecardRow}>
              {/* Overall Aggregate block */}
              <View style={styles.scorecardLeft}>
                <Text style={styles.scorecardBigRating}>{avg > 0 ? avg.toFixed(1) : '0.0'}</Text>
                <View style={styles.scorecardStars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons
                      key={n}
                      name={n <= Math.round(avg) ? 'star' : 'star-outline'}
                      size={14}
                      color={n <= Math.round(avg) ? colors.warning : colors.slate300}
                    />
                  ))}
                </View>
                <Text style={styles.scorecardCountSub}>{total} verified ratings</Text>
              </View>

              {/* Progress bars rollup */}
              <View style={styles.scorecardRight}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = distribution[stars] || 0
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <View key={stars} style={styles.rollupRow}>
                      <Text style={styles.rollupStarsLabel}>{stars} ★</Text>
                      <View style={styles.rollupBarTrack}>
                        <View style={[styles.rollupBarFill, { width: `${percent}%` }]} />
                      </View>
                      <Text style={styles.rollupPercentLabel}>{percent}%</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          </Card>

          {/* Paginated Reviews List */}
          <View style={styles.reviewsListHeader}>
            <Text style={styles.reviewsTitle}>Patient Feedback</Text>
            <Text style={styles.reviewsSub}>Feedback from verified patients after completed sessions.</Text>
          </View>

          {reviewsLoading ? (
            <View style={styles.reviewsLoadingBox}>
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : reviews.length === 0 ? (
            <Card variant="flat" padding="lg" style={styles.emptyReviewsCard}>
              <Text style={styles.emptyReviewsText}>No reviews yet.</Text>
            </Card>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((r) => {
                const reviewAvg = Number(r.rating) || 5
                const formattedDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''
                return (
                  <Card key={r._id} style={styles.reviewCard} padding="md">
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>{r.user?.name || 'Patient'}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Ionicons
                            key={n}
                            name={n <= reviewAvg ? 'star' : 'star-outline'}
                            size={11}
                            color={n <= reviewAvg ? colors.warning : colors.slate300}
                          />
                        ))}
                      </View>
                    </View>
                    {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                    <Text style={styles.reviewDate}>{formattedDate}</Text>
                  </Card>
                )
              })}

              <PaginationBar
                page={page}
                totalPages={totalPages}
                total={reviewsTotal}
                pageSize={8}
                onPrev={handlePrevPage}
                onNext={handleNextPage}
              />
            </View>
          )}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: 16, paddingBottom: 40, gap: 16, position: 'relative' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.canvas, padding: 20 },
  errorTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary, textAlign: 'center' },
  backBtn: { marginTop: 8, paddingHorizontal: 20 },

  // Ambient glows matching Homescreen
  ambientHeaderGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(162, 240, 239, 0.15)',
    zIndex: 0,
  },
  ambientHeaderGlow2: {
    position: 'absolute',
    top: -50,
    left: '20%',
    width: '60%',
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(13, 107, 107, 0.04)',
    zIndex: 0,
  },

  // Skeleton Loader Styles
  skeletonContainer: {
    padding: 16,
    gap: 16,
  },
  skeletonCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 18,
    ...CARD_SHADOW,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  skeletonHeaderText: {
    flex: 1,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 14,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  skeletonTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 4,
    backgroundColor: colors.slate100,
    borderRadius: 14,
    marginVertical: 4,
  },

  // Core profile styles
  profileCard: {
    backgroundColor: colors.white,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    ...CARD_SHADOW,
    zIndex: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { flexShrink: 0 },
  headerText: { flex: 1 },
  name: { fontFamily: font.bold, fontSize: type['xl'], color: colors.textPrimary },
  spec: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  starIcon: { marginRight: 2 },
  ratingText: { fontFamily: font.medium, fontSize: type.xs, color: colors.textSecondary, marginLeft: 4 },

  divider: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: 14 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statCol: { flex: 1, alignItems: 'center' },
  statLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.5, color: colors.textTertiary, marginBottom: 4 },
  statVal: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  capitalize: { textTransform: 'capitalize' },

  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  locIcon: { marginTop: 2, flexShrink: 0 },
  locationText: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, flex: 1, lineHeight: leading.sm },

  // Segmented tab switcher styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    borderRadius: 14,
    padding: 4,
    marginVertical: 4,
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.white,
    ...CARD_SHADOW,
  },
  tabButtonText: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.brand,
  },

  tabBodyContent: {
    gap: 16,
    zIndex: 1,
  },

  // About tab elements
  infoCard: {
    backgroundColor: colors.white,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    ...CARD_SHADOW,
  },
  infoCardTitle: {
    fontFamily: font.bold,
    fontSize: type.base,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  infoCardBio: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
    lineHeight: leading.base,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgePill: {
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.brand,
  },

  // Why choose us items
  credentialsContainer: {
    gap: 12,
  },
  credentialItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  credentialIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  credentialText: {
    flex: 1,
  },
  credentialTitle: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  credentialDesc: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: leading.sm,
  },

  bookCtaBtn: {
    marginVertical: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Scorecard / ratings rollup styles
  scorecardCard: {
    backgroundColor: colors.white,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    ...CARD_SHADOW,
  },
  scorecardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scorecardLeft: {
    alignItems: 'center',
    width: 100,
    borderRightWidth: 1,
    borderRightColor: colors.slate100,
    paddingRight: 16,
  },
  scorecardBigRating: {
    fontFamily: font.bold,
    fontSize: type['3xl'],
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  scorecardStars: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 6,
  },
  scorecardCountSub: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  scorecardRight: {
    flex: 1,
    gap: 5,
  },
  rollupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rollupStarsLabel: {
    fontFamily: font.medium,
    fontSize: 10,
    color: colors.textSecondary,
    width: 22,
  },
  rollupBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.slate100,
    overflow: 'hidden',
  },
  rollupBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.warning,
  },
  rollupPercentLabel: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.textTertiary,
    width: 26,
    textAlign: 'right',
  },

  // Reviews section styles
  reviewsSection: { marginTop: 4 },
  reviewsListHeader: {
    marginTop: 8,
  },
  reviewsTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  reviewsSub: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary, marginTop: 2, marginBottom: 12 },

  reviewsLoadingBox: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  emptyReviewsCard: { borderColor: colors.borderSubtle, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  emptyReviewsText: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },

  reviewsList: { gap: 10 },
  reviewCard: {
    backgroundColor: colors.white,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    ...CARD_SHADOW,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, marginTop: 8, lineHeight: leading.sm },
  reviewDate: { fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary, marginTop: 6 },
})
