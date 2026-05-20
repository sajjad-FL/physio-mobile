import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
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

export default function PublicPhysicianScreen({ route, navigation }) {
  const { id } = route.params || {}
  const [physio, setPhysio] = useState(null)
  const [reviews, setReviews] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [error, setError] = useState('')

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
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load profile')
      setPhysio(null)
      setReviews([])
    } finally {
      setLoading(false)
      setReviewsLoading(false)
    }
  }, [id])

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
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

  const avg = Number(physio.avgRating) || 0
  const total = Number(physio.totalReviews) || 0
  const avatarSrc = assetUrl(physio.avatar)
  const feeLabel = physio.feePerSession != null ? `₹${physio.feePerSession}` : '—'

  return (
    <Screen style={styles.root} contentStyle={styles.scroll}>
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

      <View style={styles.reviewsSection}>
        <Text style={styles.reviewsTitle}>Reviews</Text>
        <Text style={styles.reviewsSub}>Feedback from verified patients after completed sessions.</Text>

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
                          style={styles.reviewStarIcon}
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
              onPrev={handlePrevPage}
              onNext={handleNextPage}
            />
          </View>
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.canvas, padding: 20 },
  errorTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary, textAlign: 'center' },
  backBtn: { marginTop: 8, paddingHorizontal: 20 },

  profileCard: {
    backgroundColor: colors.white,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
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

  reviewsSection: { marginTop: 4 },
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
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewStarIcon: {},
  reviewComment: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, marginTop: 8, lineHeight: leading.sm },
  reviewDate: { fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary, marginTop: 6 },
})
