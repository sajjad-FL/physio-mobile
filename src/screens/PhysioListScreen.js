import { useCallback, useEffect, useMemo, useState } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { CommonActions } from '@react-navigation/native'
import * as Location from 'expo-location'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ISSUE_OPTIONS, ISSUE_OTHER_VALUE } from '../constants/issues'
import { formatBookingTimeSlot } from '../utils/date'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import StepShell from '../components/ui/StepShell'
import DropdownField from '../components/ui/DropdownField'
import MapPickerModal from '../components/booking/MapPickerModal'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prettyDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  if (!y || !m || !d) return iso
  return `${d}-${m}-${y}`
}


export default function PhysioListScreen({ navigation }) {
  const { token } = useAuth()
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileName, setProfileName] = useState('')
  const [profileSnapshot, setProfileSnapshot] = useState(null)

  const [location, setLocation] = useState('')
  const [date, setDate] = useState(todayISO())
  const [slots, setSlots] = useState([])
  const [timeSlot, setTimeSlot] = useState('')
  const [issue, setIssue] = useState('')
  const [issueOther, setIssueOther] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [locationEditorOpen, setLocationEditorOpen] = useState(false)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [locationDraft, setLocationDraft] = useState('')
  const [useDefaultLocation, setUseDefaultLocation] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [serviceType, setServiceType] = useState('home')
  const [addressLat, setAddressLat] = useState(null)
  const [addressLng, setAddressLng] = useState(null)
  const [mapPin, setMapPin] = useState({ lat: 17.36162, lng: 78.47452 })

  const resolvedIssue = useMemo(() => {
    if (!issue) return ''
    if (issue === ISSUE_OTHER_VALUE) return issueOther.trim()
    return issue
  }, [issue, issueOther])

  const locOk = Boolean(location.trim() && Number.isFinite(addressLat) && Number.isFinite(addressLng))
  const dateSlotOk = Boolean(locOk && date && timeSlot)
  const issueOk = Boolean(resolvedIssue && (issue !== ISSUE_OTHER_VALUE || issueOther.trim().length >= 2))
  const canSubmit = Boolean(profileName.trim() && location.trim() && date && timeSlot && resolvedIssue)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      setProfileLoading(true)
      try {
        const res = await api.get('/profile')
        if (cancelled) return
        const data = res.data || {}
        setProfileSnapshot(data)
        setProfileName(String(data.name || '').trim())
        const addr = String(data?.address?.text || '').trim()
        const legacy = String(data?.location || '').trim()
        setLocation(addr || legacy)
        setAddressLat(Number.isFinite(data?.address?.lat) ? Number(data.address.lat) : null)
        setAddressLng(Number.isFinite(data?.address?.lng) ? Number(data.address.lng) : null)
      } catch {
        if (!cancelled) setProfileName('')
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
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

  async function submitHomeRequest() {
    if (!token) {
      navigation.navigate('Login')
      return
    }
    if (!canSubmit) {
      Toast.show({ type: 'error', text1: 'Complete all required fields' })
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/bookings/request-home', {
        name: profileName,
        location: location.trim(),
        issue: resolvedIssue,
        date,
        timeSlot,
        consentAccepted: true,
      })
      Toast.show({
        type: 'success',
        text1: 'Request sent',
        text2: 'Our team will assign a physiotherapist soon.',
      })
      const bookingId = res.data?._id
      if (bookingId) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'UserTabs' }],
          }),
        )
      } else {
        navigation.navigate('UserTabs')
      }
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
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' })
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const lat = pos?.coords?.latitude
      const lng = pos?.coords?.longitude
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        Toast.show({ type: 'error', text1: 'Could not read coordinates' })
        return
      }
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      const first = rev?.[0]
      const text = [first?.name, first?.street, first?.district, first?.city, first?.region, first?.country]
        .filter(Boolean)
        .join(', ')
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
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' })
        return
      }
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
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Toast.show({ type: 'error', text1: 'Pick a valid map location' })
      return
    }
    setAddressLat(lat)
    setAddressLng(lng)
    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      const first = rev?.[0]
      const text = [first?.name, first?.street, first?.district, first?.city, first?.region, first?.country]
        .filter(Boolean)
        .join(', ')
      setLocationDraft(text || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } catch {
      // Keep coordinates even if reverse geocode fails.
      setLocationDraft(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    }
    setMapPickerOpen(false)
  }

  async function applyLocationDraft() {
    const txt = locationDraft.trim()
    if (!txt) {
      Toast.show({ type: 'error', text1: 'Enter location' })
      return
    }
    setLocation(txt)
    if (useDefaultLocation) {
      try {
        // Backend validates full profile schema on PATCH /profile.
        // Re-send required existing fields to avoid DOB/gender validation failures.
        const p = profileSnapshot || {}
        const fullPayload = {
          name: String(profileName || p.name || '').trim(),
          email: String(p.email || '').trim(),
          dob: p.dob ? String(p.dob).slice(0, 10) : '',
          gender: String(p.gender || ''),
          address: {
            text: txt,
            lat: Number.isFinite(addressLat) ? addressLat : null,
            lng: Number.isFinite(addressLng) ? addressLng : null,
          },
        }
        if (!fullPayload.dob) {
          Toast.show({ type: 'error', text1: 'Please set date of birth in Profile first' })
          return
        }
        await api.patch('/profile', {
          ...fullPayload,
        })
      } catch {
        Toast.show({ type: 'error', text1: 'Could not save default location' })
      }
    }
    setLocationModalOpen(false)
  }

  function openMyBookings() {
    // PhysioList is mounted on the root stack; Bookings lives inside UserTabs.
    navigation.navigate('UserTabs', {
      screen: 'Bookings',
      params: { screen: 'BookingsList' },
    })
  }

  if (!token) {
    return (
      <View style={styles.centered}>
        <Card style={styles.signinCard}>
          <Text style={styles.h1}>Book session</Text>
          <Text style={styles.sub}>Sign in to book a verified physiotherapy home visit.</Text>
          <View style={{ height: 12 }} />
          <Button title="Sign in" onPress={() => navigation.navigate('Login')} />
        </Card>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Book a session</Text>
          <Text style={styles.sub}>Choose when and where - our team will pick a physiotherapist for you after booking.</Text>
        </View>
        <Pressable style={styles.myBookingsBtn} onPress={openMyBookings}>
          <Text style={styles.myBookingsTxt}>My bookings</Text>
        </Pressable>
      </View>

      <StepShell
        step={1}
        title="Where are you?"
        subtitle="We use your saved address when available - change anytime for this booking only."
        locked={false}
      >
        {profileLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          <View style={styles.locationWrap}>
            <View style={styles.locationCard}>
              <Text style={styles.locationText}>{location || 'Set your visit location'}</Text>
              {Number.isFinite(addressLat) && Number.isFinite(addressLng) ? (
                <Text style={styles.locationCoords}>
                  {Number(addressLat).toFixed(5)}, {Number(addressLng).toFixed(5)}
                </Text>
              ) : null}
              <Pressable
                style={styles.changeLocBtn}
                onPress={() => {
                  setLocationDraft(location || '')
                  setUseDefaultLocation(false)
                  setMapPin({
                    lat: Number.isFinite(addressLat) ? addressLat : 17.36162,
                    lng: Number.isFinite(addressLng) ? addressLng : 78.47452,
                  })
                  setLocationModalOpen(true)
                }}
              >
                <Text style={styles.changeLocTxt}>Change location</Text>
              </Pressable>
            </View>
            <Text style={styles.locationOk}>Location set ✓</Text>
            {locationEditorOpen ? <Input label="Location" value={location} onChangeText={setLocation} placeholder="Enter visit address" /> : null}
            <View style={{ height: 10 }} />
            <Input label="Name" value={profileName} onChangeText={setProfileName} />
          </View>
        )}
      </StepShell>

      <StepShell step={2} title="When works for you?" subtitle="Pick a date and an available slot." locked={!locOk}>
        <Text style={styles.lbl}>DATE</Text>
        {Platform.OS === 'web' ? (
          <View style={styles.webDateWrap}>
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              style={styles.webDateInput}
            />
          </View>
        ) : (
          <Pressable style={styles.dateBtn} onPress={() => setDatePickerOpen(true)}>
            <Text style={styles.dateBtnTxt}>{date ? prettyDate(date) : 'Select date'}</Text>
          </Pressable>
        )}
        {datePickerOpen && Platform.OS !== 'ios' ? (
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
          <View style={styles.iosPickWrap}>
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
            <Button title="Done" variant="outline" onPress={() => setDatePickerOpen(false)} />
          </View>
        ) : null}
        <View style={{ height: 10 }} />
        <View style={{ height: 10 }} />
        <DropdownField
          label="SLOT"
          value={timeSlot}
          placeholder={slots.length ? 'Select a time' : 'No slots available'}
          options={slots.map((s) => ({ label: formatBookingTimeSlot(s.timeSlot), value: s.timeSlot }))}
          onSelect={setTimeSlot}
        />
        <View style={{ height: 10 }} />
        <DropdownField
          label="SERVICE"
          value={serviceType}
          placeholder="Select service"
          options={[
            { label: 'Home visit', value: 'home' },
            { label: 'Online Consultation', value: 'online' },
          ]}
          onSelect={setServiceType}
        />
      </StepShell>

      <StepShell step={3} title="What do you need help with?" subtitle="" locked={!dateSlotOk}>
        <DropdownField
          label="ISSUE"
          value={issue}
          placeholder="Select your concern"
          options={[
            ...ISSUE_OPTIONS.map((opt) => ({ label: opt, value: opt })),
            { label: 'Other', value: ISSUE_OTHER_VALUE },
          ]}
          onSelect={(v) => {
            setIssue(v)
            if (v !== ISSUE_OTHER_VALUE) setIssueOther('')
          }}
        />
        {issue === ISSUE_OTHER_VALUE ? (
          <>
            <View style={{ height: 10 }} />
            <Input
              label="Describe your issue"
              value={issueOther}
              onChangeText={setIssueOther}
              placeholder="e.g. shoulder stiffness"
            />
          </>
        ) : null}
      </StepShell>

      <StepShell
        step={4}
        title={serviceType === 'online' ? 'Choose your physiotherapist' : 'How matching works'}
        subtitle={
          serviceType === 'online'
            ? 'For online consultation, pick a registered physiotherapist before confirming.'
            : 'You do not need to choose a physiotherapist - our team picks the best match.'
        }
        locked={!issueOk}
      >
        {serviceType === 'online' ? (
          <View style={styles.howItWorksBox}>
            <Text style={styles.howItWorksTitle}>How it works</Text>
            <Text style={styles.howItWorksItem}>- Online physio selection will open here (same as web flow).</Text>
            <Text style={styles.howItWorksItem}>- Confirm booking after choosing your physiotherapist.</Text>
          </View>
        ) : (
          <View style={styles.howItWorksBox}>
            <Text style={styles.howItWorksTitle}>How it works</Text>
            <Text style={styles.howItWorksItem}>- Confirm your booking below (and pay for online sessions).</Text>
            <Text style={styles.howItWorksItem}>- Our admin team picks a verified physiotherapist for your slot.</Text>
            <Text style={styles.howItWorksItem}>- You'll see their name and contact in your booking once matched.</Text>
          </View>
        )}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLbl}>BOOKING SUMMARY</Text>
          <Text style={styles.summaryTitle}>Physio - Picked by our team</Text>
          <Text style={styles.summarySub}>Home visit - our team will pick a physio after you confirm.</Text>
          <View style={{ height: 10 }} />
          <Button
            title="Confirm & continue"
            onPress={submitHomeRequest}
            loading={submitting}
            disabled={!canSubmit || submitting}
            style={styles.confirmBtn}
          />
        </View>
      </StepShell>

      <Modal transparent visible={locationModalOpen} animationType="fade" onRequestClose={() => setLocationModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLocationModalOpen(false)} />
          <View style={styles.locationModalCard}>
            <Text style={styles.locationModalTitle}>Set location</Text>
            <Text style={styles.locationModalSub}>
              Search, use GPS, or drop a pin. This session uses this point until you change it.
            </Text>
            <Text style={styles.lbl}>SEARCH</Text>
            <TextInput
              value={locationDraft}
              onChangeText={setLocationDraft}
              placeholder="Enter address"
              style={styles.locationInput}
              placeholderTextColor={colors.slate400}
            />
            <Pressable
              style={styles.locationModalBtn}
              onPress={() => {
                setMapPickerOpen(true)
              }}
            >
              <Text style={styles.locationModalBtnTxt}>Select on map</Text>
            </Pressable>
            <Pressable style={styles.locationModalBtn} onPress={useMyLocationForModal}>
              <Text style={styles.locationModalBtnTxt}>{geoBusy ? 'Locating...' : 'Use my location'}</Text>
            </Pressable>
            <Pressable style={styles.checkboxRow} onPress={() => setUseDefaultLocation((v) => !v)}>
              <View style={[styles.checkboxBox, useDefaultLocation && styles.checkboxBoxOn]} />
              <Text style={styles.checkboxTxt}>Save as default location (updates your profile)</Text>
            </Pressable>
            <Button title="Use this location" onPress={applyLocationDraft} />
            <View style={{ height: 8 }} />
            <Button title="Cancel" variant="outline" onPress={() => setLocationModalOpen(false)} />
          </View>
        </View>
      </Modal>

      <MapPickerModal
        visible={mapPickerOpen}
        pin={mapPin}
        geoBusy={geoBusy}
        onClose={() => setMapPickerOpen(false)}
        onPick={setMapPin}
        onUseMyLocation={useMyLocationForMapPicker}
        onUseLocation={applyMapPin}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 14, paddingBottom: 36, backgroundColor: colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, padding: 14 },
  signinCard: { width: '100%', maxWidth: 420 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  h1: { fontFamily: font.extraBold, fontSize: type['2xl'], color: colors.textPrimary },
  sub: { marginTop: 6, fontFamily: font.regular, fontSize: type.md, color: colors.textSecondary, lineHeight: leading.md },
  myBookingsBtn: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myBookingsTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.slate700 },
  locationWrap: { gap: 6 },
  locationCard: {
    borderWidth: 1,
    borderColor: colors.slate100,
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: 12,
  },
  locationText: { fontSize: 14, color: colors.slate900, fontWeight: '500' },
  locationCoords: { marginTop: 2, fontSize: 11, color: colors.slate500 },
  changeLocBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  changeLocTxt: { fontSize: 12, fontWeight: '700', color: colors.slate800 },
  locationOk: { fontSize: 12, color: colors.emerald700, fontWeight: '600' },
  lbl: { marginBottom: 8, fontFamily: font.bold, fontSize: type.xs, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', padding: 14, justifyContent: 'center' },
  dateBtn: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  dateBtnTxt: { fontSize: 14, color: colors.slate900, fontVariant: ['tabular-nums'] },
  webDateWrap: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  webDateInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: 14,
    color: '#0f172a',
    background: 'transparent',
  },
  iosPickWrap: { marginTop: 8, gap: 8 },
  muted: { fontSize: 12, color: colors.slate500 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: { paddingHorizontal: 12 },
  summaryCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    padding: 12,
  },
  howItWorksBox: {
    borderWidth: 1,
    borderColor: colors.blue100 || colors.slate200,
    borderRadius: 12,
    backgroundColor: colors.blue50 || colors.slate50,
    padding: 12,
    marginBottom: 10,
  },
  howItWorksTitle: { fontSize: 13, fontWeight: '700', color: colors.slate800, marginBottom: 6 },
  howItWorksItem: { fontSize: 12, color: colors.slate600, lineHeight: 18, marginBottom: 4 },
  summaryLbl: { fontSize: 10, fontWeight: '700', color: colors.slate400 },
  summaryTitle: { marginTop: 4, fontSize: 14, fontWeight: '700', color: colors.slate900 },
  summarySub: { marginTop: 3, fontSize: 12, color: colors.slate500 },
  confirmBtn: { borderRadius: 10 },
  locationModalCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
  },
  locationModalTitle: { fontSize: 18, fontWeight: '700', color: colors.slate900 },
  locationModalSub: { marginTop: 4, marginBottom: 10, fontSize: 13, color: colors.slate500, lineHeight: 18 },
  locationInput: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.slate900,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  locationModalBtn: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: colors.slate50,
  },
  locationModalBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  checkboxBox: { width: 14, height: 14, borderWidth: 1, borderColor: colors.slate400, borderRadius: 3, backgroundColor: colors.white },
  checkboxBoxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkboxTxt: { flex: 1, fontSize: 12, color: colors.slate600 },
})
