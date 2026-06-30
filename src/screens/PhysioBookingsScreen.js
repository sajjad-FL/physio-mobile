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
import { normalizeIndianPhone } from '../utils/phoneIndia'
import { matchesFilters } from '../utils/physioBookingHelpers'

function listStatusLabel(b) {
  if (b.sessionStatus === 'completed' || b.status === 'completed') return 'Completed'
  if (b.status === 'assigned') {
    if (b.planStatus === 'proposed') return 'Awaiting Approval'
    if (b.planStatus === 'approved') return 'Awaiting Acceptance'
    return 'Propose Plan'
  }
  if (b.status === 'pending' || b.planStatus === 'requested') return 'Propose Plan'
  if (b.rescheduled) return 'Rescheduled'
  return 'Scheduled'
}

function patientInitial(name) {
  const s = (name || '?').trim()
  return s ? s.slice(0, 1).toUpperCase() : '?'
}

function statusAccent(b) {
  if (b.sessionStatus === 'completed' || b.status === 'completed') return colors.success
  if (b.status === 'assigned') {
    if (b.planStatus === 'proposed') return colors.blue600
    if (b.planStatus === 'approved') return colors.warning
    return colors.warning
  }
  if (b.status === 'pending' || b.planStatus === 'requested') return colors.warning
  if (b.rescheduled) return colors.warning
  return colors.brand
}

function statusChipColors(b) {
  if (b.sessionStatus === 'completed' || b.status === 'completed') {
    return { bg: colors.successBg, fg: colors.emerald700, border: '#a7f3d0' }
  }
  if (b.status === 'assigned') {
    if (b.planStatus === 'proposed') {
      return { bg: colors.blue50, fg: colors.blue800, border: '#bfdbfe' }
    }
    if (b.planStatus === 'approved') {
      return { bg: '#fff7ed', fg: '#c2410c', border: '#ffedd5' }
    }
    return { bg: colors.amber50, fg: colors.amber800, border: '#fde68a' }
  }
  if (b.status === 'pending' || b.planStatus === 'requested') {
    return { bg: colors.amber50, fg: colors.amber800, border: '#fde68a' }
  }
  if (b.rescheduled) {
    return { bg: colors.amber50, fg: colors.amber800, border: '#fde68a' }
  }
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
      <View style={styles.container}>
        <View style={styles.ambientHeaderGlow} pointerEvents="none" />
        <View style={styles.ambientHeaderGlow2} pointerEvents="none" />
        <FlatList
          data={[{ key: 'err' }]}
          style={[styles.root, { backgroundColor: 'transparent' }]}
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
      </View>
    )
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.ambientHeaderGlow} pointerEvents="none" />
        <View style={styles.ambientHeaderGlow2} pointerEvents="none" />
        <FlatList
          data={[{ key: 'empty' }]}
          style={[styles.root, { backgroundColor: 'transparent' }]}
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
      </View>
    )
  }

  if (displayBookings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.ambientHeaderGlow} pointerEvents="none" />
        <View style={styles.ambientHeaderGlow2} pointerEvents="none" />
        <FlatList
          data={[{ key: 'empty2' }]}
          style={[styles.root, { backgroundColor: 'transparent' }]}
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
      </View>
    )
  }

  if (view === 'calendar') {
    return (
      <View style={styles.container}>
        <View style={styles.ambientHeaderGlow} pointerEvents="none" />
        <View style={styles.ambientHeaderGlow2} pointerEvents="none" />
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
          style={[styles.root, { backgroundColor: 'transparent' }]}
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
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />
      <FlatList
        data={displayBookings}
        keyExtractor={(item) => String(item._id)}
        style={[styles.root, { backgroundColor: 'transparent' }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listPad}
        renderItem={({ item: b }) => {
          const svc = serviceChipColors(b)
          const st = statusChipColors(b)
          const accent = statusAccent(b)
          const dateObj = b.date ? new Date(b.date + 'T00:00:00') : new Date()
          const dayNum = dateObj.getDate()
          const monStr = dateObj.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()

          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('PhysioBookingDetail', { id: b._id })}
            >
              {/* Left: visual date zone */}
              <View style={[styles.cardDateZone, { backgroundColor: accent + '14' }]}>
                <View style={[styles.cardDateZoneBar, { backgroundColor: accent }]} />
                <View style={[styles.cardDateAvatar, { backgroundColor: accent }]}>
                  <Text style={styles.cardDateAvatarTxt}>{patientInitial(b.userId?.name)}</Text>
                </View>
                <Text style={[styles.cardDayNum, { color: accent }]}>{dayNum}</Text>
                <Text style={[styles.cardDayMon, { color: accent }]}>{monStr}</Text>
              </View>

              {/* Right: patient info */}
              <View style={styles.cardBody}>
                <Text style={styles.cardPatientName} numberOfLines={1}>
                  {b.userId?.name ?? '—'}
                </Text>
                {b.issue ? (
                  <Text style={styles.cardIssue} numberOfLines={1}>{b.issue}</Text>
                ) : null}
                <Text style={styles.cardTimeText} numberOfLines={1}>
                  {formatBookingDateAndSlot(b.date, b.timeSlot)}
                </Text>
                <View style={styles.cardPills}>
                  <View style={[styles.pill, { backgroundColor: svc.bg, borderColor: svc.border }]}>
                    <Text style={[styles.pillTxt, { color: svc.fg }]}>{svc.label}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Text style={[styles.pillTxt, { color: st.fg }]}>{listStatusLabel(b)}</Text>
                  </View>
                </View>
              </View>

              {/* Chevron */}
              <View style={styles.cardChevronWrap}>
                <Ionicons name="chevron-forward" size={16} color={colors.slate200} />
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
    </View>
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
  root: { flex: 1, backgroundColor: 'transparent' },
  listPad: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e8f8f6' },

  headerBlock: { paddingTop: 8, paddingBottom: 12 },
  bannerWrap: { marginBottom: 10 },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.12)',
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginBottom: 10,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  statPill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 0,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statTextWrap: { minWidth: 0, flexShrink: 1, alignItems: 'center' },
  statValue: { fontFamily: font.bold, fontSize: 20, color: colors.textPrimary, lineHeight: 24 },
  statLabel: { fontFamily: font.regular, fontSize: 8, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsDivider: { width: 1, height: 36, backgroundColor: 'rgba(13, 148, 136, 0.08)' },

  // Toolbar
  toolbar: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    padding: 12,
    gap: 10,
    marginBottom: 4,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
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
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.08)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
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
    borderColor: 'rgba(13, 148, 136, 0.08)',
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
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
    borderColor: 'rgba(13, 148, 136, 0.08)',
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
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
    borderColor: 'rgba(13, 148, 136, 0.08)',
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#0d3d38',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 88,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

  // Left date zone
  cardDateZone: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 14,
    flexShrink: 0,
    position: 'relative',
  },
  cardDateZoneBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardDateAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  cardDateAvatarTxt: {
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.white,
  },
  cardDayNum: {
    fontFamily: font.bold,
    fontSize: 19,
    lineHeight: 22,
  },
  cardDayMon: {
    fontFamily: font.semiBold,
    fontSize: 9,
    letterSpacing: 0.6,
  },

  // Right body
  cardBody: { flex: 1, paddingVertical: 13, paddingHorizontal: 12, gap: 3, justifyContent: 'center' },
  cardPatientName: { fontFamily: font.bold, fontSize: 17, color: colors.textPrimary, lineHeight: 22 },
  cardIssue: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  cardTimeText: {
    fontFamily: font.medium,
    fontSize: 11,
    color: colors.slate400,
    marginBottom: 3,
  },
  cardPills: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  pillTxt: { fontFamily: font.bold, fontSize: 9, letterSpacing: 0.3 },

  // Chevron
  cardChevronWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

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
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  emptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary, textAlign: 'center', lineHeight: leading.sm },

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
