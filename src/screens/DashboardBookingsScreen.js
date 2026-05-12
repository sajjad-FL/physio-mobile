import { memo, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatBookingDateAndSlot } from '../utils/date'
import { bookingStatusBadge } from '../utils/dashboardUtils'
import PatientBookingsFilterModal from '../components/dashboard/PatientBookingsFilterModal'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import LoadingScreen from '../components/ui/LoadingScreen'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'
import { matchesPatientBookingFilter, patientFilterSummary, todayYmd } from '../utils/patientBookingFilters'
import { formatInr } from '../utils/currency'
import { useMyBookings } from '../api/queries'

export default function DashboardBookingsScreen({ navigation }) {
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filterOpen, setFilterOpen] = useState(false)
  const { data, isLoading, refetch } = useMyBookings({ page: 1, limit: 100 })
  const rows = data || []

  const filtered = useMemo(() => {
    const today = todayYmd()
    return rows.filter((b) => matchesPatientBookingFilter(b, { filter, dateRange, today }))
  }, [rows, filter, dateRange])

  const filtersActive = filter !== 'all' || dateRange.start || dateRange.end

  if (isLoading && !rows.length) return <LoadingScreen />

  return (
    <View style={styles.root}>
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
          <Ionicons name="options-outline" size={15} color={filtersActive ? colors.brand : colors.slate500} />
          <Text style={[styles.filterBtnTxt, filtersActive && styles.filterBtnTxtActive]}>Filter</Text>
          {filtersActive && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item._id)}
        refreshing={false}
        onRefresh={refetch}
        contentContainerStyle={filtered.length === 0 ? styles.emptyPad : styles.listPad}
        ListEmptyComponent={
          <EmptyState
            title={rows.length === 0 ? 'No bookings yet' : 'No bookings match this filter'}
            message={rows.length === 0 ? 'Book a session to see it here.' : 'Try a different filter.'}
            secondaryCta={rows.length > 0 ? { title: 'Show all', onPress: () => setFilter('all') } : undefined}
            primaryCta={{
              title: rows.length === 0 ? 'Book your first session' : 'Book session',
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
  const st = bookingStatusBadge(item.status, item.sessionStatus, item.paymentStatus)
  const amt = Number(item.totalAmount) || 0
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.cardLeft}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="calendar-outline" size={15} color={colors.slate400} />
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.white,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    position: 'relative',
  },
  filterBtnActive: { borderColor: colors.brand, backgroundColor: colors.teal50 },
  filterBtnPressed: { opacity: 0.75 },
  filterBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.slate500 },
  filterBtnTxtActive: { color: colors.brand },
  filterDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  listPad: { padding: 16, paddingBottom: 28, gap: 10 },
  emptyPad: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  // Booking card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPressed: { backgroundColor: colors.slate50 },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardDate: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  cardPhysio: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  cardAmt: { marginTop: 3, fontFamily: font.semiBold, fontSize: type.xs, color: colors.brand },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
})
