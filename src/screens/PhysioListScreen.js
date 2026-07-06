import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import RazorpayCheckout from 'react-native-razorpay'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'
import { api } from '../api/client'
import { useReferralMyCode } from '../api/queries'
import { useAuth } from '../context/AuthContext'
import { ISSUE_OPTIONS, ISSUE_OTHER_VALUE } from '../constants/issues'
import { formatBookingDateAndSlot, formatBookingTimeSlot } from '../utils/date'
import { extractPincode } from '../utils/pincode'
import { assetUrl } from '../utils/assetUrl'
import MapPickerModal from '../components/booking/MapPickerModal'
import DropdownField from '../components/ui/DropdownField'
import WhatsAppSupportFab from '../components/WhatsAppSupportFab'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'

function createAppURL(path) {
  return `physiokhom://${path}`
}

function parseAppURL(url) {
  try {
    const u = new URL(url)
    const queryParams = {}
    u.searchParams.forEach((v, k) => { queryParams[k] = v })
    return { scheme: u.protocol.replace(':', ''), path: u.hostname + u.pathname, queryParams }
  } catch {
    return { scheme: '', path: '', queryParams: {} }
  }
}

const ISSUE_DROPDOWN_OPTIONS = [
  ...ISSUE_OPTIONS.map((opt) => ({ label: opt, value: opt })),
  { label: 'Other', value: ISSUE_OTHER_VALUE },
]

function cleanRazorpayPrefill(prefill) {
  const out = {}
  if (!prefill || typeof prefill !== 'object') return out
  const name = String(prefill.name || '').trim()
  if (name) out.name = name

  const rawPhone = String(prefill.contact || prefill.phone || '').trim()
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length >= 10) {
    out.contact = digits.slice(-10)
  } else if (rawPhone) {
    out.contact = rawPhone
  }

  const email = String(prefill.email || '').trim()
  if (email && email.includes('@')) {
    out.email = email
  }
  return out
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns true when a "HH:MM-HH:MM" slot is in the past or within 2 h from now (client-local). */
function isSlotUnavailableOnClient(timeSlot) {
  const m = /^(\d{2}):(\d{2})/.exec(String(timeSlot || '').trim())
  if (!m) return false
  const now = new Date()
  const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(m[1]), Number(m[2]), 0)
  // past OR within 2-hour lead-time window
  return (slotStart.getTime() - now.getTime()) < 2 * 60 * 60 * 1000
}

function chunkSlotRows(items, columns = 2) {
  const rows = []
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns))
  }
  return rows
}

function prettyDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  if (!y || !m || !d) return iso
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[Number(m) - 1] || m} ${y}`
}

function getNext14Days() {
  const days = []
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dateNum = String(d.getDate()).padStart(2, '0')
    const isoString = `${y}-${m}-${dateNum}`
    days.push({
      iso: isoString,
      dayNum: String(d.getDate()),
      weekday: weekdays[d.getDay()],
      month: months[d.getMonth()],
      isToday: i === 0
    })
  }
  return days
}

function physioInitial(name) {
  return String(name || '').trim().charAt(0).toUpperCase() || 'P'
}

/** Fee for `/physios/nearby`: `pricePerSession` + optional `pricePerSessionMax`. */
function nearbyPhysioFeeLabel(p) {
  if (!p) return null
  const lo = Number(p.pricePerSession ?? p.feePerSession)
  const hiRaw = p.pricePerSessionMax
  const hi = hiRaw != null && hiRaw !== '' ? Number(hiRaw) : null
  if (!Number.isFinite(lo) || lo < 0) return null
  if (hi != null && Number.isFinite(hi) && hi > lo) {
    return `₹${lo}–₹${hi}`
  }
  if (lo === 0) return null
  return `₹${lo}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepCard({ step, title, subtitle, locked, done, children }) {
  const active = !locked && !done
  const pulseAnim = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(0.4)
    }
  }, [active, pulseAnim])

  return (
    <View style={[
      styles.stepCard,
      locked && styles.stepCardLocked,
      done && styles.stepCardDone,
      active && styles.stepCardActive
    ]}>
      {active && (
        <View style={styles.pulseDotContainer}>
          <Animated.View style={[
            styles.pulseOuterDot,
            {
              transform: [{
                scale: pulseAnim.interpolate({
                  inputRange: [0.4, 1],
                  outputRange: [1, 1.8],
                })
              }],
              opacity: pulseAnim.interpolate({
                inputRange: [0.4, 1],
                outputRange: [0.8, 0],
              })
            }
          ]} />
          <View style={styles.pulseInnerDot} />
        </View>
      )}
      <View style={styles.stepHead}>
        <View style={[
          styles.stepBadge,
          locked && styles.stepBadgeLocked,
          done && styles.stepBadgeDone,
          active && styles.stepBadgeActive
        ]}>
          {done ? (
            <Ionicons name="checkmark" size={12} color={colors.white} />
          ) : locked ? (
            <Ionicons name="lock-closed" size={10} color={colors.slate400} />
          ) : (
            <Text style={styles.stepBadgeTxt}>{step}</Text>
          )}
        </View>
        <View style={styles.stepHeadText}>
          <Text style={[
            styles.stepTitle,
            locked && styles.stepTitleLocked,
            done && styles.stepTitleDone,
            active && styles.stepTitleActive
          ]}>{title}</Text>
          {subtitle ? (
            <Text style={[
              styles.stepSub,
              locked && styles.stepSubLocked,
              done && styles.stepSubDone,
              active && styles.stepSubActive
            ]}>{subtitle}</Text>
          ) : null}
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
  const avatarUri = assetUrl(p.avatar)
  const feeLabel = nearbyPhysioFeeLabel(p)

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
            {feeLabel ? <Text style={styles.physioCardFee}>{feeLabel}</Text> : null}
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
          </View>
        </View>
        <View style={[styles.physioSelectDot, selected && styles.physioSelectDotOn]}>
          {selected ? <Ionicons name="checkmark" size={11} color={colors.white} /> : null}
        </View>
      </View>
    </Pressable>
  )
}

function BookingSummaryBar({
  selectedPhysio,
  date,
  timeSlot,
  serviceType,
  canSubmit,
  loading,
  onConfirm,
  currentStep,
  onContinue,
  step1Ok,
  step2Ok,
  step3Ok
}) {
  const insets = useSafeAreaInsets()
  const teamAssigns = serviceType === 'home' || !selectedPhysio
  const physioLine = serviceType === 'online' && !selectedPhysio
    ? 'Choose a physiotherapist ↑'
    : serviceType === 'online' && selectedPhysio
      ? selectedPhysio.name
      : 'Picked by our team'

  const isStepValid = useMemo(() => {
    if (currentStep === 1) return step1Ok
    if (currentStep === 2) return step2Ok
    if (currentStep === 3) return step3Ok
    return canSubmit
  }, [currentStep, step1Ok, step2Ok, step3Ok, canSubmit])

  const stepText = useMemo(() => {
    if (currentStep === 1) return 'Set visit location & name'
    if (currentStep === 2) return 'Select service & schedule'
    if (currentStep === 3) return 'Describe your concern'
    return 'Review and confirm session'
  }, [currentStep])

  const stepSubtext = useMemo(() => {
    if (currentStep === 1) return step1Ok ? 'Location ready' : 'Fill location and name'
    if (currentStep === 2) return step2Ok ? 'Schedule selected' : 'Pick date and slot'
    if (currentStep === 3) return step3Ok ? 'Condition described' : 'Select concern dropdown'
    return 'Confirm session details'
  }, [currentStep, step1Ok, step2Ok, step3Ok])

  return (
    <View style={[styles.summaryBar, { paddingBottom: Math.max(insets.bottom, 12) + 2 }]}>
      <View style={styles.summaryBarInner}>
        {currentStep < 4 ? (
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryBarLabel}>STEP {currentStep} OF 4</Text>
            <Text style={styles.summaryBarPhysio} numberOfLines={1}>{stepText}</Text>
            <Text style={styles.summaryBarDate}>{stepSubtext}</Text>
          </View>
        ) : (
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryBarLabel}>BOOKING SUMMARY</Text>
            <Text style={styles.summaryBarPhysio} numberOfLines={1}>{physioLine}</Text>
            {date && timeSlot ? (
              <Text style={styles.summaryBarDate}>{formatBookingDateAndSlot(date, timeSlot)}</Text>
            ) : (
              <Text style={styles.summaryBarDate}>No date selected</Text>
            )}
          </View>
        )}

        <Pressable
          style={[styles.summaryConfirmBtn, (!isStepValid || loading) && styles.summaryConfirmBtnDisabled]}
          onPress={currentStep < 4 ? onContinue : onConfirm}
          disabled={!isStepValid || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : currentStep < 4 ? (
            <>
              <Text style={styles.summaryConfirmTxt}>Continue</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.white} />
            </>
          ) : (
            <>
              <Text style={styles.summaryConfirmTxt}>Confirm</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.white} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PhysioListScreen({ navigation, route }) {
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
  const [issue, setIssue] = useState(route?.params?.issue || '')
  const [issueOther, setIssueOther] = useState('')
  const [serviceType, setServiceType] = useState('home')
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // Focus states
  const [isNameFocused, setIsNameFocused] = useState(false)
  const [isOtherFocused, setIsOtherFocused] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  useEffect(() => {
    if (route?.params?.issue) {
      setIssue(route.params.issue)
    }
  }, [route?.params?.issue])

  // Online physio
  const [availablePhysios, setAvailablePhysios] = useState([])
  const [selectedPhysioId, setSelectedPhysioId] = useState('')
  const [physioPickerOpen, setPhysioPickerOpen] = useState(false)
  const [physioLoading, setPhysioLoading] = useState(false)
  const [refreshingPhysios, setRefreshingPhysios] = useState(false)

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [successBookingId, setSuccessBookingId] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [successServiceType, setSuccessServiceType] = useState('home')
  const [paymentCancelModal, setPaymentCancelModal] = useState(false)
  const [useWalletCredit, setUseWalletCredit] = useState(false)
  const { data: referralData } = useReferralMyCode(Boolean(token))
  const walletBalance = Number(referralData?.walletBalance) || 0

  // Wizard state & transitions
  const [currentStep, setCurrentStep] = useState(1)
  const prevStepRef = useRef(1)
  const autoRouteInitialized = useRef(false)
  const slideAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
  const progressAnim = useRef(new Animated.Value(0.25)).current

  // ── Derived ─────────────────────────────────────────────────────────────────
  const resolvedIssue = useMemo(() => {
    if (!issue) return ''
    if (issue === ISSUE_OTHER_VALUE) return issueOther.trim()
    return issue
  }, [issue, issueOther])

  const locOk = Boolean(location.trim() && Number.isFinite(addressLat) && Number.isFinite(addressLng))
  const dateSlotOk = Boolean(locOk && date && timeSlot)
  const issueOk = Boolean(resolvedIssue && (issue !== ISSUE_OTHER_VALUE || issueOther.trim().length >= 2))

  const step1Ok = useMemo(() => Boolean(locOk && profileName.trim()), [locOk, profileName])
  const step2Ok = useMemo(() => Boolean(dateSlotOk), [dateSlotOk])
  const step3Ok = useMemo(() => Boolean(issueOk), [issueOk])

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })
  const selectedPhysio = useMemo(
    () => availablePhysios.find((p) => String(p._id) === String(selectedPhysioId)) || null,
    [availablePhysios, selectedPhysioId],
  )
  const selectedPhysioAvatarUri = useMemo(() => assetUrl(selectedPhysio?.avatar), [selectedPhysio])
  const selectedPhysioFeeLabel = useMemo(() => nearbyPhysioFeeLabel(selectedPhysio), [selectedPhysio])

  const navigateToPaidOnlineBooking = useCallback((bookingId) => {
    const id = String(bookingId)
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'UserTabs',
            state: {
              routes: [
                { name: 'DashboardHome' },
                {
                  name: 'Bookings',
                  state: {
                    routes: [{ name: 'BookingsList' }, { name: 'BookingDetail', params: { id } }],
                    index: 1,
                  },
                },
                { name: 'Wallet' },
                { name: 'Profile' },
                { name: 'Disputes' },
              ],
              index: 1,
            },
          },
        ],
      }),
    )
  }, [navigation])



  const canSubmit = Boolean(
    profileName.trim() && location.trim() && date && timeSlot && resolvedIssue &&
    (serviceType === 'home' || selectedPhysioId),
  )

  // ── Effects ──────────────────────────────────────────────────────────────────
  // 1. Wizard slide & fade transitions
  useEffect(() => {
    const isForward = currentStep > prevStepRef.current
    prevStepRef.current = currentStep

    slideAnim.setValue(isForward ? 40 : -40)
    fadeAnim.setValue(0.2)

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start()
  }, [currentStep])

  // 2. Wizard progress bar line animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep / 4,
      duration: 350,
      useNativeDriver: false,
    }).start()
  }, [currentStep])

  // 3. Smart step auto-routing initialization
  useEffect(() => {
    if (profileLoading) return
    if (autoRouteInitialized.current) return
    autoRouteInitialized.current = true

    const step1Valid = Boolean(location.trim() && Number.isFinite(addressLat) && Number.isFinite(addressLng) && profileName.trim())
    const step2Valid = Boolean(step1Valid && date && timeSlot)
    const step3Valid = Boolean(resolvedIssue && (issue !== ISSUE_OTHER_VALUE || issueOther.trim().length >= 2))

    if (!step1Valid) {
      setCurrentStep(1)
    } else if (!step2Valid) {
      setCurrentStep(2)
    } else if (!step3Valid) {
      setCurrentStep(3)
    } else {
      setCurrentStep(4)
    }
  }, [profileLoading])

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
      const isToday = date === todayISO()
      setSlots(
        (res.data?.slots || []).filter((s) => {
          if (!s.available) return false
          // Client-side guard: hide past/too-soon slots for today (covers server timezone drift)
          if (isToday && isSlotUnavailableOnClient(s.timeSlot)) return false
          return true
        })
      )
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

  const loadNearbyPhysios = useCallback(async () => {
    if (!Number.isFinite(addressLat) || !Number.isFinite(addressLng)) return
    setPhysioLoading(true)
    try {
      const res = await api.get('/physios/nearby', { params: { lat: addressLat, lng: addressLng, limit: 12 } })
      const list = res.data?.physios || []
      setAvailablePhysios(list)
      if (!list.some((p) => String(p._id) === String(selectedPhysioId))) {
        setSelectedPhysioId('')
      }
    } catch {
      setAvailablePhysios([])
      setSelectedPhysioId('')
    } finally {
      setPhysioLoading(false)
    }
  }, [addressLat, addressLng, selectedPhysioId])

  const onRefreshPhysios = useCallback(async () => {
    setRefreshingPhysios(true)
    await loadNearbyPhysios()
    setRefreshingPhysios(false)
  }, [loadNearbyPhysios])

  // Load nearby physios for online service type
  useEffect(() => {
    if (serviceType !== 'online') {
      setAvailablePhysios([])
      setSelectedPhysioId('')
      return
    }
    loadNearbyPhysios()
  }, [serviceType, loadNearbyPhysios])

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
      const pincode = extractPincode(location.trim())
      if (pincode) body.pincode = pincode

      if (serviceType === 'home') {
        const bookingRes = await api.post('/bookings/request-home', body)
        const newBookingId = bookingRes.data?._id
        setSuccessServiceType('home')
        setSuccessMessage("Your request has been received. A care manager will contact you and prepare your treatment plan.")
        setSuccessBookingId(newBookingId || 'new')
        return
      }

      const startRes = await api.post('/bookings/online-checkout/start', {
        ...body,
        physioId: selectedPhysioId,
        ...(useWalletCredit && walletBalance > 0 ? { useWalletCredit: true } : {}),
      })
      const {
        checkoutSessionId,
        orderId,
        amount,
        currency,
        keyId,
        prefill,
        hostedPayUrl,
      } = startRes.data || {}
      if (!checkoutSessionId || !orderId || !keyId) {
        Toast.show({ type: 'error', text1: 'Could not start payment. Please try again.' })
        return
      }
      const amountPaise = Number(amount)
      if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
        Toast.show({ type: 'error', text1: 'Invalid payment amount from server.' })
        return
      }

      // Fetch user profile info dynamically for payment prefill
      let prefillData = {}
      try {
        const pr = await api.get('/profile')
        prefillData = {
          name: pr.data?.name || '',
          contact: pr.data?.phone || '',
          email: pr.data?.email || '',
        }
      } catch {
        prefillData = prefill && typeof prefill === 'object' ? prefill : {}
      }

      const options = {
        key: keyId,
        amount: amountPaise,
        currency: currency || 'INR',
        name: 'PhysiOkhom',
        description: 'Online Consultation booking',
        order_id: orderId,
        prefill: cleanRazorpayPrefill(prefillData),
        theme: { color: colors.brand },
      }

      if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
        setSubmitting(false)
        Toast.show({
          type: 'error',
          text1: 'Native SDK not found. Rebuild the app with npx expo run:android or run:ios.',
        })
        return
      }

      // Keep submitting=true until checkout is fully resolved (success, failure, or cancel)
      RazorpayCheckout.open(options)
        .then(async (response) => {
          try {
            const done = await api.post('/bookings/online-checkout/complete', {
              checkoutSessionId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            const bookingId = done.data?._id
            setSuccessServiceType('online')
            setSuccessMessage('Payment successful! Your online consultation is confirmed. Your physiotherapist will join at the scheduled time.')
            setSuccessBookingId(bookingId || 'new')
          } catch (e) {
            Toast.show({
              type: 'error',
              text1: e.response?.data?.message || e.message || 'Could not confirm payment',
            })
          } finally {
            setSubmitting(false)
          }
        })
        .catch((error) => {
          const rzp = error?.error || error
          const code = String(rzp?.code || '').toUpperCase()
          const desc = String(rzp?.description || rzp?.message || '').toLowerCase()
          const isCancelled =
            code === 'PAYMENT_CANCELLED' ||
            code === 'BAD_REQUEST_ERROR' ||
            desc.includes('cancel') ||
            desc.includes('exit') ||
            desc.includes('user dropped')
          if (isCancelled) {
            setPaymentCancelModal(true)
          } else {
            Toast.show({
              type: 'error',
              text1: rzp?.description || rzp?.message || 'Payment failed. Please try again.',
            })
          }
          setSubmitting(false)
        })
      return
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
    if (profileName.trim()) {
      setCurrentStep(2)
    }
  }

  function openMyBookings() {
    navigation.navigate('UserTabs', { screen: 'Bookings', params: { screen: 'BookingsList' } })
  }

  // ── Unauthenticated ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <View style={[styles.unauthRoot, { paddingTop: Math.max(insets.top, 20) + 20 }]}>
        <View style={styles.ambientHeaderGlow} pointerEvents="none" />
        <View style={styles.ambientHeaderGlow2} pointerEvents="none" />
        <View style={styles.unauthIconWrap}>
          <Ionicons name="calendar-outline" size={36} color={colors.white} />
        </View>
        <Text style={styles.unauthTitle}>Book an appointment</Text>
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
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page header ──────────────────────────── */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageTitle}>Book an appointment</Text>
            <Text style={styles.pageSub}>Choose when and where — we'll find the best physio for you.</Text>
          </View>
          <Pressable style={styles.myBookingsBtn} onPress={openMyBookings}>
            <Ionicons name="calendar-outline" size={13} color={colors.brand} />
            <Text style={styles.myBookingsTxt}>My bookings</Text>
          </Pressable>
        </View>

        {/* ── Animated Progress Bar Header ─────────── */}
        <View style={styles.wizardHeader}>
          <View style={styles.wizardProgressBackground}>
            <Animated.View style={[styles.wizardProgressBar, { width: progressWidth }]} />
          </View>
          <View style={styles.wizardStepsRow}>
            {[
              { num: 1, label: 'Location', isOk: step1Ok },
              { num: 2, label: 'Schedule', isOk: step2Ok },
              { num: 3, label: 'Condition', isOk: step3Ok },
              { num: 4, label: 'Confirm', isOk: canSubmit },
            ].map((step) => {
              const isActive = currentStep === step.num
              const isDone = step.isOk
              const isClickable = step.num === 1 || (step.num === 2 && step1Ok) || (step.num === 3 && step2Ok) || (step.num === 4 && step3Ok)
              
              return (
                <Pressable
                  key={step.num}
                  style={styles.wizardStepItem}
                  onPress={() => {
                    if (isClickable) {
                      setCurrentStep(step.num)
                    }
                  }}
                  disabled={!isClickable}
                >
                  <View style={[
                    styles.wizardStepDot,
                    isActive && styles.wizardStepDotActive,
                    isDone && !isActive && styles.wizardStepDotDone,
                    !isClickable && styles.wizardStepDotLocked
                  ]}>
                    {isDone && !isActive ? (
                      <Ionicons name="checkmark" size={10} color={colors.white} />
                    ) : !isClickable ? (
                      <Ionicons name="lock-closed" size={8} color={colors.slate400} />
                    ) : (
                      <Text style={[
                        styles.wizardStepDotText,
                        isActive && styles.wizardStepDotTextActive,
                        isDone && styles.wizardStepDotTextDone
                      ]}>{step.num}</Text>
                    )}
                  </View>
                  <Text style={[
                    styles.wizardStepLabel,
                    isActive && styles.wizardStepLabelActive,
                    isDone && styles.wizardStepLabelDone
                  ]}>
                    {step.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* ── Profile name warning ──────────────────── */}
        {!profileLoading && !profileName ? (
          <View style={styles.warnBanner}>
            <Ionicons name="information-circle-outline" size={14} color={colors.amber800} />
            <Text style={styles.warnBannerTxt}>Add your name in Profile before confirming a booking.</Text>
          </View>
        ) : null}

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
          {currentStep === 1 && (
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
                      style={[
                        styles.textInput,
                        isNameFocused && styles.textInputFocused
                      ]}
                      value={profileName}
                      onChangeText={setProfileName}
                      onFocus={() => setIsNameFocused(true)}
                      onBlur={() => setIsNameFocused(false)}
                      placeholder="Enter your name"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
              )}
            </StepCard>
          )}

          {currentStep === 2 && (
            <StepCard
              step={2}
              title="When works for you?"
              subtitle="Pick a service type, date, and an available time slot."
              locked={!locOk}
              done={dateSlotOk}
            >
              {/* Service type cards */}
              <Text style={styles.fieldLabel}>Service Type</Text>
              <View style={styles.serviceCardsContainer}>
                {[
                  {
                    value: 'home',
                    title: 'In-Home Visit',
                    desc: 'A certified therapist visits you for hands-on, personalized treatment.',
                    icon: 'home-outline',
                    activeIcon: 'home'
                  },
                  {
                    value: 'online',
                    title: 'Online Consultation',
                    desc: 'Secure video session with real-time digital posture guidance.',
                    icon: 'videocam-outline',
                    activeIcon: 'videocam'
                  },
                ].map((opt) => {
                  const isActive = serviceType === opt.value
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.serviceCard, isActive && styles.serviceCardActive]}
                      onPress={() => setServiceType(opt.value)}
                    >
                      <View style={[styles.serviceCardIconWrap, isActive && styles.serviceCardIconWrapActive]}>
                        <Ionicons
                          name={isActive ? opt.activeIcon : opt.icon}
                          size={20}
                          color={isActive ? colors.white : colors.textSecondary}
                        />
                      </View>
                      <Text style={[styles.serviceCardTitle, isActive && styles.serviceCardTitleActive]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.serviceCardDesc, isActive && styles.serviceCardDescActive]}>
                        {opt.desc}
                      </Text>
                      {isActive && (
                        <View style={styles.serviceCardTick}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
                        </View>
                      )}
                    </Pressable>
                  )
                })}
              </View>

              {/* Date Picker Ribbon */}
              <Text style={styles.fieldLabel}>Select Date</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateRibbon}
                style={styles.dateRibbonScroll}
              >
                {getNext14Days().map((item) => {
                  const isSelected = date === item.iso
                  return (
                    <Pressable
                      key={item.iso}
                      style={[
                        styles.dateTile,
                        isSelected && styles.dateTileSelected,
                        item.isToday && !isSelected && styles.dateTileToday
                      ]}
                      onPress={() => setDate(item.iso)}
                    >
                      <Text style={[styles.dateTileMonth, isSelected && styles.dateTileMonthSelected]}>
                        {item.month}
                      </Text>
                      <Text style={[styles.dateTileDayNum, isSelected && styles.dateTileDayNumSelected]}>
                        {item.dayNum}
                      </Text>
                      <Text style={[styles.dateTileWeekday, isSelected && styles.dateTileWeekdaySelected]}>
                        {item.isToday ? 'Today' : item.weekday}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {/* Time slot chips grid */}
              <View style={styles.slotSection}>
                <Text style={styles.fieldLabel}>Available Slots</Text>
                {slots.length === 0 ? (
                  <View style={styles.noSlotsBox}>
                    <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                    <Text style={styles.noSlotsTxt}>No slots available for this date</Text>
                  </View>
                ) : (
                  <View style={styles.slotsGrid}>
                    {chunkSlotRows(slots).map((row, rowIndex) => (
                      <View key={`slot-row-${rowIndex}`} style={styles.slotsRow}>
                        {row.map((s) => {
                          const isSelected = timeSlot === s.timeSlot
                          return (
                            <Pressable
                              key={s.timeSlot}
                              style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                              onPress={() => {
                                setTimeSlot(s.timeSlot)
                                setTimeout(() => {
                                  setCurrentStep(3)
                                }, 220)
                              }}
                            >
                              <Ionicons
                                name="time-outline"
                                size={13}
                                color={isSelected ? colors.white : colors.brand}
                              />
                              <Text
                                style={[styles.slotChipTxt, isSelected && styles.slotChipTxtSelected]}
                                numberOfLines={1}
                              >
                                {formatBookingTimeSlot(s.timeSlot)}
                              </Text>
                            </Pressable>
                          )
                        })}
                        {row.length === 1 ? <View style={styles.slotChipSpacer} /> : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </StepCard>
          )}

          {currentStep === 3 && (
            <StepCard
              step={3}
              title="What do you need help with?"
              subtitle="Select your concern so we can match the right specialist."
              locked={!dateSlotOk}
              done={issueOk}
            >
              <DropdownField
                label="ISSUE"
                value={issue}
                placeholder="Select your concern"
                options={ISSUE_DROPDOWN_OPTIONS}
                onSelect={(v) => {
                  setIssue(v)
                  if (v !== ISSUE_OTHER_VALUE) {
                    setIssueOther('')
                    setTimeout(() => {
                      setCurrentStep(4)
                    }, 220)
                  }
                }}
                variant="inline"
              />

              {issue === ISSUE_OTHER_VALUE ? (
                <View style={[styles.fieldWrap, { marginTop: 12 }]}>
                  <Text style={styles.fieldLabel}>Describe your condition</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textArea,
                      isOtherFocused && styles.textInputFocused
                    ]}
                    value={issueOther}
                    onChangeText={setIssueOther}
                    onFocus={() => setIsOtherFocused(true)}
                    onBlur={() => setIsOtherFocused(false)}
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
          )}

          {currentStep === 4 && (
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
                          {selectedPhysioFeeLabel ? (
                            <Text style={styles.physioSelectorFee} numberOfLines={1}>
                              {selectedPhysioFeeLabel} / session
                            </Text>
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
                    <Text style={styles.howItWorksTxt}>A care manager visits, creates your plan, and assigns your physiotherapist.</Text>
                  </View>
                  <View style={[styles.howItWorksRow, { marginBottom: 0 }]}>
                    <View style={[styles.howItWorksIcon, { backgroundColor: colors.violet50 }]}>
                      <Ionicons name="notifications-outline" size={16} color={colors.violet800} />
                    </View>
                    <Text style={styles.howItWorksTxt}>You&apos;ll consent to the plan in the app, then sessions begin.</Text>
                  </View>
                </View>
              )}
            </StepCard>
          )}
        </Animated.View>
      </ScrollView>

      {walletBalance > 0 && serviceType === 'online' ? (
        <Pressable
          style={styles.walletRow}
          onPress={() => setUseWalletCredit((v) => !v)}
        >
          <Ionicons
            name={useWalletCredit ? 'checkbox' : 'square-outline'}
            size={22}
            color={useWalletCredit ? colors.brand : colors.slate400}
          />
          <Text style={styles.walletRowTxt}>Use ₹{walletBalance.toFixed(0)} wallet credit</Text>
        </Pressable>
      ) : null}

      {/* ── Sticky summary bar ────────────────────────────────────────────── */}
      {!successBookingId && !paymentCancelModal ? (
        <BookingSummaryBar
          selectedPhysio={serviceType === 'online' ? selectedPhysio : null}
          date={date}
          timeSlot={timeSlot}
          serviceType={serviceType}
          canSubmit={canSubmit}
          loading={submitting}
          onConfirm={submitBooking}
          currentStep={currentStep}
          onContinue={() => setCurrentStep((c) => c + 1)}
          step1Ok={step1Ok}
          step2Ok={step2Ok}
          step3Ok={step3Ok}
        />
      ) : null}

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
            <View style={[
              styles.locationSearchField,
              isSearchFocused && styles.locationSearchFieldFocused
            ]}>
              <Ionicons name="search-outline" size={14} color={colors.textTertiary} />
              <TextInput
                value={locationDraft}
                onChangeText={setLocationDraft}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
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
              <ScrollView
                style={styles.physioList}
                showsVerticalScrollIndicator={false}
                bounces={true}
                alwaysBounceVertical={true}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshingPhysios}
                    onRefresh={onRefreshPhysios}
                    colors={[colors.brand]}
                    tintColor={colors.brand}
                  />
                }
              >
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

      {/* ── Payment cancelled modal ──────────────────────────────────────── */}
      <Modal visible={paymentCancelModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.successOverlay}>
          <View style={styles.successCardOuter}>
            <View style={styles.successCard}>
              <View style={[styles.successIconCircle, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="close-circle" size={56} color="#F59E0B" />
              </View>
              <Text style={styles.successTitle}>Payment Cancelled</Text>
              <Text style={styles.successBody}>
                Your payment was not completed. No amount has been charged. You can try booking again whenever you're ready.
              </Text>
              <Pressable
                style={[styles.successBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => {
                  setPaymentCancelModal(false)
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'UserTabs',
                          state: { index: 0, routes: [{ name: 'DashboardHome' }] },
                        },
                      ],
                    })
                  )
                }}
              >
                <Text style={styles.successBtnTxt}>OK, Go to Dashboard</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Booking success modal ─────────────────────────────────────────── */}
      <Modal visible={!!successBookingId} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.successOverlay}>
          <View style={styles.successCardOuter}>
            <View style={styles.successCard}>
              {successServiceType === 'home' ? (
                <View style={[styles.successIconCircle, { backgroundColor: colors.brandSoft }]}>
                  <Ionicons name="time-outline" size={52} color={colors.brand} />
                </View>
              ) : (
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={56} color={colors.brand} />
                </View>
              )}
              <Text style={styles.successTitle}>
                {successServiceType === 'home' ? 'Awaiting Assignment' : 'Booking Confirmed!'}
              </Text>
              <Text style={styles.successBody}>{successMessage}</Text>
              <Pressable
                style={styles.successBtn}
                onPress={() => {
                  const id = successBookingId
                  setSuccessBookingId(null)
                  setSuccessMessage('')
                  setSuccessServiceType('home')
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'UserTabs',
                          state: {
                            index: 1,
                            routes: [
                              { name: 'DashboardHome' },
                              {
                                name: 'Bookings',
                                state: {
                                  index: 1,
                                  routes: [
                                    { name: 'BookingsList' },
                                    { name: 'BookingDetail', params: { id } },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                      ],
                    })
                  )
                }}
              >
                <Text style={styles.successBtnTxt}>
                  {successServiceType === 'home' ? 'View Status' : 'View Booking'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <WhatsAppSupportFab bottomExtra={20} />
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
  flex: { flex: 1, backgroundColor: colors.canvas, position: 'relative' },

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

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 16, position: 'relative' },

  // Unauthenticated
  unauthRoot: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.canvas,
    paddingHorizontal: 32,
    position: 'relative',
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
  stepCardActive: {
    borderColor: colors.brand,
    borderWidth: 1.5,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  stepCardDone: {
    borderColor: colors.success + '44',
    borderWidth: 1,
  },
  pulseDotContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOuterDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.brand,
  },
  pulseInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
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
  textInputFocused: {
    borderColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
    backgroundColor: colors.white,
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },

  // Service Cards
  serviceCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    alignItems: 'flex-start',
    position: 'relative',
  },
  serviceCardActive: {
    borderColor: colors.brand,
    backgroundColor: colors.teal50,
  },
  serviceCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  serviceCardIconActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandSoft,
  },
  serviceCardTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  serviceCardTitleActive: {
    color: colors.brand,
  },
  serviceCardDesc: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    lineHeight: leading.sm,
  },
  serviceCardDescActive: {
    color: colors.textSecondary,
  },
  serviceCardTick: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  // Date Picker Ribbon
  dateRibbonScroll: {
    marginHorizontal: -18,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  dateRibbon: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 36,
  },
  dateTile: {
    width: 58,
    height: 74,
    borderRadius: 14,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dateTileSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  dateTileToday: {
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
  },
  dateTileMonth: {
    fontFamily: font.medium,
    fontSize: 9,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateTileMonthSelected: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  dateTileDayNum: {
    fontFamily: font.bold,
    fontSize: type.base,
    color: colors.textPrimary,
    marginVertical: 2,
  },
  dateTileDayNumSelected: {
    color: colors.white,
  },
  dateTileWeekday: {
    fontFamily: font.medium,
    fontSize: 9,
    color: colors.textSecondary,
  },
  dateTileWeekdaySelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Slots grid
  slotsGrid: {
    gap: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  slotChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  slotChipSpacer: {
    flex: 1,
  },
  slotChipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  slotChipTxt: {
    flexShrink: 1,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textPrimary,
  },
  slotChipTxtSelected: {
    color: colors.white,
  },

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
  physioSelectorFee: {
    marginTop: 4,
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.brand,
  },
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
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletRowTxt: { fontFamily: font.medium, fontSize: type.sm, color: colors.textPrimary, flex: 1 },

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

  // Razorpay WebView (online checkout)
  webviewModal: { flex: 1, backgroundColor: colors.brand },
  webviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.brand,
  },
  webviewHeaderTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.white },
  webviewCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: { flex: 1, backgroundColor: colors.white },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.canvas,
  },
  webviewLoadingTxt: { fontFamily: font.medium, fontSize: type.sm, color: colors.textSecondary },
  webviewFallbackTxt: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  webviewFallbackBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  webviewFallbackBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white, textAlign: 'center' },

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
  locationSearchFieldFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.white,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
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
    width: 64,
    height: 64,
    borderRadius: 18,
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

  // Wizard Header & Progress Bar
  wizardHeader: {
    marginBottom: 20,
    position: 'relative',
    paddingHorizontal: 4,
  },
  wizardProgressBackground: {
    position: 'absolute',
    top: 15,
    left: 24,
    right: 24,
    height: 3,
    backgroundColor: colors.slate100,
    zIndex: 0,
  },
  wizardProgressBar: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  wizardStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  wizardStepItem: {
    alignItems: 'center',
    width: 64,
  },
  wizardStepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 6,
  },
  wizardStepDotActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  wizardStepDotDone: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  wizardStepDotLocked: {
    borderColor: colors.slate100,
    backgroundColor: '#f8fafc',
  },
  wizardStepDotText: {
    fontFamily: font.bold,
    fontSize: 10,
    color: colors.slate400,
  },
  wizardStepDotTextActive: {
    color: '#ffffff',
  },
  wizardStepDotTextDone: {
    color: '#ffffff',
  },
  wizardStepLabel: {
    fontFamily: font.semiBold,
    fontSize: 9,
    color: colors.slate400,
  },
  wizardStepLabelActive: {
    color: colors.brand,
    fontFamily: font.bold,
  },
  wizardStepLabelDone: {
    color: colors.slate600,
  },

  // ── Booking success modal ──────────────────────────────────────────────────
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  successCardOuter: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  successCard: {
    padding: 28,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.teal50 || '#e6f7f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontFamily: font.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  successBody: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  successBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 36,
    width: '100%',
    alignItems: 'center',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  successBtnTxt: {
    fontFamily: font.semibold || font.bold,
    fontSize: 15,
    color: colors.white,
  },
})
