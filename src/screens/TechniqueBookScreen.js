import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { CommonActions } from '@react-navigation/native'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getTechniqueBySlug } from '../constants/techniques'
import { usePricingSettings } from '../api/queries'
import { formatBookingTimeSlot } from '../utils/date'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function TechniqueBookScreen({ navigation, route }) {
  const slug = route.params?.slug
  const tech = getTechniqueBySlug(slug)
  const { user } = useAuth()
  const { data: settings } = usePricingSettings()

  const [name, setName] = useState(user?.name || '')
  const [location, setLocation] = useState(user?.location || '')
  const [date, setDate] = useState(todayISO())
  const [timeSlot, setTimeSlot] = useState('')
  const [slots, setSlots] = useState([])
  const [consent, setConsent] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const price = Number(settings?.techniquePrices?.[tech?.bookingIssue])
  const priceLabel = Number.isFinite(price) && price > 0 ? `₹${price.toLocaleString('en-IN')}` : '—'

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

  const canSubmit = useMemo(
    () => Boolean(tech && name.trim() && location.trim() && date && timeSlot && consent),
    [tech, name, location, date, timeSlot, consent],
  )

  async function onSubmit() {
    if (!canSubmit || !tech) return
    setSubmitting(true)
    try {
      const res = await api.post('/bookings/request-technique', {
        name: name.trim(),
        location: location.trim(),
        issue: tech.bookingIssue,
        date,
        timeSlot,
        consentAccepted: true,
      })
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Book {tech.label}</Text>
        <Text style={styles.sub}>Home visit · {priceLabel} · no care manager</Text>

        <Text style={styles.label}>Your name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />

        <Text style={styles.label}>Home address</Text>
        <TextInput
          style={[styles.input, styles.area]}
          value={location}
          onChangeText={setLocation}
          placeholder="Address / area"
          multiline
        />

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder={todayISO()} />

        <Text style={styles.label}>Time slot</Text>
        {loadingSlots ? (
          <ActivityIndicator color={tech.color} />
        ) : (
          <View style={styles.slotRow}>
            {(slots || [])
              .filter((s) => s.available !== false)
              .map((s) => (
                <Pressable
                  key={s.timeSlot}
                  onPress={() => setTimeSlot(s.timeSlot)}
                  style={[
                    styles.slot,
                    timeSlot === s.timeSlot && { backgroundColor: tech.color, borderColor: tech.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.slotTxt,
                      timeSlot === s.timeSlot && { color: '#fff' },
                    ]}
                  >
                    {formatBookingTimeSlot(s.timeSlot)}
                  </Text>
                </Pressable>
              ))}
          </View>
        )}

        <Pressable style={styles.consentRow} onPress={() => setConsent((v) => !v)}>
          <View style={[styles.check, consent && { backgroundColor: tech.color, borderColor: tech.color }]} />
          <Text style={styles.consentTxt}>
            I consent to a physiotherapist visiting my home for this treatment session.
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
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#64748b' },
  scroll: { padding: 16, paddingBottom: 100 },
  title: { fontSize: type.lg, fontFamily: font.bold, color: colors.textPrimary },
  sub: { marginTop: 4, marginBottom: 16, fontSize: type.sm, color: colors.textSecondary },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 11,
    fontFamily: font.semibold,
    color: '#64748b',
    textTransform: 'uppercase',
  },
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
  consentRow: { flexDirection: 'row', gap: 10, marginTop: 20, alignItems: 'flex-start' },
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
