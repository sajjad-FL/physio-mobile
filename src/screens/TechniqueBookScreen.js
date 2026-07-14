import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Location from 'expo-location'
import Toast from 'react-native-toast-message'
import { CommonActions, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../api/client'
import { getTechniqueBySlug } from '../constants/techniques'
import { usePricingSettings } from '../api/queries'
import MapPickerModal from '../components/booking/MapPickerModal'
import RequiredMark from '../components/ui/RequiredMark'
import { todayISO, defaultBookableDate, filterSelectableSlots } from '../constants/slots'
import { formatBookingTimeSlot } from '../utils/date'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'

export default function TechniqueBookScreen({ navigation, route }) {
  const slug = route.params?.slug
  const tech = getTechniqueBySlug(slug)
  const { data: settings } = usePricingSettings()
  const scrollRef = useRef(null)

  const [profileName, setProfileName] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [location, setLocation] = useState('')
  const [lat, setLat] = useState(null)
  const [lng, setLng] = useState(null)
  const [editingLocation, setEditingLocation] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [mapPin, setMapPin] = useState({ lat: 26.14, lng: 91.74 })
  const [date, setDate] = useState(defaultBookableDate)
  const [timeSlot, setTimeSlot] = useState('')
  const [slots, setSlots] = useState([])
  const [consent, setConsent] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const price = Number(settings?.techniquePrices?.[tech?.bookingIssue])
  const priceLabel = Number.isFinite(price) && price > 0 ? `₹${price.toLocaleString('en-IN')}` : '—'
  const hasLocation = Boolean(location.trim())
  const showLocationEditor = editingLocation || !hasLocation

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    }, [slug]),
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get('/profile')
        if (cancelled) return
        setProfileName(res.data?.name || '')
        const addr = res.data?.address
        const text = String(addr?.text || '').trim()
        if (text) {
          setLocation(text)
          setEditingLocation(false)
          if (Number.isFinite(addr?.lat) && Number.isFinite(addr?.lng)) {
            setLat(addr.lat)
            setLng(addr.lng)
            setMapPin({ lat: addr.lat, lng: addr.lng })
          }
        } else {
          setEditingLocation(true)
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingSlots(true)
      try {
        const res = await api.get('/slots', { params: { date } })
        if (!cancelled) {
          setSlots(res.data?.slots || [])
          setTimeSlot('')
        }
      } catch {
        if (!cancelled) setSlots([])
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [date])

  const selectableSlots = useMemo(() => filterSelectableSlots(slots, date), [slots, date])

  const canSubmit = useMemo(
    () =>
      Boolean(tech && profileName.trim() && location.trim() && date && timeSlot && consent && !profileLoading),
    [tech, profileName, location, date, timeSlot, consent, profileLoading],
  )

  async function reverseLabel(nextLat, nextLng) {
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: nextLat, longitude: nextLng })
      const g = geo[0]
      if (!g) return `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`
      const parts = [g.name, g.street, g.streetNumber, g.district, g.city, g.region, g.postalCode, g.country]
        .filter(Boolean)
        .map((x) => String(x).trim())
      return [...new Set(parts)].join(', ') || `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`
    } catch {
      return `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`
    }
  }

  async function useMyLocation() {
    setGeoBusy(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission is required' })
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const nextLat = pos.coords.latitude
      const nextLng = pos.coords.longitude
      setLat(nextLat)
      setLng(nextLng)
      setMapPin({ lat: nextLat, lng: nextLng })
      const label = await reverseLabel(nextLat, nextLng)
      setLocation(label)
      setEditingLocation(false)
    } catch (e) {
      Toast.show({ type: 'error', text1: e.message || 'Could not get location' })
    } finally {
      setGeoBusy(false)
    }
  }

  async function applyMapPin() {
    if (!mapPin || !Number.isFinite(mapPin.lat) || !Number.isFinite(mapPin.lng)) return
    setLat(mapPin.lat)
    setLng(mapPin.lng)
    const label = await reverseLabel(mapPin.lat, mapPin.lng)
    setLocation(label)
    setEditingLocation(false)
    setMapPickerOpen(false)
  }

  async function onSubmit() {
    if (!canSubmit || !tech) return
    if (!profileName.trim()) {
      Toast.show({ type: 'error', text1: 'Add your name in Profile before booking' })
      return
    }
    if (!location.trim()) {
      Toast.show({ type: 'error', text1: 'Add a home address to continue' })
      setEditingLocation(true)
      return
    }
    setSubmitting(true)
    try {
      const body = {
        name: profileName.trim(),
        location: location.trim(),
        issue: tech.bookingIssue,
        date,
        timeSlot,
        consentAccepted: true,
      }
      if (lat != null && lng != null) {
        body.lat = lat
        body.lng = lng
      }
      const res = await api.post('/bookings/request-technique', body)
      Toast.show({
        type: 'success',
        text1: 'Booking received',
        text2:
          res.data?.carePath === 'technique_managed'
            ? 'Your care manager will assign a physiotherapist.'
            : 'We will assign a physiotherapist for your home visit.',
      })
      const id = res.data?._id
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'UserTabs',
              state: {
                routes: [
                  {
                    name: 'Bookings',
                    state: {
                      routes: id
                        ? [
                            { name: 'BookingsList' },
                            { name: 'BookingDetail', params: { id } },
                          ]
                        : [{ name: 'BookingsList' }],
                      index: id ? 1 : 0,
                    },
                  },
                ],
              },
            },
          ],
        }),
      )
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Could not book',
        text2: err.response?.data?.message || err.message || 'Try again',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!tech) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Technique not found.</Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Book {tech.label}</Text>
          <Text style={styles.sub}>Home visit · {priceLabel} · physio assigned after booking</Text>
          {profileLoading ? (
            <Text style={styles.hint}>Loading profile…</Text>
          ) : profileName.trim() ? (
            <Text style={styles.bookingAs}>
              Booking as <Text style={styles.bookingAsName}>{profileName.trim()}</Text>
            </Text>
          ) : (
            <Pressable onPress={() => navigation.navigate('ProfileGlobal')}>
              <Text style={styles.warn}>
                Name missing. <Text style={styles.link}>Complete your profile</Text>
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Home address<RequiredMark /></Text>
            {hasLocation && !editingLocation ? (
              <Pressable onPress={() => setEditingLocation(true)}>
                <Text style={styles.change}>Change</Text>
              </Pressable>
            ) : null}
            {hasLocation && editingLocation ? (
              <Pressable onPress={() => setEditingLocation(false)}>
                <Text style={styles.done}>Done</Text>
              </Pressable>
            ) : null}
          </View>

          {!showLocationEditor ? (
            <Text style={styles.addressTxt}>{location}</Text>
          ) : (
            <>
              {!hasLocation ? (
                <Text style={styles.warn}>Add your home address to continue booking.</Text>
              ) : null}
              <TextInput
                style={[styles.input, styles.area]}
                value={location}
                onChangeText={setLocation}
                placeholder="Address / area"
                multiline
              />
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.outlineBtn, geoBusy && { opacity: 0.6 }]}
                  onPress={useMyLocation}
                  disabled={geoBusy}
                >
                  <Ionicons name="navigate-outline" size={14} color={colors.brand || '#0f766e'} />
                  <Text style={styles.outlineBtnTxt}>{geoBusy ? 'Locating…' : 'Use my location'}</Text>
                </Pressable>
                <Pressable
                  style={styles.outlineBtn}
                  onPress={() => {
                    if (Number.isFinite(lat) && Number.isFinite(lng)) setMapPin({ lat, lng })
                    setMapPickerOpen(true)
                  }}
                >
                  <Ionicons name="map-outline" size={14} color={colors.brand || '#0f766e'} />
                  <Text style={styles.outlineBtnTxt}>Pick on map</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Date (YYYY-MM-DD)<RequiredMark /></Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder={todayISO()} />

          <Text style={[styles.label, { marginTop: 14 }]}>Time slot<RequiredMark /></Text>
          {loadingSlots ? (
            <ActivityIndicator color={tech.color} />
          ) : (
            <>
              <View style={styles.slotRow}>
                {selectableSlots.map((s) => (
                  <Pressable
                    key={s.timeSlot}
                    onPress={() => setTimeSlot(s.timeSlot)}
                    style={[
                      styles.slot,
                      timeSlot === s.timeSlot && { backgroundColor: tech.color, borderColor: tech.color },
                    ]}
                  >
                    <Text
                      style={[styles.slotTxt, timeSlot === s.timeSlot && { color: '#fff' }]}
                    >
                      {formatBookingTimeSlot(s.timeSlot)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {selectableSlots.length === 0 ? (
                <Text style={styles.hint}>
                  {date === todayISO()
                    ? 'No slots left today — visits need at least 2 hours’ notice. Pick tomorrow or a later date.'
                    : 'No slots for this date — try another day.'}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <Pressable style={styles.consentRow} onPress={() => setConsent((v) => !v)}>
          <View style={[styles.check, consent && { backgroundColor: tech.color, borderColor: tech.color }]} />
          <Text style={styles.consentTxt}>
            I consent to a physiotherapist visiting my home for this treatment session.
            <RequiredMark />
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          disabled={!canSubmit || submitting}
          onPress={onSubmit}
          style={[
            styles.cta,
            { backgroundColor: tech.color, opacity: !canSubmit || submitting ? 0.5 : 1 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaTxt}>Confirm · {priceLabel}</Text>
          )}
        </Pressable>
      </View>

      <MapPickerModal
        visible={mapPickerOpen}
        pin={mapPin}
        geoBusy={geoBusy}
        onClose={() => setMapPickerOpen(false)}
        onPick={setMapPin}
        onUseMyLocation={useMyLocation}
        onUseLocation={applyMapPin}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#64748b' },
  scroll: { padding: 16, paddingBottom: 100, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  title: { fontSize: type.lg, fontFamily: font.bold, color: colors.textPrimary },
  sub: { marginTop: 4, fontSize: type.sm, color: colors.textSecondary },
  hint: { marginTop: 12, fontSize: type.sm, color: colors.textSecondary },
  bookingAs: { marginTop: 12, fontSize: type.sm, color: colors.textPrimary },
  bookingAsName: { fontFamily: font.semibold, color: colors.textPrimary },
  warn: { marginTop: 8, marginBottom: 8, fontSize: 12, color: '#92400e' },
  link: { color: '#0f766e', fontFamily: font.semibold, textDecorationLine: 'underline' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: {
    fontSize: 11,
    fontFamily: font.semibold,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  change: { fontSize: 12, fontFamily: font.semibold, color: '#0f766e' },
  done: { fontSize: 12, fontFamily: font.semibold, color: '#64748b' },
  addressTxt: { fontSize: type.sm, color: colors.textPrimary, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  area: { minHeight: 72, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  outlineBtnTxt: { fontSize: 13, fontFamily: font.medium, color: colors.textPrimary },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  slotTxt: { fontSize: 13, fontFamily: font.medium, color: colors.textPrimary },
  consentRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    marginTop: 2,
  },
  consentTxt: { flex: 1, fontSize: type.sm, color: colors.textPrimary, lineHeight: 20 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cta: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ctaTxt: { color: '#fff', fontFamily: font.semibold, fontSize: type.md },
})
