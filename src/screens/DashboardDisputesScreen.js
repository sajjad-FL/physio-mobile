import { memo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatBookingDateAndSlot } from '../utils/date'
import { bookingCodeBadge, resolveBookingDisplayVisit } from '../utils/bookingDisplay'
import Chip from '../components/ui/Chip'
import PaginationBar from '../components/ui/PaginationBar'
import { ListSkeleton } from '../components/ui/skeletons'
import { colors } from '../theme/colors'
import { figmaTokens } from '../theme/figmaTokens'
import { font, type, leading } from '../theme/typography'
import { disputeStatusBadge, paymentBadge } from '../utils/dashboardUtils'
import { useMyDisputes } from '../api/queries'

function statusAccent(status) {
  if (status === 'open') return colors.warning
  if (status === 'under_review') return colors.blue600
  if (status === 'resolved') return colors.success
  return colors.slate300
}

export default function DashboardDisputesScreen({ navigation }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isRefetching, refetch } = useMyDisputes({ page, limit: 8 })
  const rows = data?.rows || []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  if (isLoading && !rows.length) {
    return (
      <View style={[styles.root, { padding: 16 }]}>
        <ListSkeleton count={5} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* Ambient Top Background Halo Glow */}
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item._id)}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
        contentContainerStyle={rows.length === 0 ? styles.emptyPad : styles.listPad}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.slate300} />
            </View>
            <Text style={styles.emptyTitle}>No disputes</Text>
            <Text style={styles.emptySub}>Any disputes you raise will appear here.</Text>
          </View>
        }
        ListFooterComponent={
          rows.length > 0 ? (
            <PaginationBar
              compact
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={8}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          ) : null
        }
        renderItem={({ item }) => <DisputeCard item={item} navigation={navigation} />}
      />
    </View>
  )
}

const DisputeCard = memo(function DisputeCard({ item, navigation }) {
  const chip = disputeStatusBadge(item.status)
  const accent = statusAccent(item.status)
  const pay = item.bookingId?.paymentStatus ? paymentBadge(item.bookingId.paymentStatus) : null
  const bookingRef = bookingCodeBadge(item.bookingId) || ''
  const booking = item.bookingId && typeof item.bookingId === 'object' ? item.bookingId : null
  const visit = booking ? resolveBookingDisplayVisit(booking) : { date: item.bookingId?.date, time: item.bookingId?.timeSlot }
  const bookingDate = formatBookingDateAndSlot(visit.date, visit.time)
  const raisedBy =
    item.raisedBy === 'physio' ? 'Raised by physiotherapist' : 'Raised by you'
  const bookingId = item.bookingId?._id

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.badgeRow}>
          <Chip label={chip.label} bg={chip.bg} fg={chip.fg} border={chip.border} />
          {pay ? (
            <Chip label={pay.label} bg={pay.bg} fg={pay.fg} border={pay.border} />
          ) : null}
        </View>

        <Text style={styles.reason}>{item.reason || 'Dispute'}</Text>

        <Text style={styles.metaLine}>
          {bookingRef ? `Booking ${bookingRef}` : 'Booking —'}
          {' · '}
          {raisedBy}
        </Text>

        {bookingDate ? (
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color={figmaTokens.primary} />
            <Text style={styles.metaTxt}>{bookingDate}</Text>
          </View>
        ) : null}

        {item.description && item.description !== item.reason ? (
          <Text style={styles.desc}>{item.description}</Text>
        ) : null}

        {item.resolution ? (
          <View style={styles.resolutionBox}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={styles.resolutionTxt}>{item.resolution}</Text>
          </View>
        ) : null}

        {bookingId ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.viewBookingBtn, pressed && { opacity: 0.7 }]}
            onPress={() =>
              navigation.navigate('Bookings', {
                screen: 'BookingDetail',
                params: { id: String(bookingId) },
              })
            }
          >
            <Text style={styles.viewBookingTxt}>View booking</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.brand} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  listPad: { padding: 16, paddingBottom: 28, gap: 10 },
  emptyPad: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas },

  emptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textSecondary },
  emptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary, textAlign: 'center' },

  // Dispute card
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 16, gap: 8, zIndex: 2 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  metaLine: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textSecondary,
    lineHeight: leading.xs,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontFamily: font.medium, fontSize: type.xs, color: colors.textSecondary },

  reason: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  desc: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.slate600,
    lineHeight: leading.sm,
  },

  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.12)',
  },
  resolutionTxt: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.emerald700,
    lineHeight: leading.xs,
  },
  viewBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  viewBookingTxt: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.brand,
  },

  // Ambient Header glows
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
