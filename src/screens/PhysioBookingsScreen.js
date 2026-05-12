import { useDeferredValue, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import PhysioApprovalBanner from '../components/physio/PhysioApprovalBanner'
import PhysioFilterModal from '../components/physio/PhysioFilterModal'
import SessionsCalendarRN from '../components/physio/SessionsCalendarRN'
import { DEFAULT_PHYSIO_FILTERS } from '../constants/physioBookingFilters'
import { usePhysioWorkspaceOptional } from '../context/PhysioWorkspaceContext'
import { usePhysioBookings } from '../api/queries'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { formatBookingDateAndSlot } from '../utils/date'
import { openGoogleMapsDestination } from '../utils/googleMaps'
import { normalizeIndianPhone } from '../utils/phoneIndia'
import { matchesFilters } from '../utils/physioBookingHelpers'

function listStatusLabel(b) {
  if (b.sessionStatus === 'completed') return 'Completed'
  if (b.rescheduled) return 'Rescheduled'
  return 'Scheduled'
}

function patientInitial(name) {
  const s = (name || '?').trim()
  return s ? s.slice(0, 1).toUpperCase() : '?'
}

function statusAccent(b) {
  if (b.sessionStatus === 'completed') return colors.success
  if (b.rescheduled) return colors.warning
  return colors.brand
}

function statusChipColors(b) {
  if (b.sessionStatus === 'completed') return { bg: colors.successBg, fg: colors.emerald700, border: '#a7f3d0' }
  if (b.rescheduled) return { bg: colors.amber50, fg: colors.amber800, border: '#fde68a' }
  return { bg: colors.teal50, fg: colors.teal800, border: colors.brandSoft }
}

function serviceChipColors(b) {
  if (b.serviceType === 'online') return { bg: colors.blue50, fg: colors.blue600, border: '#bfdbfe', label: 'Online' }
  return { bg: '#dcfce7', fg: '#166534', border: '#a7f3d0', label: 'Home' }
}

export default function PhysioBookingsScreen({ navigation }) {
  const ws = usePhysioWorkspaceOptional()
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_PHYSIO_FILTERS }))
  const [filterDraft, setFilterDraft] = useState(() => ({ ...DEFAULT_PHYSIO_FILTERS }))
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('latest')
  const [view, setView] = useState('list')

  const {
    data: bookings = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
    error: fetchError,
  } = usePhysioBookings({ page: 1, limit: 100 })

  const loadError = fetchError ? (fetchError?.response?.data?.message || 'Failed to load bookings') : ''
  const errorCode = fetchError ? String(fetchError?.response?.data?.code || '') : ''
  const deferredSearch = useDeferredValue(search)

  const filtersActive = useMemo(
    () => filters.status !== 'all' || filters.service !== 'all' || filters.date !== 'all',
    [filters],
  )

  const displayBookings = useMemo(() => {
    let list = bookings.filter((b) => matchesFilters(b, filters))
    const q = deferredSearch.trim().toLowerCase()
    if (q) {
      const digits = q.replace(/\D/g, '')
      const qNorm = normalizeIndianPhone(q)
      list = list.filter((b) => {
        const name = (b.userId?.name || '').toLowerCase()
        const phone = String(b.userId?.phone || '')
        const phoneDigits = phone.replace(/\D/g, '')
        const phoneNorm = normalizeIndianPhone(phone) || phoneDigits
        if (qNorm && qNorm.length === 10 && phoneNorm === qNorm) return true
        return name.includes(q) || phone.toLowerCase().includes(q) || (digits.length > 0 && phoneDigits.includes(digits))
      })
    }
    const arr = [...list]
    arr.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime()
      const tb = new Date(b.createdAt).getTime()
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
      if (Number.isNaN(ta)) return 1
      if (Number.isNaN(tb)) return -1
      return sort === 'latest' ? tb - ta : ta - tb
    })
    return arr
  }, [bookings, filters, deferredSearch, sort])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayCount = bookings.filter((b) => b.date === today).length
    const completedCount = bookings.filter((b) => b.sessionStatus === 'completed').length
    const scheduledCount = bookings.filter((b) => b.sessionStatus !== 'completed').length
    return { total: bookings.length, today: todayCount, completed: completedCount, scheduled: scheduledCount }
  }, [bookings])

  const showBanner = Boolean(ws?.me && ws?.platformApproved === false)

  const header = (
    <View style={styles.headerBlock}>
      {showBanner ? (
        <View style={styles.bannerWrap}>
          <PhysioApprovalBanner
            rejected={ws.rejected}
            onPressOnboarding={() => navigation.getParent()?.getParent()?.navigate('PhysioOnboarding')}
            onPressProfile={() => navigation.getParent()?.getParent()?.navigate('ProfileGlobal')}
          />
        </View>
      ) : null}

      {/* ── Stats strip ──────────────────────────── */}
      {!loading && bookings.length > 0 ? (
        <View style={styles.statsStrip}>
          <StatPill icon="calendar-outline" value={stats.today} label="Today" color={colors.brand} />
          <View style={styles.statsDivider} />
          <StatPill icon="time-outline" value={stats.scheduled} label="Scheduled" color={colors.blue600} />
          <View style={styles.statsDivider} />
          <StatPill icon="checkmark-circle-outline" value={stats.completed} label="Done" color={colors.success} />
          <View style={styles.statsDivider} />
          <StatPill icon="calendar-number-outline" value={stats.total} label="Total" color={colors.slate400} />
        </View>
      ) : null}

      {/* ── Toolbar ──────────────────────────────── */}
      {!loading && bookings.length > 0 ? (
        <View style={styles.toolbar}>
          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={15} color={colors.slate400} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search patient, phone…"
              placeholderTextColor={colors.slate300}
              style={styles.searchInput}
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={15} color={colors.slate400} />
              </Pressable>
            ) : null}
          </View>

          {/* Controls row */}
          <View style={styles.controlsRow}>
            {/* View toggle */}
            <View style={styles.segWrap}>
              <Pressable style={[styles.segBtn, view === 'list' && styles.segBtnOn]} onPress={() => setView('list')}>
                <Ionicons name="list-outline" size={13} color={view === 'list' ? colors.brand : colors.slate400} />
                <Text style={[styles.segTxt, view === 'list' && styles.segTxtOn]}>List</Text>
              </Pressable>
              <Pressable style={[styles.segBtn, view === 'calendar' && styles.segBtnOn]} onPress={() => setView('calendar')}>
                <Ionicons name="calendar-outline" size={13} color={view === 'calendar' ? colors.brand : colors.slate400} />
                <Text style={[styles.segTxt, view === 'calendar' && styles.segTxtOn]}>Calendar</Text>
              </Pressable>
            </View>

            <View style={styles.controlsRight}>
              {/* Sort toggle */}
              <Pressable
                style={styles.sortBtn}
                onPress={() => setSort((s) => (s === 'latest' ? 'oldest' : 'latest'))}
              >
                <Ionicons name={sort === 'latest' ? 'arrow-down-outline' : 'arrow-up-outline'} size={13} color={colors.slate500} />
                <Text style={styles.sortTxt}>{sort === 'latest' ? 'Latest' : 'Oldest'}</Text>
              </Pressable>

              {/* Filter button */}
              <Pressable
                style={[styles.filterBtn, filtersActive && styles.filterBtnActive]}
                onPress={() => { setFilterDraft({ ...filters }); setFilterOpen(true) }}
              >
                <Ionicons name="options-outline" size={14} color={filtersActive ? colors.white : colors.slate600} />
                <Text style={[styles.filterBtnTxt, filtersActive && styles.filterBtnTxtActive]}>Filter</Text>
                {filtersActive ? (
                  <View style={styles.filterActiveDot} />
                ) : null}
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )

  if (loading && bookings.length === 0 && !loadError) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  if (loadError) {
    return (
      <FlatList
        data={[{ key: 'err' }]}
        style={styles.root}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        renderItem={() => (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="warning-outline" size={24} color={colors.warning} />
            </View>
            <Text style={styles.errorTitle}>{loadError}</Text>
            {(errorCode === 'PHYSIO_PENDING' || errorCode === 'PROFILE_INCOMPLETE') && (
              <Pressable
                style={styles.errorBtn}
                onPress={() => navigation.getParent()?.getParent()?.navigate('PhysioOnboarding')}
              >
                <Text style={styles.errorBtnTxt}>Complete profile setup</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    )
  }

  if (bookings.length === 0) {
    return (
      <FlatList
        data={[{ key: 'empty' }]}
        style={styles.root}
        contentContainerStyle={styles.listPad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        ListHeaderComponent={header}
        renderItem={() => (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={30} color={colors.slate300} />
            </View>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySub}>Assigned sessions will appear here.</Text>
          </View>
        )}
      />
    )
  }

  if (displayBookings.length === 0) {
    return (
      <>
        <FlatList
          data={[{ key: 'empty2' }]}
          style={styles.root}
          contentContainerStyle={styles.listPad}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
          ListHeaderComponent={header}
          renderItem={() => (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={24} color={colors.slate300} />
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptySub}>Try changing your filters or search.</Text>
            </View>
          )}
        />
        <PhysioFilterModal
          visible={filterOpen}
          draft={filterDraft}
          setDraft={setFilterDraft}
          onClose={() => { setFilters({ ...filterDraft }); setFilterOpen(false) }}
        />
      </>
    )
  }

  if (view === 'calendar') {
    return (
      <>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
          style={styles.root}
          contentContainerStyle={styles.listPad}
        >
          {header}
          <SessionsCalendarRN
            displayBookings={displayBookings}
            onOpenBooking={(b) => navigation.navigate('PhysioBookingDetail', { id: b._id })}
          />
        </ScrollView>
        <PhysioFilterModal
          visible={filterOpen}
          draft={filterDraft}
          setDraft={setFilterDraft}
          onClose={() => { setFilters({ ...filterDraft }); setFilterOpen(false) }}
        />
      </>
    )
  }

  return (
    <>
      <FlatList
        data={displayBookings}
        keyExtractor={(item) => String(item._id)}
        style={styles.root}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listPad}
        renderItem={({ item: b }) => {
          const canStart = Boolean(b.userId?.coordinates || String(b.userId?.location || '').trim())
          const svc = serviceChipColors(b)
          const st = statusChipColors(b)
          const accent = statusAccent(b)

          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('PhysioBookingDetail', { id: b._id })}
            >
              {/* Status accent border */}
              <View style={[styles.cardAccent, { backgroundColor: accent }]} />

              <View style={styles.cardBody}>
                {/* Top row: date + pills */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardDateWrap}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.cardDate}>{formatBookingDateAndSlot(b.date, b.timeSlot)}</Text>
                  </View>
                  <View style={styles.cardPills}>
                    <View style={[styles.pill, { backgroundColor: svc.bg, borderColor: svc.border }]}>
                      <Text style={[styles.pillTxt, { color: svc.fg }]}>{svc.label}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: st.bg, borderColor: st.border }]}>
                      <Text style={[styles.pillTxt, { color: st.fg }]}>{listStatusLabel(b)}</Text>
                    </View>
                  </View>
                </View>

                {/* Patient row */}
                <View style={styles.cardPatientRow}>
                  <View style={[styles.cardAvatar, { backgroundColor: accent + '22' }]}>
                    <Text style={[styles.cardAvatarTxt, { color: accent }]}>
                      {patientInitial(b.userId?.name)}
                    </Text>
                  </View>
                  <View style={styles.cardPatientBody}>
                    <Text style={styles.cardPatientName} numberOfLines={1}>
                      {b.userId?.name ?? '—'}
                    </Text>
                    {b.userId?.phone ? (
                      <Text style={styles.cardPhone}>{b.userId.phone}</Text>
                    ) : null}
                    {b.issue ? (
                      <Text style={styles.cardIssue} numberOfLines={1}>{b.issue}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Action row */}
                <View style={styles.cardActions}>
                  <Pressable
                    style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
                    disabled={!canStart}
                    onPress={(e) => {
                      e.stopPropagation?.()
                      openGoogleMapsDestination({
                        coordinates: b.userId?.coordinates,
                        address: b.userId?.location,
                      })
                    }}
                  >
                    <Ionicons name="navigate-outline" size={13} color={canStart ? colors.white : colors.slate400} />
                    <Text style={[styles.startBtnTxt, !canStart && styles.startBtnTxtDisabled]}>Directions</Text>
                  </Pressable>

                  <Pressable
                    style={styles.detailBtn}
                    onPress={() => navigation.navigate('PhysioBookingDetail', { id: b._id })}
                  >
                    <Text style={styles.detailBtnTxt}>Details</Text>
                    <Ionicons name="chevron-forward" size={13} color={colors.brand} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          )
        }}
      />
      <PhysioFilterModal
        visible={filterOpen}
        draft={filterDraft}
        setDraft={setFilterDraft}
        onClose={() => { setFilters({ ...filterDraft }); setFilterOpen(false) }}
      />
    </>
  )
}

function StatPill({ icon, value, label, color }) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={12} color={color} />
      </View>
      <View style={styles.statTextWrap}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  listPad: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas },

  headerBlock: { paddingTop: 8, paddingBottom: 12 },
  bannerWrap: { marginBottom: 10 },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 0,
  },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statTextWrap: { minWidth: 0, flexShrink: 1 },
  statValue: { fontFamily: font.bold, fontSize: type.sm, color: colors.textPrimary, lineHeight: 17 },
  statLabel: { fontFamily: font.regular, fontSize: 8, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
  statsDivider: { width: 1, height: 28, backgroundColor: colors.borderSubtle },

  // Toolbar
  toolbar: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    gap: 10,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.canvas,
    minHeight: 38,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textPrimary,
    paddingVertical: 6,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  segWrap: {
    flexDirection: 'row',
    backgroundColor: colors.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 2,
    gap: 2,
  },
  segBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  segBtnOn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  segTxt: { fontFamily: font.medium, fontSize: type.xs, color: colors.slate400 },
  segTxtOn: { fontFamily: font.semiBold, color: colors.brand },

  controlsRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  sortTxt: { fontFamily: font.medium, fontSize: type.xs, color: colors.slate500 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  filterBtnActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  filterBtnTxt: { fontFamily: font.medium, fontSize: type.xs, color: colors.slate600 },
  filterBtnTxtActive: { color: colors.white },
  filterActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.white,
    marginLeft: 2,
  },

  // Booking card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardPressed: { opacity: 0.92 },
  cardAccent: { width: 4, alignSelf: 'stretch', flexShrink: 0 },
  cardBody: { flex: 1, padding: 14, gap: 10 },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardDateWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardDate: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  cardPills: { flexDirection: 'row', gap: 5 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillTxt: { fontFamily: font.bold, fontSize: 9, letterSpacing: 0.3 },

  cardPatientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardAvatarTxt: { fontFamily: font.bold, fontSize: type.base },
  cardPatientBody: { flex: 1, minWidth: 0 },
  cardPatientName: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },
  cardPhone: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  cardIssue: {
    marginTop: 2,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  startBtnDisabled: { backgroundColor: colors.slate100 },
  startBtnTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.white },
  startBtnTxtDisabled: { color: colors.slate400 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },

  // Error state
  errorCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.amber50,
    borderWidth: 1,
    borderColor: colors.amber200,
    alignItems: 'center',
    gap: 10,
  },
  errorIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontFamily: font.regular, fontSize: type.sm, color: colors.amber800, textAlign: 'center' },
  errorBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  errorBtnTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.amber800 },

  // Empty state
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  emptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary, textAlign: 'center', lineHeight: leading.sm },
})
