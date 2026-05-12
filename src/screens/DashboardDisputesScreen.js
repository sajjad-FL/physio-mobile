import { memo, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatBookingDateAndSlot } from '../utils/date'
import Chip from '../components/ui/Chip'
import PaginationBar from '../components/ui/PaginationBar'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { disputeStatusBadge } from '../utils/dashboardUtils'
import { useMyDisputes } from '../api/queries'

function statusAccent(status) {
  if (status === 'open') return colors.warning
  if (status === 'under_review') return colors.blue600
  if (status === 'resolved') return colors.success
  return colors.slate300
}

export default function DashboardDisputesScreen() {
  const [page, setPage] = useState(1)
  const { data, isLoading, refetch } = useMyDisputes({ page, limit: 8 })
  const rows = data?.rows || []
  const totalPages = data?.totalPages || 1

  if (isLoading && !rows.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => String(item._id)}
      onRefresh={refetch}
      refreshing={false}
      style={styles.root}
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
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        ) : null
      }
      renderItem={({ item }) => <DisputeCard item={item} />}
    />
  )
}

const DisputeCard = memo(function DisputeCard({ item }) {
  const chip = disputeStatusBadge(item.status)
  const accent = statusAccent(item.status)
  const bookingRef = item.bookingId?._id ? `#${String(item.bookingId._id).slice(-6)}` : ''
  const bookingDate = formatBookingDateAndSlot(item.bookingId?.date, item.bookingId?.timeSlot)

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Chip label={chip.label} bg={chip.bg} fg={chip.fg} border={chip.border} />
          {bookingRef ? (
            <Text style={styles.bookingRef}>{bookingRef}</Text>
          ) : null}
        </View>

        {bookingDate ? (
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.slate400} />
            <Text style={styles.metaTxt}>{bookingDate}</Text>
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
  root: { flex: 1, backgroundColor: colors.canvas },
  listPad: { padding: 16, paddingBottom: 28, gap: 10 },
  emptyPad: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas },

  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  emptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary, textAlign: 'center' },

  // Dispute card
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14, gap: 8 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bookingRef: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },

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
    backgroundColor: colors.successBg,
  },
  resolutionTxt: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.emerald700,
    lineHeight: leading.xs,
  },
})
