import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { useFocusEffect } from '@react-navigation/native'
import { api } from '../api/client'
import PhysioApprovalBanner from '../components/physio/PhysioApprovalBanner'
import PhysioFilterModal from '../components/physio/PhysioFilterModal'
import SessionsCalendarRN from '../components/physio/SessionsCalendarRN'
import { DEFAULT_PHYSIO_FILTERS } from '../constants/physioBookingFilters'
import { usePhysioWorkspaceOptional } from '../context/PhysioWorkspaceContext'
import { colors } from '../theme/colors'
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

export default function PhysioBookingsScreen({ navigation }) {
  const ws = usePhysioWorkspaceOptional()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_PHYSIO_FILTERS }))
  const [filterDraft, setFilterDraft] = useState(() => ({ ...DEFAULT_PHYSIO_FILTERS }))
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('latest')
  const [view, setView] = useState('list')

  const deferredSearch = useDeferredValue(search)

  const filtersActive = useMemo(
    () =>
      filters.status !== 'all' || filters.service !== 'all' || filters.date !== 'all',
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
        return (
          name.includes(q) ||
          phone.toLowerCase().includes(q) ||
          (digits.length > 0 && phoneDigits.includes(digits))
        )
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

  const load = useCallback(async () => {
    setLoadError('')
    setErrorCode('')
    try {
      const res = await api.get('/physio/bookings', { params: { page: 1, limit: 100 } })
      setBookings(res.data?.data || [])
      ws?.refreshBadges?.()
    } catch (e) {
      setBookings([])
      setErrorCode(String(e?.response?.data?.code || ''))
      setLoadError(e?.response?.data?.message || 'Failed to load bookings')
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to load bookings' })
    }
  }, [ws])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  useFocusEffect(
    useCallback(() => {
      ws?.refreshBadges?.()
    }, [ws]),
  )

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  function accentBorder(b) {
    if (b.sessionStatus === 'completed') return { borderLeftColor: '#10b981' }
    if (b.rescheduled) return { borderLeftColor: '#f59e0b' }
    return { borderLeftColor: colors.blue600 }
  }

  function servicePill(b) {
    const online = b.serviceType === 'online'
    return {
      pillBg: online ? colors.violet50 : colors.teal50,
      pillFg: online ? colors.violet800 : colors.teal800,
      pillText: online ? 'Online' : 'Home',
    }
  }

  function statusPill(b) {
    if (b.sessionStatus === 'completed') return { bg: colors.emerald50, fg: colors.emerald900, ring: '#a7f3d0' }
    if (b.rescheduled) return { bg: colors.amber50, fg: colors.amber950, ring: '#fde68a' }
    return { bg: colors.slate50, fg: colors.slate900, ring: colors.slate200 }
  }

  const showBanner = Boolean(ws?.me && ws?.platformApproved === false)

  const heroShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.09,
          shadowRadius: 14,
        }
      : {}

  const header = (
    <View style={styles.headerBlock}>
      <View style={[styles.shellStripe, heroShadow]}>
        <View style={styles.heroStripe} />
        <View style={styles.heroBody}>
          <Text style={styles.shellBrand}>PhysioKhom</Text>
          <View style={styles.shellBadge}>
            <Text style={styles.shellBadgeTxt}>Physio</Text>
          </View>
          <Text style={styles.shellSub}>Sessions, availability, and notes</Text>
        </View>
      </View>
      {showBanner ? (
        <PhysioApprovalBanner
          rejected={ws.rejected}
          onPressOnboarding={() => navigation.getParent()?.getParent()?.navigate('PhysioOnboarding')}
          onPressProfile={() => navigation.getParent()?.getParent()?.navigate('ProfileGlobal')}
        />
      ) : null}
      <View style={[styles.intro, showBanner ? { paddingHorizontal: 16 } : null]}>
        <Text style={styles.eyebrow}>Your workspace</Text>
        <Text style={styles.title}>Assigned bookings</Text>
        <Text style={styles.subtitle}>
          Search and filter patients, switch list or calendar, then open any row for actions and full detail.
        </Text>
      </View>
      {!loading && bookings.length > 0 ? (
        <View style={[styles.toolbarCard, heroShadow, showBanner ? { marginHorizontal: 16 } : null]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by patient name or phone..."
            placeholderTextColor={colors.slate500}
            style={styles.search}
          />
          <View style={styles.toolbarRow}>
            <Pressable
              style={[styles.sortChip, styles.sortGhost]}
              onPress={() => setSort((s) => (s === 'latest' ? 'oldest' : 'latest'))}
            >
              <Text style={styles.sortChipTxt}>{sort === 'latest' ? 'Latest first' : 'Oldest first'}</Text>
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => { setFilterDraft({ ...filters }); setFilterOpen(true) }}>
              <Text style={styles.iconBtnTxt}>▼</Text>
              {filtersActive ? <View style={styles.filterDot} /> : null}
            </Pressable>
            <View style={styles.segWrap}>
              <Pressable style={[styles.segBtn, view === 'list' && styles.segOn]} onPress={() => setView('list')}>
                <Text style={[styles.segTxt, view === 'list' && styles.segTxtOn]}>List</Text>
              </Pressable>
              <Pressable style={[styles.segBtn, view === 'calendar' && styles.segOn]} onPress={() => setView('calendar')}>
                <Text style={[styles.segTxt, view === 'calendar' && styles.segTxtOn]}>Calendar</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.countLbl}>
            Showing <Text style={styles.countEm}>{displayBookings.length}</Text> of {bookings.length}
            {filtersActive ? ' · Filters on' : ''}
          </Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={() => (
          <View style={styles.errBox}>
            <Text style={styles.errTitle}>{loadError}</Text>
            {(errorCode === 'PHYSIO_PENDING' || errorCode === 'PROFILE_INCOMPLETE') && (
              <Pressable style={styles.errBtn} onPress={() => navigation.getParent()?.getParent()?.navigate('PhysioOnboarding')}>
                <Text style={styles.errBtnTxt}>Finish profile setup</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={header}
        renderItem={() => <Text style={styles.empty}>No assigned bookings yet.</Text>}
      />
    )
  }

  if (displayBookings.length === 0) {
    return (
      <>
        <FlatList
          data={[{ key: 'empty2' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={header}
          renderItem={() => (
            <View style={[styles.toolbarCard, styles.emptyFiltered]}>
              <Text style={styles.emptyFilteredTxt}>No bookings match filters or search.</Text>
            </View>
          )}
        />
        <PhysioFilterModal
          visible={filterOpen}
          draft={filterDraft}
          setDraft={setFilterDraft}
          onClose={() => {
            setFilters({ ...filterDraft })
            setFilterOpen(false)
          }}
        />
      </>
    )
  }

  if (view === 'calendar') {
    return (
      <>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {header}
          <View style={{ paddingHorizontal: 16 }}>
            <SessionsCalendarRN
              displayBookings={displayBookings}
              onOpenBooking={(b) => navigation.navigate('PhysioBookingDetail', { id: b._id })}
            />
          </View>
        </ScrollView>
        <PhysioFilterModal
          visible={filterOpen}
          draft={filterDraft}
          setDraft={setFilterDraft}
          onClose={() => {
            setFilters({ ...filterDraft })
            setFilterOpen(false)
          }}
        />
      </>
    )
  }

  return (
    <>
      <FlatList
        data={displayBookings}
        keyExtractor={(item) => String(item._id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listPad}
        renderItem={({ item: b }) => {
          const canStart = Boolean(b.userId?.coordinates || String(b.userId?.location || '').trim())
          const sp = servicePill(b)
          const st = statusPill(b)
          return (
            <Pressable
              style={[styles.card, accentBorder(b)]}
              onPress={() => navigation.navigate('PhysioBookingDetail', { id: b._id })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{patientInitial(b.userId?.name)}</Text>
              </View>
              <View style={styles.cardMain}>
                <View style={styles.rowTop}>
                  <Text style={styles.dateLine}>{formatBookingDateAndSlot(b.date, b.timeSlot)}</Text>
                  <View style={[styles.svcPill, { backgroundColor: sp.pillBg }]}>
                    <Text style={[styles.svcPillTxt, { color: sp.pillFg }]}>{sp.pillText}</Text>
                  </View>
                </View>
                <Text style={styles.patientRow} numberOfLines={1}>
                  <Text style={styles.patientName}>{b.userId?.name ?? '—'}</Text>
                  {b.userId?.phone ? <Text style={styles.patientPhone}> · {b.userId.phone}</Text> : null}
                </Text>
                <Text style={styles.issue} numberOfLines={2}>
                  {b.issue || '—'}
                </Text>
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.smBtn, !canStart && { opacity: 0.45 }]}
                    disabled={!canStart}
                    onPress={() =>
                      openGoogleMapsDestination({
                        coordinates: b.userId?.coordinates,
                        address: b.userId?.location,
                      })
                    }
                  >
                    <Text style={styles.smBtnTxt}>Start</Text>
                  </Pressable>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusPillTxt, { color: st.fg }]}>{listStatusLabel(b)}</Text>
                  </View>
                  <Text style={styles.detailLink}>Details ›</Text>
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
        onClose={() => {
          setFilters({ ...filterDraft })
          setFilterOpen(false)
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.slate50 },
  shellStripe: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  heroStripe: { height: 4, width: '100%', backgroundColor: colors.brand },
  heroBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  shellBrand: { fontSize: 22, fontWeight: '800', color: colors.slate900, letterSpacing: -0.35 },
  shellBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.35)',
  },
  shellBadgeTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.teal800,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  shellSub: { marginTop: 12, fontSize: 14, color: colors.slate600, fontWeight: '500', lineHeight: 21 },
  headerBlock: { paddingTop: 4, paddingBottom: 12 },
  intro: { paddingHorizontal: 16, marginBottom: 12 },
  eyebrow: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.slate900, letterSpacing: -0.3 },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.slate600,
    lineHeight: 22,
    fontWeight: '500',
    maxWidth: 520,
  },
  toolbarCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
  },
  search: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.slate50,
    color: colors.slate900,
  },
  toolbarRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  sortChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  sortGhost: { backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.borderSubtle },
  sortChipTxt: { fontSize: 13, fontWeight: '600', color: colors.slate800 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  iconBtnTxt: { fontSize: 13, fontWeight: '700', color: colors.slate700 },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  segWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: colors.slate50,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginLeft: 'auto',
  },
  segBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  segOn: { backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  segTxt: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  segTxtOn: { color: colors.brand, fontWeight: '700' },
  countLbl: { marginTop: 12, fontSize: 12, color: colors.slate500, fontWeight: '500' },
  countEm: { fontWeight: '800', color: colors.teal800 },
  listPad: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        }
      : {}),
    ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 16, fontWeight: '700', color: colors.slate600 },
  cardMain: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  dateLine: { fontSize: 14, fontWeight: '700', color: colors.slate900 },
  svcPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#00000014' },
  svcPillTxt: { fontSize: 10, fontWeight: '700' },
  patientRow: { marginTop: 6, fontSize: 12 },
  patientName: { fontWeight: '600', color: colors.slate900 },
  patientPhone: { color: colors.slate500 },
  issue: { marginTop: 4, fontSize: 12, color: colors.slate600 },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  smBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: colors.blue50,
  },
  smBtnTxt: { fontSize: 11, fontWeight: '700', color: colors.blue700 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: '#00000014' },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },
  detailLink: { marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: colors.brand },
  errBox: { margin: 16, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.amber200, backgroundColor: colors.amber50 },
  errTitle: { fontSize: 14, color: colors.amber950 },
  errBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  errBtnTxt: { fontWeight: '700', fontSize: 13, color: colors.amber950 },
  empty: { textAlign: 'center', marginTop: 24, color: colors.slate500 },
  emptyFiltered: { alignItems: 'center' },
  emptyFilteredTxt: { fontSize: 14, color: colors.slate500 },
})
