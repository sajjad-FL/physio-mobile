import { memo, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatBookingDateAndSlot } from '../utils/date'
import { bookingStatusBadge } from '../utils/dashboardUtils'
import PatientBookingsFilterModal from '../components/dashboard/PatientBookingsFilterModal'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import { ListSkeleton } from '../components/ui/skeletons'
import { colors } from '../theme/colors'
import { figmaTokens } from '../theme/figmaTokens'
import { surfaceCard } from '../theme/surfaceCard'
import { font, type } from '../theme/typography'
import { matchesPatientBookingFilter, patientFilterSummary, sortPatientBookingsLatestFirst, todayYmd } from '../utils/patientBookingFilters'
import { formatInr } from '../utils/currency'
import { useMyBookings } from '../api/queries'

export default function DashboardBookingsScreen({ navigation }) {
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filterOpen, setFilterOpen] = useState(false)
  const { data, isLoading, isRefetching, refetch } = useMyBookings({ page: 1, limit: 100 })
  const rows = data || []

  const filtered = useMemo(() => {
    const today = todayYmd()
    const matched = rows.filter((b) => matchesPatientBookingFilter(b, { filter, dateRange, today }))
    return sortPatientBookingsLatestFirst(matched)
  }, [rows, filter, dateRange])

  const filtersActive = filter !== 'all' || dateRange.start || dateRange.end

  if (isLoading && !rows.length) {
    return (
      <View style={[styles.root, { padding: 16 }]}>
        <ListSkeleton count={6} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* Ambient Top Background Halo Glow */}
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.countWrap}>
          <Text style={styles.countNum}>{filtered.length}</Text>
          <Text style={styles.countSep}>/</Text>
          <Text style={styles.countTotal}>{rows.length}</Text>
          <Text style={styles.countLabel}> · {patientFilterSummary(filter, dateRange)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.filterBtn, filtersActive && styles.filterBtnActive, pressed && styles.filterBtnPressed]}
          onPress={() => setFilterOpen(true)}
        >
          <Ionicons name="options-outline" size={15} color={filtersActive ? figmaTokens.primary : colors.slate500} />
          <Text style={[styles.filterBtnTxt, filtersActive && styles.filterBtnTxtActive]}>Filter</Text>
          {filtersActive && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item._id)}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyPad : styles.listPad}
        ListEmptyComponent={
          <EmptyState
            title={rows.length === 0 ? 'No bookings yet' : 'No bookings match this filter'}
            message={rows.length === 0 ? 'Book an appointment to see it here.' : 'Try a different filter.'}
            secondaryCta={rows.length > 0 ? { title: 'Show all', onPress: () => setFilter('all') } : undefined}
            primaryCta={{
              title: rows.length === 0 ? 'Book your first appointment' : 'Book appointment',
              onPress: () => navigation.navigate('PhysioList'),
            }}
          />
        }
        renderItem={({ item }) => (
          <BookingCard
            item={item}
            onPress={() => navigation.navigate('BookingDetail', { id: item._id })}
          />
        )}
      />

      <PatientBookingsFilterModal
        visible={filterOpen}
        filter={filter}
        dateRange={dateRange}
        onFilterChange={(next, range) => {
          setFilter(next)
          setDateRange(next === 'range' ? range : { start: '', end: '' })
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  )
}

const BookingCard = memo(function BookingCard({ item, onPress }) {
  const st = bookingStatusBadge(item.status, item.sessionStatus, item.paymentStatus, item.planStatus)
  const amt = Number(item.totalAmount) || 0
  const indicatorColor = 
    item.status === 'cancelled' ? colors.red500 :
    item.sessionStatus === 'completed' ? colors.success :
    item.sessionStatus === 'scheduled' ? colors.warning :
    figmaTokens.primary

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={[styles.cardIndicator, { backgroundColor: indicatorColor }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardLeft}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="calendar-outline" size={15} color={figmaTokens.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardDate} numberOfLines={1}>
              {formatBookingDateAndSlot(item.date, item.timeSlot)}
            </Text>
            <Text style={styles.cardPhysio} numberOfLines={1}>
              {item.physioId?.name || 'Physio TBD'}
            </Text>
            {amt > 0 && <Text style={styles.cardAmt}>{formatInr(amt)}</Text>}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Chip label={st.label} bg={st.bg} fg={st.fg} border={st.border} />
          <Ionicons name="chevron-forward" size={14} color={colors.slate300} />
        </View>
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 2,
  },
  countWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  countNum: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  countSep: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  countTotal: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  countLabel: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },

  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.12)',
    backgroundColor: colors.white,
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  filterBtnActive: { borderColor: figmaTokens.primary, backgroundColor: figmaTokens.mintSoft },
  filterBtnPressed: { opacity: 0.75 },
  filterBtnTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.slate500 },
  filterBtnTxtActive: { color: figmaTokens.primary },
  filterDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: figmaTokens.primary,
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  listPad: { padding: 16, paddingBottom: 28, gap: 10 },
  emptyPad: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  // Booking card
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
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardPressed: { backgroundColor: colors.slate50, opacity: 0.85 },
  cardIndicator: { width: 4 },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: figmaTokens.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardDate: { fontFamily: font.bold, fontSize: type.sm, color: colors.textPrimary },
  cardPhysio: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  cardAmt: { marginTop: 3, fontFamily: font.bold, fontSize: type.xs, color: figmaTokens.primary },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },

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
