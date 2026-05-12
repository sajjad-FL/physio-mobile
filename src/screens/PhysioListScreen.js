import { useCallback, useEffect, useMemo, useState } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { CommonActions } from '@react-navigation/native'
import * as Location from 'expo-location'
import Toast from 'react-native-toast-message'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ISSUE_OPTIONS, ISSUE_OTHER_VALUE } from '../constants/issues'
import { formatBookingDateAndSlot, formatBookingTimeSlot } from '../utils/date'
import { assetUrl } from '../utils/assetUrl'
import MapPickerModal from '../components/booking/MapPickerModal'
import DropdownField from '../components/ui/DropdownField'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prettyDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  if (!y || !m || !d) return iso
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[Number(m) - 1] || m} ${y}`
}

function physioInitial(name) {
  return String(name || '').trim().charAt(0).toUpperCase() || 'P'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepCard({ step, title, subtitle, locked, done, children }) {
  return (
    <View style={[styles.stepCard, locked && styles.stepCardLocked]}>
      <View style={styles.stepHead}>
        <View style={[styles.stepBadge, locked && styles.stepBadgeLocked, done && styles.stepBadgeDone]}>
          {done
            ? <Ionicons name="checkmark" size={12} color={colors.white} />
            : locked
              ? <Ionicons name="lock-closed" size={10} color={colors.slate400} />
              : <Text style={styles.stepBadgeTxt}>{step}</Text>
          }
        </View>
        <View style={styles.stepHeadText}>
          <Text style={[styles.stepTitle, locked && styles.stepTitleLocked]}>{title}</Text>
          {subtitle ? <Text style={[styles.stepSub, locked && styles.stepSubLocked]}>{subtitle}</Text> : null}
        </View>
      </View>
      <View pointerEvents={locked ? 'none' : 'auto'} style={locked && styles.stepBodyLocked}>
        {children}
      </View>
    </View>
  )
}

function PhysioPickerCard({ physio: p, selected, onSelect }) {
  const avg = Number(p.avgRating) || 0
  const total = Number(p.totalReviews) || 0
  const dist = p.distanceKm == null ? null : `${Number(p.distanceKm).toFixed(1)} km`
  const avatarUri = assetUrl(p.avatar)

  return (
    <Pressable
      style={[styles.physioCard, selected && styles.physioCardSelected]}
      onPress={onSelect}
    >
      <View style={styles.physioCardRow}>
        <View
          style={[
            styles.physioAvatar,
            selected && !avatarUri && styles.physioAvatarSelected,
            selected && Boolean(avatarUri) && styles.physioAvatarRing,
          ]}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.physioAvatarImg} resizeMode="cover" />
          ) : (
            <Text style={[styles.physioAvatarTxt, selected && styles.physioAvatarTxtSelected]}>
              {physioInitial(p.name)}
            </Text>
          )}
        </View>
        <View style={styles.physioCardBody}>
          <View style={styles.physioCardTopRow}>
            <Text style={styles.physioCardName} numberOfLines={1}>{p.name}</Text>
            {p.feePerSession ? (
              <Text style={styles.physioCardFee}>₹{p.feePerSession}</Text>
            ) : null}
          </View>
          {p.specialization ? (
            <Text style={styles.physioCardSpec} numberOfLines={1}>{p.specialization}</Text>
          ) : null}
          <View style={styles.physioCardMeta}>
            <View style={styles.physioStarRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= Math.round(avg) ? 'star' : 'star-outline'}
                  size={9}
                  color={n <= Math.round(avg) ? colors.warning : colors.slate300}
                />
              ))}
              {total > 0 ? (
                <Text style={styles.physioRatingTxt}>{avg.toFixed(1)}</Text>
              ) : null}
            </View>
            {p.experience ? (
              <View style={styles.physioMetaPill}>
                <Text style={styles.physioMetaPillTxt}>{p.experience}yr exp</Text>
              </View>
            ) : null}
            {dist ? (
              <View style={styles.physioMetaPill}>
                <Ionicons name="location-outline" size={9} color={colors.textTertiary} />
                <Text style={styles.physioMetaPillTxt}>{dist}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={[styles.physioSelectDot, selected && styles.physioSelectDotOn]}>
          {selected ? <Ionicons name="checkmark" size={11} color={colors.white} /> : null}
        </View>
      </View>
    </Pressable>
  )
}

function BookingSummaryBar({ selectedPhysio, date, timeSlot, serviceType, canSubmit, loading, onConfirm }) {
  const insets = useSafeAreaInsets()
  const teamAssigns = serviceType === 'home' || !selectedPhysio
  const physioLine = serviceType === 'online' && !selectedPhysio
    ? 'Choose a physiotherapist ↑'
    : serviceType === 'online' && selectedPhysio
      ? selectedPhysio.name
      : 'Picked by our team'

  return (
    <View style={[styles.summaryBar, { paddingBottom: Math.max(insets.bottom, 12) + 2 }]}>
      <View style={styles.summaryBarInner}>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryBarLabel}>BOOKING SUMMARY</Text>
          <Text style={styles.summaryBarPhysio} numberOfLines={1}>{physioLine}</Text>
          {date && timeSlot ? (
            <Text style={styles.summaryBarDate}>{formatBookingDateAndSlot(date, timeSlot)}</Text>
          ) : (
            <Text style={styles.summaryBarDate}>No date selected</Text>
          )}
        </View>
        <Pressable
          style={[styles.summaryConfirmBtn, (!canSubmit || loading) && styles.summaryConfirmBtnDisabled]}
          onPress={onConfirm}
          disabled={!canSubmit || loading}
        >
          {loading
            ? <ActivityIndicator color={colors.white} size="small" />
            : (
              <>
                <Text style={styles.summaryConfirmTxt}>Confirm</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.white} />
              </>
            )
          }
        </Pressable>
      </View>
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PhysioListScreen({ navigation }) {
  const { token } = useAuth()
  const insets = useSafeAreaInsets()

  // Profile
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileName, setProfileName] = useState('')
  const [profileSnapshot, setProfileSnapshot] = useState(null)

  // Location
  const [location, setLocation] = useState('')
  const [addressLat, setAddressLat] = useState(null)
  const [addressLng, setAddressLng] = useState(null)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [locationDraft, setLocationDraft] = useState('')
  const [useDefaultLocation, setUseDefaultLocation] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [mapPin, setMapPin] = useState({ lat: 26.14, lng: 91.74 })

  // Booking fields
  const [date, setDate] = useState(todayISO())
  const [slots, setSlots] = useState([])
  const [timeSlot, setTimeSlot] = useState('')
  const [issue, setIssue] = useState('')
  const [issueOther, setIssueOther] = useState('')
  const [serviceType, setServiceType] = useState('home')
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // Online physio
  const [availablePhysios, setAvailablePhysios] = useState([])
  const [selectedPhysioId, setSelectedPhysioId] = useState('')
  const [physioPickerOpen, setPhysioPickerOpen] = useState(false)
  const [physioLoading, setPhysioLoading] = useState(false)

  // Submit
  const [submitting, setSubmitting] = useState(false)

  // ── Derived ─────────────────────────────────────────────────────────────────
  const resolvedIssue = useMemo(() => {
    if (!issue) return ''
    if (issue === ISSUE_OTHER_VALUE) return issueOther.trim()
    return issue
  }, [issue, issueOther])

  const locOk = Boolean(location.trim() && Number.isFinite(addressLat) && Number.isFinite(addressLng))
  const dateSlotOk = Boolean(locOk && date && timeSlot)
  const issueOk = Boolean(resolvedIssue && (issue !== ISSUE_OTHER_VALUE || issueOther.trim().length >= 2))
  const selectedPhysio = useMemo(
    () => availablePhysios.find((p) => String(p._id) === String(selectedPhysioId)) || null,
    [availablePhysios, selectedPhysioId],
  )
  const selectedPhysioAvatarUri = useMemo(() => assetUrl(selectedPhysio?.avatar), [selectedPhysio])
  const canSubmit = Boolean(
    profileName.trim() && location.trim() && date && timeSlot && resolvedIssue &&
    (serviceType === 'home' || selectedPhysioId),
  )

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    let cancelled = false
    setProfileLoading(true)
    api.get('/profile')
      .then((res) => {
        if (cancelled) return
        const data = res.data || {}
        setProfileSnapshot(data)
        setProfileName(String(data.name || '').trim())
        const addr = String(data?.address?.text || '').trim()
        const legacy = String(data?.location || '').trim()
        const text = addr || legacy
        if (text) setLocation(text)
        if (Number.isFinite(data?.address?.lat)) setAddressLat(Number(data.address.lat))
        if (Number.isFinite(data?.address?.lng)) setAddressLng(Number(data.address.lng))
      })
      .catch(() => { if (!cancelled) setProfileName('') })
      .finally(() => { if (!cancelled) setProfileLoading(false) })
    return () => { cancelled = true }
  }, [token])

  const loadSlots = useCallback(async () => {
    try {
      const res = await api.get('/slots', { params: { date } })
      setSlots((res.data?.slots || []).filter((s) => s.available))
      setTimeSlot('')
    } catch {
      setSlots([])
      setTimeSlot('')
    }
  }, [date])

  useEffect(() => {
    if (!token) return
    loadSlots()
  }, [token, loadSlots])

  // Load nearby physios for online service type
  useEffect(() => {
    if (serviceType !== 'online') {
      setAvailablePhysios([])
      setSelectedPhysioId('')
      return
    }
    if (!Number.isFinite(addressLat) || !Number.isFinite(addressLng)) return
    let cancelled = false
    setPhysioLoading(true)
    api.get('/physios/nearby', { params: { lat: addressLat, lng: addressLng, limit: 12 } })
      .then((res) => {
        if (cancelled) return
        const list = res.data?.physios || []
        setAvailablePhysios(list)
        if (!list.some((p) => String(p._id) === String(selectedPhysioId))) setSelectedPhysioId('')
      })
      .catch(() => { if (!cancelled) { setAvailablePhysios([]); setSelectedPhysioId('') } })
      .finally(() => { if (!cancelled) setPhysioLoading(false) })
    return () => { cancelled = true }
  }, [serviceType, addressLat, addressLng])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function submitBooking() {
    if (!token) { navigation.navigate('Login'); return }
    if (!canSubmit) {
      Toast.show({ type: 'error', text1: 'Complete all required fields' })
      return
    }
    setSubmitting(true)
    try {
      const body = {
        name: profileName,
        location: location.trim(),
        issue: resolvedIssue,
        date,
        timeSlot,
        consentAccepted: true,
        ...(Number.isFinite(addressLat) && { lat: addressLat }),
        ...(Number.isFinite(addressLng) && { lng: addressLng }),
      }

      if (serviceType === 'home') {
        await api.post('/bookings/request-home', body)
        Toast.show({
          type: 'success',
          text1: 'Request sent!',
          text2: 'Our team will assign a physiotherapist soon.',
        })
      } else {
        await api.post('/bookings/request-home', { ...body, physioId: selectedPhysioId })
        Toast.show({ type: 'success', text1: 'Booking confirmed!' })
      }

      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'UserTabs' }] }))
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not create booking' })
    } finally {
      setSubmitting(false)
    }
  }

  async function useMyLocationForModal() {
    try {
      setGeoBusy(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Location permission denied' }); return }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const lat = pos?.coords?.latitude
      const lng = pos?.coords?.longitude
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) { Toast.show({ type: 'error', text1: 'Could not read coordinates' }); return }
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      const first = rev?.[0]
      const text = [first?.name, first?.street, first?.district, first?.city, first?.region]
        .filter(Boolean).join(', ')
      setLocationDraft(text || locationDraft)
      setAddressLat(lat)
      setAddressLng(lng)
      Toast.show({ type: 'success', text1: 'Location captured' })
    } catch {
      Toast.show({ type: 'error', text1: 'Could not read your location' })
    } finally {
      setGeoBusy(false)
    }
  }

  async function useMyLocationForMapPicker() {
    try {
      setGeoBusy(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Location permission denied' }); return }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const lat = pos?.coords?.latitude
      const lng = pos?.coords?.longitude
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      setMapPin({ lat, lng })
    } finally {
      setGeoBusy(false)
    }
  }

  async function applyMapPin() {
    const lat = Number(mapPin?.lat)
    const lng = Number(mapPin?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { Toast.show({ type: 'error', text1: 'Pick a valid location' }); return }
    setAddressLat(lat)
    setAddressLng(lng)
    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      const first = rev?.[0]
      const text = [first?.name, first?.street, first?.district, first?.city, first?.region]
        .filter(Boolean).join(', ')
      setLocationDraft(text || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } catch {
      setLocationDraft(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    }
    setMapPickerOpen(false)
  }

  async function applyLocationDraft() {
    const txt = locationDraft.trim()
    if (!txt) { Toast.show({ type: 'error', text1: 'Enter location' }); return }
    setLocation(txt)
    if (useDefaultLocation) {
      try {
        const p = profileSnapshot || {}
        const fullPayload = {
          name: String(profileName || p.name || '').trim(),
          email: String(p.email || '').trim(),
          dob: p.dob ? String(p.dob).slice(0, 10) : '',
          gender: String(p.gender || ''),
          address: { text: txt, lat: Number.isFinite(addressLat) ? addressLat : null, lng: Number.isFinite(addressLng) ? addressLng : null },
        }
        if (!fullPayload.dob) { Toast.show({ type: 'error', text1: 'Set date of birth in Profile first' }); return }
        await api.patch('/profile', fullPayload)
      } catch {
        Toast.show({ type: 'error', text1: 'Could not save default location' })
      }
    }
    setLocationModalOpen(false)
  }

  function openMyBookings() {
    navigation.navigate('UserTabs', { screen: 'Bookings', params: { screen: 'BookingsList' } })
  }

  // ── Unauthenticated ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <View style={[styles.unauthRoot, { paddingTop: Math.max(insets.top, 20) + 20 }]}>
        <View style={styles.unauthIconWrap}>
          <Ionicons name="calendar-outline" size={36} color={colors.white} />
        </View>
        <Text style={styles.unauthTitle}>Book a session</Text>
        <Text style={styles.unauthSub}>Sign in to book a verified physiotherapy home visit in Assam.</Text>
        <Pressable
          style={({ pressed }) => [styles.unauthBtn, pressed && { opacity: 0.9 }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.unauthBtnTxt}>Sign in to continue</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.white} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Register')} style={styles.unauthSecondary}>
          <Text style={styles.unauthSecondaryTxt}>Create an account</Text>
        </Pressable>
      </View>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page header ──────────────────────────── */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageTitle}>Book a session</Text>
            <Text style={styles.pageSub}>Choose when and where — we'll find the best physio for you.</Text>
          </View>
          <Pressable style={styles.myBookingsBtn} onPress={openMyBookings}>
            <Ionicons name="calendar-outline" size={13} color={colors.brand} />
            <Text style={styles.myBookingsTxt}>My bookings</Text>
          </Pressable>
        </View>

        {/* ── Profile name warning ──────────────────── */}
        {!profileLoading && !profileName ? (
          <View style={styles.warnBanner}>
            <Ionicons name="information-circle-outline" size={14} color={colors.amber800} />
            <Text style={styles.warnBannerTxt}>Add your name in Profile before confirming a booking.</Text>
          </View>
        ) : null}

        {/* ══ Step 1: Location ══════════════════════════════════════════════════ */}
        <StepCard
          step={1}
          title="Where are you?"
          subtitle="We use your saved address — change anytime for this booking only."
          locked={false}
          done={locOk}
        >
          {profileLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.brand} size="small" />
              <Text style={styles.loadingTxt}>Loading your profile…</Text>
            </View>
          ) : (
            <View style={styles.locationContent}>
              {/* Location display card */}
              <View style={styles.locationCard}>
                <View style={styles.locationCardLeft}>
                  <View style={styles.locationIconWrap}>
                    <Ionicons name="location-outline" size={16} color={colors.brand} />
                  </View>
                  <View style={styles.locationCardText}>
                    <Text style={styles.locationAddressTxt} numberOfLines={2}>
                      {location || 'Set your visit location'}
                    </Text>
                    {Number.isFinite(addressLat) && Number.isFinite(addressLng) ? (
                      <Text style={styles.locationCoordsTxt}>
                        {Number(addressLat).toFixed(4)}, {Number(addressLng).toFixed(4)} · GPS confirmed
                      </Text>
                    ) : (
                      <Text style={styles.locationCoordsWarn}>No GPS coordinates — tap Change</Text>
                    )}
                  </View>
                </View>
                <Pressable
                  style={styles.changeLocBtn}
                  onPress={() => {
                    setLocationDraft(location || '')
                    setUseDefaultLocation(false)
                    setMapPin({ lat: Number.isFinite(addressLat) ? addressLat : 26.14, lng: Number.isFinite(addressLng) ? addressLng : 91.74 })
                    setLocationModalOpen(true)
                  }}
                >
                  <Text style={styles.changeLocTxt}>Change</Text>
                </Pressable>
              </View>

              {/* Name field */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Your name</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileName}
                  onChangeText={setProfileName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>
          )}
        </StepCard>

        {/* ══ Step 2: When ══════════════════════════════════════════════════════ */}
        <StepCard
          step={2}
          title="When works for you?"
          subtitle="Pick a date, service type, and an available time slot."
          locked={!locOk}
          done={dateSlotOk}
        >
          {/* Service type toggle */}
          <View style={styles.serviceToggle}>
            {[
              { value: 'home', label: 'Home visit', icon: 'home-outline' },
              { value: 'online', label: 'Online', icon: 'videocam-outline' },
            ].map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.serviceToggleBtn, serviceType === opt.value && styles.serviceToggleBtnOn]}
                onPress={() => setServiceType(opt.value)}
              >
                <Ionicons
                  name={opt.icon}
                  size={13}
                  color={serviceType === opt.value ? colors.brand : colors.textSecondary}
                />
                <Text style={[styles.serviceToggleTxt, serviceType === opt.value && styles.serviceToggleTxtOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Date picker */}
          <Text style={styles.fieldLabel}>Date</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.webDateWrap}>
              <input
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, color: '#0f172a', background: 'transparent' }}
              />
            </View>
          ) : (
            <Pressable style={styles.dateBtn} onPress={() => setDatePickerOpen(true)}>
              <Ionicons name="calendar-outline" size={15} color={colors.brand} />
              <Text style={styles.dateBtnTxt}>{date ? prettyDate(date) : 'Select date'}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.textTertiary} />
            </Pressable>
          )}

          {datePickerOpen && Platform.OS !== 'ios' && Platform.OS !== 'web' ? (
            <DateTimePicker
              value={new Date(date)}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(ev, picked) => {
                setDatePickerOpen(false)
                if (ev.type === 'set' && picked) {
                  const y = picked.getFullYear()
                  const m = String(picked.getMonth() + 1).padStart(2, '0')
                  const d = String(picked.getDate()).padStart(2, '0')
                  setDate(`${y}-${m}-${d}`)
                }
              }}
            />
          ) : null}
          {datePickerOpen && Platform.OS === 'ios' ? (
            <View style={styles.iosPickerWrap}>
              <DateTimePicker
                value={new Date(date)}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_, picked) => {
                  if (picked) {
                    const y = picked.getFullYear()
                    const m = String(picked.getMonth() + 1).padStart(2, '0')
                    const d = String(picked.getDate()).padStart(2, '0')
                    setDate(`${y}-${m}-${d}`)
                  }
                }}
              />
              <Pressable style={styles.iosPickerDone} onPress={() => setDatePickerOpen(false)}>
                <Text style={styles.iosPickerDoneTxt}>Done</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Time slot */}
          <View style={styles.slotSection}>
            {slots.length === 0 ? (
              <View style={styles.noSlotsBox}>
                <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                <Text style={styles.noSlotsTxt}>No slots available for this date</Text>
              </View>
            ) : (
              <DropdownField
                label="TIME SLOT"
                value={timeSlot}
                placeholder="Select a time"
                options={slots.map((s) => ({
                  label: formatBookingTimeSlot(s.timeSlot),
                  value: s.timeSlot,
                }))}
                onSelect={setTimeSlot}
              />
            )}
          </View>
        </StepCard>

        {/* ══ Step 3: Issue ═════════════════════════════════════════════════════ */}
        <StepCard
          step={3}
          title="What do you need help with?"
          subtitle="Select your concern so we can match the right specialist."
          locked={!dateSlotOk}
          done={issueOk}
        >
          <View style={styles.issueGrid}>
            {ISSUE_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.issueChip, issue === opt && styles.issueChipOn]}
                onPress={() => { setIssue(opt); setIssueOther('') }}
              >
                <Text style={[styles.issueChipTxt, issue === opt && styles.issueChipTxtOn]}>{opt}</Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.issueChip, issue === ISSUE_OTHER_VALUE && styles.issueChipOn]}
              onPress={() => setIssue(ISSUE_OTHER_VALUE)}
            >
              <Text style={[styles.issueChipTxt, issue === ISSUE_OTHER_VALUE && styles.issueChipTxtOn]}>Other</Text>
            </Pressable>
          </View>

          {issue === ISSUE_OTHER_VALUE ? (
            <View style={[styles.fieldWrap, { marginTop: 12 }]}>
              <Text style={styles.fieldLabel}>Describe your condition</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={issueOther}
                onChangeText={setIssueOther}
                placeholder="e.g. shoulder stiffness, sports injury…"
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              {issueOther.length === 1 ? (
                <Text style={styles.fieldHint}>Enter at least 2 characters.</Text>
              ) : null}
            </View>
          ) : null}
        </StepCard>

        {/* ══ Step 4: Physio / Matching ══════════════════════════════════════════ */}
        <StepCard
          step={4}
          title={serviceType === 'online' ? 'Choose your physiotherapist' : 'How matching works'}
          subtitle={
            serviceType === 'online'
              ? 'Pick a registered physiotherapist for your online consultation.'
              : 'You don\'t need to choose — our team picks the best match for your slot.'
          }
          locked={!issueOk}
          done={false}
        >
          {serviceType === 'online' ? (
            <View>
              {/* Physio selector button */}
              <Pressable
                style={[styles.physioSelectorBtn, selectedPhysio && styles.physioSelectorBtnSelected]}
                onPress={() => setPhysioPickerOpen(true)}
              >
                {selectedPhysio ? (
                  <View style={styles.physioSelectorContent}>
                    <View
                      style={[
                        styles.physioSelectorAvatar,
                        selectedPhysioAvatarUri && styles.physioSelectorAvatarPhoto,
                      ]}
                    >
                      {selectedPhysioAvatarUri ? (
                        <Image
                          source={{ uri: selectedPhysioAvatarUri }}
                          style={styles.physioSelectorAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.physioSelectorAvatarTxt}>{physioInitial(selectedPhysio.name)}</Text>
                      )}
                    </View>
                    <View style={styles.physioSelectorBody}>
                      <Text style={styles.physioSelectorName}>{selectedPhysio.name}</Text>
                      {selectedPhysio.specialization ? (
                        <Text style={styles.physioSelectorSpec} numberOfLines={1}>{selectedPhysio.specialization}</Text>
                      ) : null}
                    </View>
                    <View style={styles.physioSelectorChangePill}>
                      <Text style={styles.physioSelectorChangeTxt}>Change</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.physioSelectorEmpty}>
                    <View style={styles.physioSelectorEmptyIcon}>
                      <Ionicons name="person-add-outline" size={20} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.physioSelectorEmptyTitle}>Select physiotherapist</Text>
                      <Text style={styles.physioSelectorEmptySub}>Open list and choose who you want to consult with.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.brand} />
                  </View>
                )}
              </Pressable>
              {!selectedPhysio ? (
                <View style={styles.onlineHintRow}>
                  <Ionicons name="alert-circle-outline" size={12} color={colors.warning} />
                  <Text style={styles.onlineHintTxt}>Please select a physiotherapist to continue.</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.howItWorksCard}>
              <View style={styles.howItWorksRow}>
                <View style={[styles.howItWorksIcon, { backgroundColor: colors.teal50 }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.brand} />
                </View>
                <Text style={styles.howItWorksTxt}>Confirm your booking below.</Text>
              </View>
              <View style={styles.howItWorksRow}>
                <View style={[styles.howItWorksIcon, { backgroundColor: colors.blue50 }]}>
                  <Ionicons name="people-outline" size={16} color={colors.blue600} />
                </View>
                <Text style={styles.howItWorksTxt}>Our admin team picks a verified physiotherapist for your slot.</Text>
              </View>
              <View style={[styles.howItWorksRow, { marginBottom: 0 }]}>
                <View style={[styles.howItWorksIcon, { backgroundColor: colors.violet50 }]}>
                  <Ionicons name="notifications-outline" size={16} color={colors.violet800} />
                </View>
                <Text style={styles.howItWorksTxt}>You'll see their name and contact once matched.</Text>
              </View>
            </View>
          )}
        </StepCard>
      </ScrollView>

      {/* ── Sticky summary bar ────────────────────────────────────────────── */}
      <BookingSummaryBar
        selectedPhysio={serviceType === 'online' ? selectedPhysio : null}
        date={date}
        timeSlot={timeSlot}
        serviceType={serviceType}
        canSubmit={canSubmit}
        loading={submitting}
        onConfirm={submitBooking}
      />

      {/* ── Location modal ────────────────────────────────────────────────── */}
      <Modal transparent visible={locationModalOpen} animationType="slide" onRequestClose={() => setLocationModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLocationModalOpen(false)} />
          <SafeAreaView edges={['bottom']} style={styles.locationModal}>
            {/* Header */}
            <View style={styles.locationModalHeader}>
              <View style={styles.locationModalIconWrap}>
                <Ionicons name="location-outline" size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationModalTitle}>Set visit location</Text>
                <Text style={styles.locationModalSub}>Search, use GPS, or drop a pin on the map.</Text>
              </View>
              <Pressable onPress={() => setLocationModalOpen(false)} hitSlop={12} style={styles.locationModalClose}>
                <Ionicons name="close" size={15} color={colors.slate400} />
              </Pressable>
            </View>
            <View style={styles.locationModalDivider} />

            {/* Search input */}
            <Text style={styles.fieldLabel}>Address</Text>
            <View style={styles.locationSearchField}>
              <Ionicons name="search-outline" size={14} color={colors.textTertiary} />
              <TextInput
                value={locationDraft}
                onChangeText={setLocationDraft}
                placeholder="Enter address or locality"
                style={styles.locationSearchInput}
                placeholderTextColor={colors.textTertiary}
              />
              {locationDraft.length > 0 ? (
                <Pressable onPress={() => setLocationDraft('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={14} color={colors.textTertiary} />
                </Pressable>
              ) : null}
            </View>

            {/* Action buttons */}
            <Pressable
              style={styles.locationActionBtn}
              onPress={() => { setMapPickerOpen(true) }}
            >
              <View style={styles.locationActionIcon}>
                <Ionicons name="map-outline" size={16} color={colors.brand} />
              </View>
              <Text style={styles.locationActionTxt}>Select on map</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.slate400} />
            </Pressable>

            <Pressable
              style={[styles.locationActionBtn, geoBusy && { opacity: 0.6 }]}
              onPress={useMyLocationForModal}
              disabled={geoBusy}
            >
              <View style={[styles.locationActionIcon, { backgroundColor: colors.emerald50 }]}>
                {geoBusy
                  ? <ActivityIndicator size="small" color={colors.emerald700} />
                  : <Ionicons name="navigate-outline" size={16} color={colors.emerald700} />
                }
              </View>
              <Text style={styles.locationActionTxt}>{geoBusy ? 'Locating…' : 'Use my location'}</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.slate400} />
            </Pressable>

            {/* Save as default checkbox */}
            <Pressable style={styles.checkboxRow} onPress={() => setUseDefaultLocation((v) => !v)}>
              <View style={[styles.checkboxBox, useDefaultLocation && styles.checkboxBoxOn]}>
                {useDefaultLocation ? <Ionicons name="checkmark" size={10} color={colors.white} /> : null}
              </View>
              <Text style={styles.checkboxTxt}>Save as my default location</Text>
            </Pressable>

            {/* Confirm */}
            <Pressable
              style={[styles.locationConfirmBtn, !locationDraft.trim() && styles.locationConfirmBtnDisabled]}
              onPress={applyLocationDraft}
              disabled={!locationDraft.trim()}
            >
              <Text style={styles.locationConfirmTxt}>Use this location</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.white} />
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Online physio picker modal ────────────────────────────────────── */}
      <Modal transparent visible={physioPickerOpen} animationType="slide" onRequestClose={() => setPhysioPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPhysioPickerOpen(false)} />
          <SafeAreaView edges={['bottom']} style={styles.physioPickerModal}>
            {/* Header */}
            <View style={styles.physioPickerHeader}>
              <View style={styles.physioPickerHeaderLeft}>
                <Text style={styles.physioPickerTitle}>Select physiotherapist</Text>
                <Text style={styles.physioPickerSub}>Choose a registered physio for online consultation.</Text>
              </View>
              <Pressable onPress={() => setPhysioPickerOpen(false)} hitSlop={12} style={styles.locationModalClose}>
                <Ionicons name="close" size={15} color={colors.slate400} />
              </Pressable>
            </View>
            <View style={styles.locationModalDivider} />

            {/* Physio list */}
            {physioLoading ? (
              <View style={styles.physioPickerLoading}>
                <ActivityIndicator size="large" color={colors.brand} />
                <Text style={styles.physioPickerLoadingTxt}>Loading physiotherapists…</Text>
              </View>
            ) : availablePhysios.length === 0 ? (
              <View style={styles.physioPickerEmpty}>
                <View style={styles.physioPickerEmptyIcon}>
                  <Ionicons name="person-outline" size={28} color={colors.textTertiary} />
                </View>
                <Text style={styles.physioPickerEmptyTitle}>No physiotherapists found</Text>
                <Text style={styles.physioPickerEmptySub}>Try changing your location or check back later.</Text>
              </View>
            ) : (
              <ScrollView style={styles.physioList} showsVerticalScrollIndicator={false}>
                {availablePhysios.map((p) => (
                  <PhysioPickerCard
                    key={p._id}
                    physio={p}
                    selected={String(selectedPhysioId) === String(p._id)}
                    onSelect={() => setSelectedPhysioId(String(p._id))}
                  />
                ))}
                <View style={{ height: 16 }} />
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.physioPickerFooter}>
              <Pressable
                style={styles.physioPickerCancel}
                onPress={() => setPhysioPickerOpen(false)}
              >
                <Text style={styles.physioPickerCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.physioPickerConfirm, !selectedPhysioId && styles.physioPickerConfirmDisabled]}
                onPress={() => setPhysioPickerOpen(false)}
                disabled={!selectedPhysioId}
              >
                <Text style={styles.physioPickerConfirmTxt}>
                  {selectedPhysioId ? 'Confirm selection' : 'Select a physio'}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Map picker ────────────────────────────────────────────────────── */}
      <MapPickerModal
        visible={mapPickerOpen}
        pin={mapPin}
        geoBusy={geoBusy}
        onClose={() => setMapPickerOpen(false)}
        onPick={setMapPin}
        onUseMyLocation={useMyLocationForMapPicker}
        onUseLocation={applyMapPin}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  // Unauthenticated
  unauthRoot: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.canvas,
    paddingHorizontal: 32,
  },
  unauthIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  unauthTitle: { fontFamily: font.bold, fontSize: type['2xl'], color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 10 },
  unauthSub: { fontFamily: font.regular, fontSize: type.base, lineHeight: leading.base, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  unauthBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  unauthBtnTxt: { fontFamily: font.bold, fontSize: type.md, color: colors.white },
  unauthSecondary: { paddingVertical: 10 },
  unauthSecondaryTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.brand },

  // Page header
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  pageHeaderLeft: { flex: 1 },
  pageTitle: { fontFamily: font.bold, fontSize: type['2xl'], color: colors.textPrimary, letterSpacing: -0.4 },
  pageSub: { marginTop: 4, fontFamily: font.regular, fontSize: type.base, lineHeight: leading.base, color: colors.textSecondary },
  myBookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 0,
    marginTop: 4,
  },
  myBookingsTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },

  // Warning banner
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.amber50,
    borderWidth: 1,
    borderColor: colors.amber200,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  warnBannerTxt: { fontFamily: font.medium, fontSize: type.sm, color: colors.amber800, flex: 1, lineHeight: leading.sm },

  // Step card
  stepCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...CARD_SHADOW,
  },
  stepCardLocked: { opacity: 0.5 },
  stepHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  stepBadgeLocked: { backgroundColor: colors.slate200, shadowOpacity: 0 },
  stepBadgeDone: { backgroundColor: colors.success, shadowColor: colors.success },
  stepBadgeTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },
  stepHeadText: { flex: 1 },
  stepTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary },
  stepTitleLocked: { color: colors.textSecondary },
  stepSub: { marginTop: 3, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: leading.sm },
  stepSubLocked: { color: colors.slate400 },
  stepBodyLocked: { opacity: 0 },

  // Loading row
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingTxt: { fontFamily: font.regular, fontSize: type.base, color: colors.textTertiary },

  // Location card
  locationContent: { gap: 14 },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
  },
  locationCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  locationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationCardText: { flex: 1, minWidth: 0 },
  locationAddressTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary, lineHeight: leading.sm },
  locationCoordsTxt: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.success },
  locationCoordsWarn: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.warning },
  changeLocBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    backgroundColor: colors.white,
    flexShrink: 0,
  },
  changeLocTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },

  // Field
  fieldWrap: {},
  fieldLabel: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  fieldHint: { marginTop: 4, fontFamily: font.regular, fontSize: type.sm, color: colors.warning },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },

  // Service toggle
  serviceToggle: {
    flexDirection: 'row',
    backgroundColor: colors.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 4,
    gap: 4,
    marginBottom: 18,
  },
  serviceToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  serviceToggleBtnOn: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  serviceToggleTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary },
  serviceToggleTxtOn: { color: colors.brand },

  // Date button
  dateBtn: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    marginBottom: 18,
  },
  dateBtnTxt: { flex: 1, fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },
  webDateWrap: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginBottom: 18,
  },
  iosPickerWrap: { gap: 10, marginBottom: 18 },
  iosPickerDone: {
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosPickerDoneTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },

  // Slots
  slotSection: {},
  noSlotsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
  },
  noSlotsTxt: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary },

  // Issue chips
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  issueChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  issueChipOn: {
    borderColor: colors.brand,
    backgroundColor: colors.teal50,
  },
  issueChipTxt: { fontFamily: font.medium, fontSize: type.sm, color: colors.textSecondary },
  issueChipTxtOn: { fontFamily: font.semiBold, color: colors.brand },

  // How it works
  howItWorksCard: {
    backgroundColor: colors.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    gap: 0,
  },
  howItWorksRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  howItWorksIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  howItWorksTxt: { flex: 1, fontFamily: font.regular, fontSize: type.base, lineHeight: leading.base, color: colors.textPrimary, paddingTop: 6 },

  // Online selector button
  physioSelectorBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderStyle: 'dashed',
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  physioSelectorBtnSelected: {
    borderColor: colors.brand,
    borderStyle: 'solid',
    backgroundColor: colors.teal50,
  },
  physioSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  physioSelectorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  physioSelectorAvatarPhoto: { backgroundColor: colors.slate200 },
  physioSelectorAvatarImage: { width: 40, height: 40 },
  physioSelectorAvatarTxt: { fontFamily: font.bold, fontSize: type.lg, color: colors.white },
  physioSelectorBody: { flex: 1, minWidth: 0 },
  physioSelectorName: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },
  physioSelectorSpec: { marginTop: 1, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  physioSelectorChangePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  physioSelectorChangeTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.brand },
  physioSelectorEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  physioSelectorEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  physioSelectorEmptyTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.brand },
  physioSelectorEmptySub: { marginTop: 2, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  onlineHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  onlineHintTxt: { fontFamily: font.medium, fontSize: type.sm, color: colors.warning },

  // Booking summary bar
  summaryBar: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  summaryBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryInfo: { flex: 1, minWidth: 0 },
  summaryBarLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryBarPhysio: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.textPrimary,
    marginTop: 1,
  },
  summaryBarDate: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  summaryConfirmBtn: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 13,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flexShrink: 0,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryConfirmBtnDisabled: { backgroundColor: colors.slate300, shadowOpacity: 0 },
  summaryConfirmTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },

  // Location modal
  locationModal: {
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  locationModalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 0 },
  locationModalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationModalTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary },
  locationModalSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  locationModalClose: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 4,
  },
  locationModalDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle, marginVertical: 16 },
  locationSearchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.canvas,
    marginBottom: 12,
  },
  locationSearchInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.textPrimary,
  },
  locationActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 10,
  },
  locationActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationActionTxt: { flex: 1, fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  checkboxBox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: colors.slate300,
    borderRadius: 5,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxBoxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkboxTxt: { flex: 1, fontFamily: font.medium, fontSize: type.sm, color: colors.textSecondary },
  locationConfirmBtn: {
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  locationConfirmBtnDisabled: { backgroundColor: colors.slate300, shadowOpacity: 0 },
  locationConfirmTxt: { fontFamily: font.bold, fontSize: type.md, color: colors.white },

  // Physio picker modal
  physioPickerModal: {
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  physioPickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 0,
  },
  physioPickerHeaderLeft: { flex: 1 },
  physioPickerTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary },
  physioPickerSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  physioPickerLoading: { alignItems: 'center', gap: 12, padding: 40 },
  physioPickerLoadingTxt: { fontFamily: font.regular, fontSize: type.base, color: colors.textSecondary },
  physioPickerEmpty: { alignItems: 'center', padding: 40, gap: 10 },
  physioPickerEmptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  physioPickerEmptyTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  physioPickerEmptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary, textAlign: 'center' },
  physioList: { paddingHorizontal: 16 },
  physioPickerFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  physioPickerCancel: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  physioPickerCancelTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary },
  physioPickerConfirm: {
    flex: 2,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  physioPickerConfirmDisabled: { backgroundColor: colors.slate300, shadowOpacity: 0 },
  physioPickerConfirmTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },

  // Physio picker card
  physioCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginVertical: 5,
    ...CARD_SHADOW,
    overflow: 'hidden',
  },
  physioCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.teal50,
    shadowColor: colors.brand,
    shadowOpacity: 0.12,
  },
  physioCardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  physioAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  physioAvatarRing: {
    borderWidth: 2,
    borderColor: colors.brand,
  },
  physioAvatarImg: { width: '100%', height: '100%' },
  physioAvatarSelected: { backgroundColor: colors.brand },
  physioAvatarTxt: { fontFamily: font.bold, fontSize: type.lg, color: colors.slate600 },
  physioAvatarTxtSelected: { color: colors.white },
  physioCardBody: { flex: 1, minWidth: 0 },
  physioCardTopRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 },
  physioCardName: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary, flex: 1 },
  physioCardFee: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary, flexShrink: 0 },
  physioCardSpec: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, marginTop: 2 },
  physioCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  physioStarRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  physioRatingTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.textSecondary, marginLeft: 3 },
  physioMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  physioMetaPillTxt: { fontFamily: font.regular, fontSize: 9, color: colors.textTertiary },
  physioSelectDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  physioSelectDotOn: { backgroundColor: colors.brand, borderColor: colors.brand },
})
