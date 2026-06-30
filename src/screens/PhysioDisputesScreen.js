import { memo, useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import Chip from '../components/ui/Chip'
import PaginationBar from '../components/ui/PaginationBar'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { formatBookingDateAndSlot } from '../utils/date'
import { disputeStatusBadge } from '../utils/dashboardUtils'

function statusAccent(status) {
  if (status === 'open') return colors.warning
  if (status === 'under_review') return colors.blue600
  if (status === 'resolved') return colors.success
  return colors.slate300
}

export default function PhysioDisputesScreen() {
  const [list, setList] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/disputes/my', { params: { page, limit: 8 } })
      setList(res.data?.data || [])
      setTotalPages(res.data?.totalPages || 1)
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load disputes' })
      setList([])
    }
  }, [page])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useEffect(() => { load() }, [load])

  const loading = list === null

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.ambientHeaderGlow} />
        <View style={styles.ambientHeaderGlow2} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.ambientHeaderGlow} />
      <View style={styles.ambientHeaderGlow2} />
      <FlatList
      data={list}
      keyExtractor={(item) => String(item._id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.brand]}
          tintColor={colors.brand}
        />
      }
      style={styles.root}
      contentContainerStyle={list.length === 0 ? styles.emptyPad : styles.listPad}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="checkmark-circle-outline" size={32} color={colors.slate300} />
          </View>
          <Text style={styles.emptyTitle}>No disputes</Text>
          <Text style={styles.emptySub}>Disputes linked to your assigned bookings will appear here.</Text>
        </View>
      }
      ListFooterComponent={
        list.length > 0 ? (
          <PaginationBar
            compact
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        ) : null
      }
      renderItem={({ item }) => <DisputeCard item={item} />}
    />
    </View>
  )
}

const DisputeCard = memo(function DisputeCard({ item }) {
  const chip = disputeStatusBadge(item.status)
  const accent = statusAccent(item.status)
  const b = item.bookingId
  const bookingRef = b?._id ? `#${String(b._id).slice(-6)}` : ''
  const bookingDate = formatBookingDateAndSlot(b?.date, b?.timeSlot)
  const raisedByTxt = item.raisedBy === 'physio' ? 'You raised' : 'Patient raised'

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Chip label={chip.label} bg={chip.bg} fg={chip.fg} border={chip.border} />
          <View style={styles.cardMeta}>
            {bookingRef ? <Text style={styles.metaTxt}>{bookingRef}</Text> : null}
            <View style={styles.raisedByTag}>
              <Text style={styles.raisedByTxt}>{raisedByTxt}</Text>
            </View>
          </View>
        </View>

        {bookingDate ? (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.slate400} />
            <Text style={styles.dateTxt}>{bookingDate}</Text>
            {b?.userId?.name ? (
              <>
                <Text style={styles.dateSep}>·</Text>
                <Ionicons name="person-outline" size={12} color={colors.slate400} />
                <Text style={styles.dateTxt}>{b.userId.name}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.reason}>{item.reason || 'Dispute'}</Text>

        {item.description && item.description !== item.reason ? (
          <Text style={styles.desc}>{item.description}</Text>
        ) : null}

        {item.resolution ? (
          <View style={styles.resolutionBox}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={styles.resolutionTxt}>{item.resolution}</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  listPad: { padding: 16, paddingBottom: 28, gap: 10 },
  emptyPad: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },

  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  emptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary, textAlign: 'center', lineHeight: leading.sm },

  // Dispute card
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: 'rgba(240, 253, 250, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    overflow: 'hidden',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14, gap: 8 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  raisedByTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  raisedByTxt: { fontFamily: font.medium, fontSize: 10, color: colors.textSecondary },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateTxt: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  dateSep: { fontFamily: font.regular, fontSize: type.xs, color: colors.slate300 },

  reason: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },
  desc: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.slate600,
    lineHeight: leading.sm,
  },

  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(236, 253, 245, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  resolutionTxt: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.emerald700,
    lineHeight: leading.xs,
  },

  // New backgrounds/glows
  container: {
    flex: 1,
    backgroundColor: '#e8f8f6',
    position: 'relative',
    overflow: 'hidden',
  },
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
})
