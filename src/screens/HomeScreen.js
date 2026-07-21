import { memo, useState, useEffect, useRef, useMemo } from 'react'
import { Alert, Animated, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'
import { getDefaultDashboardScreen } from '../auth/navigationTargets'
import { StitchHeader } from '../components/home/StitchHeader'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'
import { figmaTokens } from '../theme/figmaTokens'
import { api } from '../api/client'
import { usePricingSettings } from '../api/queries'
import { buildMobilePlanTierCards, FALLBACK_PLAN_TIER_CARDS } from '../utils/planTierDisplay'
import { isAwaitingPatientConsent, isPlanLive } from '../utils/planStatus'

const DEFAULT_SERVICE_AREA = {
  label: 'Kokrajhar',
  lat: 26.4014,
  lng: 90.2667,
}

const DEFAULT_DISPLAY_SPECIALISTS = 3

function displaySpecialistCount(count) {
  const n = Number(count)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DISPLAY_SPECIALISTS
  return n
}

function extractAreaLabel(location, fallback = DEFAULT_SERVICE_AREA.label) {
  const text = String(location || '').trim()
  if (!text) return fallback
  const parts = text.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return fallback
  const match = parts.find((p) => /kokrajhar/i.test(p))
  if (match) return match.replace(/\d+/g, '').trim() || fallback
  return parts[parts.length - 1] || fallback
}

function countActionableBookings(bookings) {
  return (Array.isArray(bookings) ? bookings : []).filter((b) => {
    if (isAwaitingPatientConsent(b?.planStatus)) return true
    if (isPlanLive(b?.planStatus) && b?.paymentStatus === 'pending') return true
    return false
  }).length
}

const WHY_FEATURES = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Certified Grads Only',
    desc: 'Every therapist is a licensed BPT/MPT graduate, background-verified.',
    bg: '#ecfdf5',
    color: '#047857',
  },
  {
    icon: 'home-outline',
    title: 'Convenient Home Visits',
    desc: 'Get treated in the comfort of your home — zero waiting or travel.',
    bg: '#eff6ff',
    color: '#2563eb',
  },
  {
    icon: 'wallet-outline',
    title: 'Flexible Payments',
    desc: 'Pay per session or save with rehab packages via Razorpay.',
    bg: '#fffbeb',
    color: '#d97706',
  },
]

const FAQ_CATEGORIES = ['All', 'Booking', 'Therapists', 'Payments']

const FAQ_ITEMS = [
  {
    q: 'How do I book an appointment?',
    a: 'Choose your condition, select a preferred date and time, complete the booking details, and pay securely online.',
    cat: 'Booking',
  },
  {
    q: 'Are your physiotherapists certified?',
    a: 'Absolutely. Every provider on PhysiOkhom holds a BPT/MPT degree and has cleared our professional verification.',
    cat: 'Therapists',
  },
  {
    q: 'What is the cancellation policy?',
    a: 'You can reschedule or cancel a session up to 4 hours in advance directly from your dashboard without penalty.',
    cat: 'Booking',
  },
  {
    q: 'Which areas do you serve?',
    a: 'We actively serve Kokrajhar and surrounding metropolitan areas. Type your locality at booking to confirm coverage.',
    cat: 'Booking',
  },
  {
    q: 'How do payments work?',
    a: 'We accept credit/debit cards, UPI, and Netbanking through Razorpay. You can pay per session or buy a package.',
    cat: 'Payments',
  },
]

const SPECIALTIES = [
  { id: 'Back Pain', title: 'Orthopedic', image: require('../../assets/images/specialty_orthopedic.png'), bg: '#e6f4f3', color: '#0d6b6b' },
  { id: 'Neuro Rehab', title: 'Neuro Rehab', image: require('../../assets/images/specialty_neuro.png'), bg: '#eff6ff', color: '#2563eb' },
  { id: 'Pediatric Rehab', title: 'Pediatric Rehab', image: require('../../assets/images/technique_pediatric.png'), bg: '#eff6ff', color: '#1d4ed8' },
  { id: 'Post Surgery Rehab', title: 'Post-Op', image: require('../../assets/images/specialty_post_op.png'), bg: '#ecfdf5', color: '#047857' },
  { id: 'Elderly Care', title: 'Elderly Care', image: require('../../assets/images/technique_elderly.png'), bg: '#f0fdf4', color: '#15803d' },
  { id: 'Many More', title: 'Other Care', image: require('../../assets/images/specialty_other.png'), bg: '#fff1f2', color: '#dc2626' },
]

const TECHNIQUES = [
  { id: 'Cupping Therapy', slug: 'cupping-therapy', title: 'Cupping Therapy', image: require('../../assets/images/technique_cupping.png'),   bg: '#fff7ed', color: '#c2410c' },
  { id: 'Dry Needling', slug: 'dry-needling', title: 'Dry Needling', image: require('../../assets/images/technique_needling.png'), bg: '#f5f3ff', color: '#6d28d9' },
  { id: 'Kinesio Taping', slug: 'kinesio-taping', title: 'Kinesio Taping', image: require('../../assets/images/technique_kinesio.png'), bg: '#e6f4f3', color: '#0d6b6b' },
  { id: 'IASTM', slug: 'iastm', title: 'IASTM', image: require('../../assets/images/technique_iastm.png'), bg: '#f0f9ff', color: '#0369a1' },
]

const TESTIMONIALS = [
  {
    initials: 'PB',
    name: 'Priya Bora',
    loc: 'Beltola, Kokrajhar',
    rating: '5.0',
    text: '"My recovery after knee surgery was much faster thanks to regular home physio sessions. The physiotherapist was professional, punctual, and very caring. Highly recommended!"',
    sessions: '12 sessions completed',
  },
  {
    initials: 'RK',
    name: 'Rajesh Kalita',
    loc: 'Kahilipara, Kokrajhar',
    rating: '4.9',
    text: '"Due to stroke, my father had severe mobility issues. The neuro rehabilitation specialist worked wonders. His posture and movement have improved by 70%."',
    sessions: '20 sessions completed',
  },
  {
    initials: 'ND',
    name: 'Nayan Das',
    loc: 'Zoo Road, Kokrajhar',
    rating: '5.0',
    text: '"Extremely convenient! No need to travel through heavy traffic with lower back pain. Dr. Sharma brought all bands and clinical gear. Excellent home treatment."',
    sessions: '8 sessions completed',
  },
]

function getSpecialtyBadgeColors(specialization) {
  const spec = (specialization || '').toLowerCase()
  if (spec.includes('neuro') || spec.includes('stroke') || spec.includes('paralysis')) {
    return { bg: '#eff6ff', border: '#dbeafe', text: '#2563eb' }
  }
  if (spec.includes('ortho') || spec.includes('knee') || spec.includes('spine') || spec.includes('back')) {
    return { bg: '#e6f4f3', border: '#b2dfdb', text: '#0d6b6b' }
  }
  if (spec.includes('pediatric') || spec.includes('child')) {
    return { bg: '#fdf2f8', border: '#fce7f3', text: '#db2777' }
  }
  if (spec.includes('sports') || spec.includes('fitness')) {
    return { bg: '#fffbeb', border: '#fef3c7', text: '#b45309' }
  }
  return { bg: '#f1f5f9', border: '#e2e8f0', text: '#475569' }
}

function getNextSlotText(physioId) {
  const slots = [
    'Today, 2:00 PM',
    'Today, 4:30 PM',
    'Tomorrow, 10:00 AM',
    'Today, 6:00 PM',
    'Tomorrow, 11:30 AM',
    'Today, 3:00 PM'
  ]
  const idx = parseInt(physioId.slice(-4), 16) % slots.length
  return slots[isNaN(idx) ? 0 : idx]
}

function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={13} color={figmaTokens.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

function FaqRow({ q, a, last }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [
          styles.faqRow,
          open && { backgroundColor: '#f8fafc' },
          pressed && styles.faqRowPressed
        ]}
        accessibilityRole="button"
      >
        <View style={styles.faqBody}>
          <Text style={styles.q}>{q}</Text>
          {open ? <Text style={styles.a}>{a}</Text> : null}
        </View>
        <View style={[styles.faqChevronBg, open && { backgroundColor: '#e6f4f3' }]}>
          <Ionicons 
            name={open ? 'chevron-up' : 'chevron-down'} 
            size={12} 
            color={open ? figmaTokens.primary : 'rgba(15,23,42,0.4)'} 
          />
        </View>
      </Pressable>
      {!last && <View style={styles.faqDivider} />}
    </>
  )
}

const HealthHubCard = memo(function HealthHubCard({ token, navigation, openWhatsApp, activeBooking }) {
  const [consultationClaimed, setConsultationClaimed] = useState(false)

  const handleClaimConsultation = () => {
    setConsultationClaimed(true)
    Alert.alert(
      'Consultation Claimed!',
      'Our Care Coordinator will call you in the next 15 minutes to understand your symptoms and match you with the right specialist.',
      [
        { text: 'OK' },
        { text: 'Chat on WhatsApp', onPress: openWhatsApp }
      ]
    )
  }

  if (token) {
    if (!activeBooking) {
      // Logged in but no active booking — prompt to book
      return (
        <View style={styles.hubCard}>
          <View style={styles.hubHeader}>
            <View style={styles.hubHeaderLeft}>
              <View style={[styles.hubBadge, { backgroundColor: figmaTokens.primary + '20', borderColor: figmaTokens.primary + '30' }]}>
                <Ionicons name="calendar-outline" size={10} color={figmaTokens.primary} />
                <Text style={[styles.hubBadgeText, { color: figmaTokens.primary }]}>No Active Plan</Text>
              </View>
              <Text style={styles.hubTitle}>Start your recovery today</Text>
            </View>
          </View>
          <Text style={[styles.hubProgressText, { marginBottom: 12 }]}>
            Book a home visit with a verified physiotherapist and begin your personalised care plan.
          </Text>
          <View style={styles.hubActions}>
            <TouchableOpacity
              style={styles.hubActionBtnPri}
              onPress={() => navigation.navigate('PhysioList')}
            >
              <Text style={styles.hubActionTextPri}>Book an Appointment</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    // Derive live values from the active booking
    const schedule = Array.isArray(activeBooking.schedule) ? activeBooking.schedule : []
    const totalSessions = Number(activeBooking.sessions) || Math.max(1, schedule.length)
    const completedSessions = schedule.filter((s) => s.status === 'completed').length
    const sessionsLeft = Math.max(0, totalSessions - completedSessions)
    const progressPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

    const physioName = typeof activeBooking.physioId === 'object' && activeBooking.physioId?.name
      ? activeBooking.physioId.name
      : null

    const today = new Date()
    const todayYmd = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const nextScheduleEntry = schedule.find((s) => s.status !== 'completed' && s.date >= todayYmd)
    const nextVisitText = nextScheduleEntry
      ? `${nextScheduleEntry.date} · ${nextScheduleEntry.time || activeBooking.timeSlot || ''} · At Home`
      : activeBooking.date
        ? `${activeBooking.date} · ${activeBooking.timeSlot || ''} · At Home`
        : 'To be scheduled'

    const planTitle = activeBooking.issue || 'Home Visit Plan'
    const badgeLabel = isAwaitingPatientConsent(activeBooking.planStatus)
      ? 'Consent needed'
      : isPlanLive(activeBooking.planStatus)
        ? 'Active Recovery Plan'
        : 'Booking Confirmed'

    return (
      <View style={styles.hubCard}>
        <View style={styles.hubHeader}>
          <View style={styles.hubHeaderLeft}>
            <View style={styles.hubBadge}>
              <Ionicons name="pulse" size={10} color={colors.white} />
              <Text style={styles.hubBadgeText}>{badgeLabel}</Text>
            </View>
            <Text style={styles.hubTitle} numberOfLines={2}>{planTitle}</Text>
          </View>
          <Text style={styles.hubSessionsLeft}>{sessionsLeft} of {totalSessions} left</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.hubProgressContainer}>
          <View style={styles.hubProgressBarBg}>
            <View style={[styles.hubProgressBarFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.hubProgressText}>
            {progressPct}% sessions remaining ({completedSessions} completed)
          </Text>
        </View>

        {/* Next Session Details */}
        <View style={styles.hubDetailsBox}>
          <View style={styles.hubDocAvatar}>
            <Ionicons name="person" size={18} color={figmaTokens.primary} />
          </View>
          <View style={styles.hubDocInfo}>
            <Text style={styles.hubDocName}>
              {physioName ? (physioName.startsWith('Dr') ? physioName : `Dr. ${physioName}`) : 'Specialist being assigned'}
            </Text>
            <Text style={styles.hubDocSub} numberOfLines={1}>Next visit: {nextVisitText}</Text>
          </View>
          <View style={styles.hubStatusIndicator}>
            <View style={styles.hubStatusDot} />
            <Text style={styles.hubStatusText}>
              {physioName ? 'Confirmed' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.hubActions}>
          <TouchableOpacity
            style={styles.hubActionBtnSec}
            onPress={() => {
              Alert.alert('Contact Support', 'Calling Care Coordinator...', [
                { text: 'Cancel' },
                { text: 'Call Now', onPress: () => Linking.openURL('tel:+918453580556').catch(() => {}) }
              ])
            }}
          >
            <Ionicons name="call-outline" size={12} color={colors.textPrimary} />
            <Text style={styles.hubActionTextSec}>Help Desk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.hubActionBtnPri}
            onPress={() => {
              if (activeBooking._id) {
                navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: activeBooking._id } })
              } else {
                navigation.navigate(getDefaultDashboardScreen())
              }
            }}
          >
            <Text style={styles.hubActionTextPri}>Manage Schedule</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Guest Onboarding checklist
  const completedCount = (token ? 1 : 0) + (consultationClaimed ? 1 : 0)

  return (
    <View style={styles.hubCardGuest}>
      <View style={styles.hubHeaderGuest}>
        <View style={[styles.hubBadge, { backgroundColor: figmaTokens.primary + '15', borderColor: figmaTokens.primary + '30' }]}>
          <Ionicons name="ribbon" size={10} color={figmaTokens.primary} />
          <Text style={[styles.hubBadgeText, { color: figmaTokens.primary }]}>Your Recovery Steps</Text>
        </View>
        <Text style={styles.hubSessionsLeftGuest}>{completedCount} of 3 completed</Text>
      </View>

      <View style={styles.checklistContainer}>
        {/* Step 1 */}
        <Pressable 
          onPress={() => navigation.navigate('Login')}
          style={styles.checkRow}
        >
          <View style={[styles.checkCircle, token && styles.checkCircleChecked]}>
            {token ? (
              <Ionicons name="checkmark" size={12} color={colors.white} />
            ) : (
              <View style={styles.checkCircleDot} />
            )}
          </View>
          <View style={styles.checkTextWrap}>
            <Text style={[styles.checkLabel, token && styles.checkLabelChecked]}>Create Free Account</Text>
            <Text style={styles.checkDesc}>Sign up with your phone number to start</Text>
          </View>
          <Ionicons name="chevron-forward" size={12} color="rgba(15,23,42,0.3)" />
        </Pressable>

        {/* Step 2 */}
        <Pressable 
          onPress={consultationClaimed ? null : handleClaimConsultation}
          style={styles.checkRow}
        >
          <View style={[styles.checkCircle, consultationClaimed && styles.checkCircleChecked]}>
            {consultationClaimed ? (
              <Ionicons name="checkmark" size={12} color={colors.white} />
            ) : (
              <View style={styles.checkCircleDot} />
            )}
          </View>
          <View style={styles.checkTextWrap}>
            <Text style={[styles.checkLabel, consultationClaimed && styles.checkLabelChecked]}>
              Claim Phone Assessment
            </Text>
            <Text style={styles.checkDesc}>Get a free 10-min consultation call from experts</Text>
          </View>
          {!consultationClaimed && (
            <View style={styles.checkActionBadge}>
              <Text style={styles.checkActionBadgeText}>Claim Free</Text>
            </View>
          )}
        </Pressable>

        {/* Step 3 */}
        <Pressable 
          onPress={() => navigation.navigate('PhysioList')}
          style={styles.checkRow}
        >
          <View style={styles.checkCircle}>
            <View style={styles.checkCircleDot} />
          </View>
          <View style={styles.checkTextWrap}>
            <Text style={styles.checkLabel}>Schedule At-Home Visit</Text>
            <Text style={styles.checkDesc}>Select slot & match with a verified therapist</Text>
          </View>
          <Ionicons name="chevron-forward" size={12} color="rgba(15,23,42,0.3)" />
        </Pressable>
      </View>
    </View>
  )
})

const FRONT_SPOTS = [
  { id: 'head', name: 'Head & Migraine Care', issue: 'Neck Pain', top: 12, left: 70, icon: 'fitness-outline', desc: 'Tension headaches, migraine-related neck strain' },
  { id: 'neck', name: 'Neck & Cervical Care', issue: 'Neck Pain', top: 28, left: 60, icon: 'fitness-outline', desc: 'Stiffness, cervical spondylosis, nerve strain' },
  { id: 'shoulder_l', name: 'Left Shoulder Care', issue: 'Neck Pain', top: 40, left: 28, icon: 'fitness-outline', desc: 'Frozen shoulder, rotatory stiffness, impingement' },
  { id: 'shoulder_m', name: 'Mid Shoulder & Upper Chest', issue: 'Neck Pain', top: 40, left: 60, icon: 'fitness-outline', desc: 'Upper chest / clavicle strain, bilateral shoulder tension' },
  { id: 'shoulder_r', name: 'Right Shoulder Care', issue: 'Neck Pain', top: 40, left: 92, icon: 'fitness-outline', desc: 'Frozen shoulder, rotatory stiffness, impingement' },
  { id: 'hip', name: 'Hip & Pelvis Care', issue: 'Back Pain', top: 124, left: 60, icon: 'body-outline', desc: 'Hip joint pain, pelvic imbalance, SI joint strain' },
  { id: 'knee_l', name: 'Left Knee Joint', issue: 'Knee Pain', top: 162, left: 41, icon: 'walk-outline', desc: 'Arthritis, ligament tear, meniscus injury' },
  { id: 'knee_r', name: 'Right Knee Joint', issue: 'Knee Pain', top: 162, left: 79, icon: 'walk-outline', desc: 'Arthritis, ligament tear, meniscus injury' },
]

const BACK_SPOTS = [
  { id: 'head', name: 'Head & Migraine Care', issue: 'Neck Pain', top: 12, left: 70, icon: 'fitness-outline', desc: 'Tension headaches, migraine-related neck strain' },
  { id: 'shoulder_l', name: 'Left Shoulder Blade', issue: 'Neck Pain', top: 40, left: 28, icon: 'fitness-outline', desc: 'Scapular pain, postural strain, tightness' },
  { id: 'shoulder_m', name: 'Upper Spine & Posture', issue: 'Neck Pain', top: 40, left: 60, icon: 'fitness-outline', desc: 'Upper back postural strain, thoracic stiffness' },
  { id: 'shoulder_r', name: 'Right Shoulder Blade', issue: 'Neck Pain', top: 40, left: 92, icon: 'fitness-outline', desc: 'Scapular pain, postural strain, tightness' },
  { id: 'hip', name: 'Hip & Pelvis Care', issue: 'Back Pain', top: 124, left: 60, icon: 'body-outline', desc: 'Hip joint pain, pelvic imbalance, SI joint strain' },
]

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { token } = useAuth()
  const { data: pricingSettings } = usePricingSettings()
  const planTierCards = useMemo(() => {
    const cards = buildMobilePlanTierCards(pricingSettings?.planTiers)
    return cards.length > 0 ? cards : FALLBACK_PLAN_TIER_CARDS
  }, [pricingSettings?.planTiers])
  
  const [userName, setUserName] = useState('')
  const [featuredPhysios, setFeaturedPhysios] = useState([])
  const [loadingPhysios, setLoadingPhysios] = useState(true)
  const [serviceAreaLabel, setServiceAreaLabel] = useState(DEFAULT_SERVICE_AREA.label)
  const [searchCoords, setSearchCoords] = useState({
    lat: DEFAULT_SERVICE_AREA.lat,
    lng: DEFAULT_SERVICE_AREA.lng,
  })
  const [homeStats, setHomeStats] = useState({
    activeSpecialists: null,
    bookingRateToday: null,
    loading: true,
  })
  const [alertCount, setAlertCount] = useState(0)
  const [activeBooking, setActiveBooking] = useState(null)
  const [activeFaqCat, setActiveFaqCat] = useState('All')
  const [painViewMode, setPainViewMode] = useState('grid') // 'grid' | 'map'
  const [bodyViewSide, setBodyViewSide] = useState('front') // 'front' | 'back'
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [selectedPainScale, setSelectedPainScale] = useState(5)

  const getPainColor = (val) => {
    if (val <= 3) return '#10b981'
    if (val <= 6) return '#f59e0b'
    if (val <= 8) return '#f97316'
    return '#ef4444'
  }

  const getPainBgColor = (val) => {
    if (val <= 3) return 'rgba(16, 185, 129, 0.2)'
    if (val <= 6) return 'rgba(245, 158, 11, 0.2)'
    if (val <= 8) return 'rgba(249, 115, 22, 0.2)'
    return 'rgba(239, 68, 68, 0.2)'
  }

  const getPainLabel = (val) => {
    if (val <= 3) return 'Mild'
    if (val <= 6) return 'Moderate'
    if (val <= 8) return 'Severe'
    return 'Extreme'
  }

  const getPainEmoji = (val) => {
    if (val <= 3) return '😊'
    if (val <= 6) return '😐'
    if (val <= 8) return '😟'
    return '😫'
  }

  const getClinicalGuideTitle = (val) => {
    if (val <= 3) return 'Mild Discomfort'
    if (val <= 6) return 'Moderate Pain'
    if (val <= 8) return 'Severe Pain'
    return 'Extreme Pain'
  }

  const getClinicalGuideDesc = (val) => {
    if (val <= 3) return 'Rehab focus: gentle mobility exercises and light active stretching to recover joint range of motion. Safe for home routines.'
    if (val <= 6) return 'Rehab focus: progressive load management, active stabilization, and customized therapeutic strength exercises.'
    if (val <= 8) return 'Rehab focus: passive pain-relief modalities, gentle manual therapy, and joint mobilization. Avoid heavy active loading.'
    return 'Rehab focus: strict pain control, postural unloading, and emergency-safe gentle manual care under direct senior oversight.'
  }

  const pulseAnim = useRef(new Animated.Value(0.4)).current
  const activePulseAnim = useRef(new Animated.Value(0.3)).current
  const scanAnim = useRef(new Animated.Value(0)).current
  const emojiScaleAnim = useRef(new Animated.Value(1)).current

  const handlePainScaleChange = (num) => {
    setSelectedPainScale(num)
    emojiScaleAnim.setValue(0.4)
    Animated.spring(emojiScaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  const handleSpotSelect = (spot) => {
    setSelectedSpot(spot)
    setSelectedPainScale(5)
    emojiScaleAnim.setValue(0.4)
    Animated.spring(emojiScaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  useEffect(() => {
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
  }, [pulseAnim])

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(activePulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(activePulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [activePulseAnim])

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [scanAnim])

  useEffect(() => {
    if (!token) {
      setUserName('')
      setAlertCount(0)
      return
    }
    let active = true
    async function fetchProfile() {
      try {
        const response = await api.get('/profile')
        if (!active || !response.data) return
        if (response.data.name) {
          const firstName = response.data.name.split(' ')[0]
          setUserName(firstName)
        }
        const profileLocation = response.data.address?.text || ''
        if (profileLocation) {
          setServiceAreaLabel(extractAreaLabel(profileLocation))
        }
        const lat = Number(response.data.address?.lat)
        const lng = Number(response.data.address?.lng)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setSearchCoords({ lat, lng })
        }
      } catch (err) {
        // Silent fallback
      }
    }
    fetchProfile()
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setAlertCount(0)
      setActiveBooking(null)
      return
    }
    let active = true
    async function fetchAlerts() {
      try {
        const response = await api.get('/bookings/mine', { params: { limit: 20 } })
        if (!active) return
        const bookings = response.data?.data || []
        setAlertCount(countActionableBookings(bookings))
        const found = bookings.find((b) => b.sessionStatus !== 'completed') || null
        setActiveBooking(found)
      } catch (err) {
        if (active) {
          setAlertCount(0)
          setActiveBooking(null)
        }
      }
    }
    fetchAlerts()
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    let active = true
    async function fetchHomeStats() {
      try {
        setHomeStats((prev) => ({ ...prev, loading: true }))
        const response = await api.get('/platform/home-stats', {
          params: {
            lat: searchCoords.lat,
            lng: searchCoords.lng,
            city: serviceAreaLabel,
          },
        })
        if (!active) return
        setHomeStats({
          activeSpecialists: Number(response.data?.activeSpecialists ?? 0),
          bookingRateToday:
            response.data?.bookingRateToday == null
              ? null
              : Number(response.data.bookingRateToday),
          loading: false,
        })
      } catch (err) {
        if (active) {
          setHomeStats({ activeSpecialists: 0, bookingRateToday: null, loading: false })
        }
      }
    }
    fetchHomeStats()
    return () => {
      active = false
    }
  }, [searchCoords.lat, searchCoords.lng, serviceAreaLabel])

  useEffect(() => {
    let active = true
    async function fetchPhysios() {
      try {
        setLoadingPhysios(true)
        const response = await api.get('/physios/nearby', {
          params: { lat: searchCoords.lat, lng: searchCoords.lng, limit: 6 },
        })
        if (active) {
          setFeaturedPhysios(response.data.physios || [])
        }
      } catch (err) {
        console.warn('Failed to fetch nearby physios:', err)
      } finally {
        if (active) {
          setLoadingPhysios(false)
        }
      }
    }
    fetchPhysios()
    return () => {
      active = false
    }
  }, [searchCoords.lat, searchCoords.lng])

  const showLocationSelector = () => {
    const displayCount = displaySpecialistCount(homeStats.activeSpecialists)
    const specialistLine =
      homeStats.activeSpecialists == null
        ? 'Loading specialist availability…'
        : `${displayCount} verified specialist${displayCount === 1 ? '' : 's'} are currently available near ${serviceAreaLabel}.`
    Alert.alert(
      'Service Coverage Area',
      `We provide verified home-visit physiotherapy in ${serviceAreaLabel}, Assam and nearby areas.\n\n${specialistLine}`,
      [{ text: 'OK', style: 'default' }]
    )
  }

  const demandInsightText = useMemo(() => {
    if (homeStats.loading) return 'Checking live availability in your area…'
    const count = displaySpecialistCount(homeStats.activeSpecialists)
    const ratePart =
      homeStats.bookingRateToday == null
        ? ''
        : ` · ${homeStats.bookingRateToday}% slots filled today`
    return `⚡ ${count} active specialist${count === 1 ? '' : 's'} in ${serviceAreaLabel}${ratePart}`
  }, [homeStats.loading, homeStats.activeSpecialists, homeStats.bookingRateToday, serviceAreaLabel])

  const openWhatsAppConcierge = () => {
    const message = encodeURIComponent("Hello PhysiOkhom, I need assistance with booking a physiotherapist session.")
    const url = `https://wa.me/918453580556?text=${message}`
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp. Please contact support.')
    })
  }

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    if (activeFaqCat === 'All') return true
    return item.cat === activeFaqCat
  })

  return (
    <View style={styles.flex}>
      <StitchHeader
        token={token}
        onSignIn={() => navigation.navigate('Login')}
        onDashboard={() => {
          if (!token) return navigation.navigate('Login')
          navigation.navigate(getDefaultDashboardScreen())
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {/* Ambient Top Background Halo Glow */}
        <View style={styles.ambientHeaderGlow} pointerEvents="none" />
        <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

        {/* ── Personalized Dashboard Header Section ────────────────── */}
        <View style={styles.headerSection}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerGreeting}>
              {userName ? `Hello, ${userName} 👋` : 'Welcome to PhysiOkhom'}
            </Text>
            <Text style={styles.headerTitle}>Connect with expert physiotherapists near you</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => {
                if (alertCount > 0) {
                  if (!token) return navigation.navigate('Login')
                  navigation.navigate(getDefaultDashboardScreen())
                  return
                }
                Alert.alert('Notifications', 'No new alerts.', [{ text: 'OK' }])
              }}
              style={styles.headerIconBtn}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.textPrimary} />
              {alertCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {alertCount > 9 ? '9+' : String(alertCount)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => {
                if (!token) return navigation.navigate('Login')
                navigation.navigate(getDefaultDashboardScreen())
              }}
              style={styles.profileAvatarBtn}
            >
              <View style={styles.profileAvatarCircle}>
                <Text style={styles.profileAvatarText}>
                  {userName ? userName[0].toUpperCase() : 'P'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Real-time Demand Activity Pill */}
        <View style={styles.demandInsightContainer}>
          <View style={styles.demandInsightPulse} />
          <Text style={styles.demandInsightText}>
            {demandInsightText}
          </Text>
        </View>

        {/* ── Unified Airbnb-Style Dual Search Bar ──────────────────── */}
        <View style={styles.searchSection}>
          <Pressable
            onPress={showLocationSelector}
            style={({ pressed }) => [styles.searchLocationCol, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.searchLocationIconBg}>
              <Ionicons name="location-sharp" size={12} color={figmaTokens.primary} />
            </View>
            <Text style={styles.searchLocationText} numberOfLines={1}>{serviceAreaLabel}</Text>
            <Ionicons name="chevron-down" size={10} color={colors.textSecondary} />
          </Pressable>
          
          <View style={styles.searchDivider} />

          <Pressable
            onPress={() => navigation.navigate('PhysioList')}
            style={({ pressed }) => [styles.searchQueryCol, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="search-outline" size={15} color="rgba(15, 23, 42, 0.45)" />
            <Text style={styles.searchPlaceholderText} numberOfLines={1}>
              Search symptoms or therapies...
            </Text>
            <View style={styles.searchArrowBtn}>
              <Ionicons name="arrow-forward" size={12} color={colors.white} />
            </View>
          </Pressable>
        </View>

        {/* SaaS Core Value Badges */}
        <View style={styles.valueRow}>
          <View style={[styles.valueItem, { backgroundColor: colors.success + '08', borderColor: colors.success + '20' }]}>
            <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} />
            <Text style={[styles.valueText, { color: colors.success }]}>Verified BPT/MPT</Text>
          </View>
          <View style={[styles.valueItem, { backgroundColor: figmaTokens.primary + '08', borderColor: figmaTokens.primary + '20' }]}>
            <Ionicons name="home-outline" size={12} color={figmaTokens.primary} />
            <Text style={[styles.valueText, { color: figmaTokens.primary }]}>At-Home Care</Text>
          </View>
          <View style={[styles.valueItem, { backgroundColor: colors.info + '08', borderColor: colors.info + '20' }]}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.info} />
            <Text style={[styles.valueText, { color: colors.info }]}>Safe & Secure</Text>
          </View>
        </View>

        {/* ── Dynamic User Health Hub Card ─────────────────────────── */}
        <HealthHubCard
          token={token}
          navigation={navigation}
          openWhatsApp={openWhatsAppConcierge}
          activeBooking={activeBooking}
        />

        {/* ── Advanced Therapeutic Techniques ───────────────────────── */}
        <SectionHeader icon="flask-outline" title="Advanced Therapeutic Techniques" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialtiesScroll}
          decelerationRate="fast"
        >
          {TECHNIQUES.map((tech) => (
            <SpecialtyCard
              key={tech.title}
              title={tech.title}
              image={tech.image}
              bg={tech.bg}
              color={tech.color}
              onPress={() => navigation.navigate('TechniqueDetail', { slug: tech.slug })}
            />
          ))}
        </ScrollView>

        {/* ── Specialties Row (Circular Icons Carousel) ───────────────── */}
        <SectionHeader icon="medical-outline" title="Clinical Specialities" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialtiesScroll}
          decelerationRate="fast"
        >
          {SPECIALTIES.map((spec) => (
            <SpecialtyCard
              key={spec.title}
              title={spec.title}
              image={spec.image}
              bg={spec.bg}
              color={spec.color}
              onPress={() => {
                if (spec.id === 'Many More') {
                  navigation.navigate('PhysioList')
                } else {
                  navigation.navigate('PhysioList', { issue: spec.id })
                }
              }}
            />
          ))}
        </ScrollView>

        {/* ── Pain Zone Grid / Anatomical Map ────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionHeader, { marginTop: 0, marginBottom: 0 }]}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="body-outline" size={13} color={figmaTokens.primary} />
            </View>
            <Text style={styles.sectionTitle}>Where do you need support?</Text>
          </View>
          
          <View style={styles.painToggleContainer}>
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={() => { setPainViewMode('grid'); setSelectedSpot(null); }}
              style={[styles.painToggleBtn, painViewMode === 'grid' && styles.painToggleBtnActive]}
            >
              <Ionicons name="grid" size={11} color={painViewMode === 'grid' ? '#ffffff' : figmaTokens.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.painToggleText, painViewMode === 'grid' && styles.painToggleTextActive]}>Grid</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={() => { setPainViewMode('map'); setSelectedSpot(null); }}
              style={[styles.painToggleBtn, painViewMode === 'map' && styles.painToggleBtnActive]}
            >
              <Ionicons name="body" size={11} color={painViewMode === 'map' ? '#ffffff' : figmaTokens.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.painToggleText, painViewMode === 'map' && styles.painToggleTextActive]}>Body Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {painViewMode === 'grid' ? (
          <View style={styles.painGrid}>
            <View style={styles.painRow}>
              {/* Lower Back */}
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('PhysioList', { issue: 'Back Pain' })}
                style={[styles.painCard, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}
              >
                <Image 
                  source={require('../../assets/images/illustration_back_pain.png')} 
                  style={styles.painIllustrationImage} 
                  resizeMode="cover"
                />
                <View style={styles.painCardBody}>
                  <Text style={[styles.painCardTitle, { color: '#b91c1c' }]}>Lower Back</Text>
                  <Text style={styles.painCardDesc} numberOfLines={2}>Stiffness, slip disc, spasm, backache</Text>
                </View>
                <Ionicons name="chevron-forward" size={12} color="#b91c1c" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {/* Knee Joint */}
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('PhysioList', { issue: 'Knee Pain' })}
                style={[styles.painCard, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}
              >
                <Image 
                  source={require('../../assets/images/illustration_knee_pain.png')} 
                  style={styles.painIllustrationImage} 
                  resizeMode="cover"
                />
                <View style={styles.painCardBody}>
                  <Text style={[styles.painCardTitle, { color: '#c2410c' }]}>Knee & Joint</Text>
                  <Text style={styles.painCardDesc} numberOfLines={2}>Ligament injury, arthritis, stiffness</Text>
                </View>
                <Ionicons name="chevron-forward" size={12} color="#c2410c" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>

            <View style={styles.painRow}>
              {/* Neck & Shoulder */}
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('PhysioList', { issue: 'Neck Pain' })}
                style={[styles.painCard, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}
              >
                <Image 
                  source={require('../../assets/images/illustration_neck_pain.png')} 
                  style={styles.painIllustrationImage} 
                  resizeMode="cover"
                />
                <View style={styles.painCardBody}>
                  <Text style={[styles.painCardTitle, { color: '#6d28d9' }]}>Neck & Spine</Text>
                  <Text style={styles.painCardDesc} numberOfLines={2}>Cervical pain, frozen shoulder, strain</Text>
                </View>
                <Ionicons name="chevron-forward" size={12} color="#6d28d9" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {/* Neuro/Stroke */}
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('PhysioList', { issue: 'Neuro Rehab' })}
                style={[styles.painCard, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}
              >
                <Image 
                  source={require('../../assets/images/illustration_neuro_rehab.png')} 
                  style={styles.painIllustrationImage} 
                  resizeMode="cover"
                />
                <View style={styles.painCardBody}>
                  <Text style={[styles.painCardTitle, { color: '#15803d' }]}>Stroke/Paralysis</Text>
                  <Text style={styles.painCardDesc} numberOfLines={2}>Stroke recovery, paralysis care, numbness</Text>
                </View>
                <Ionicons name="chevron-forward" size={12} color="#15803d" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>

            <View style={styles.painRow}>
              {/* Others */}
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('PhysioList')}
                style={[styles.painCard, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}
              >
                <Image 
                  source={require('../../assets/images/illustration_other.png')} 
                  style={styles.painIllustrationImage} 
                  resizeMode="cover"
                />
                <View style={styles.painCardBody}>
                  <Text style={[styles.painCardTitle, { color: '#475569' }]}>Others</Text>
                  <Text style={styles.painCardDesc} numberOfLines={2}>Any other conditions, post-op care, general rehab</Text>
                </View>
                <Ionicons name="chevron-forward" size={12} color="#475569" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <View style={styles.mapCardContainer}>
            <View style={styles.mapViewHeader}>
              <Text style={styles.mapViewSub}>Tap joint hotspots to find specialists</Text>
              <View style={styles.sideToggleBg}>
                <TouchableOpacity 
                  onPress={() => { setBodyViewSide('front'); setSelectedSpot(null); }}
                  style={[styles.sideToggleBtn, bodyViewSide === 'front' && styles.sideToggleBtnActive]}
                >
                  <Text style={[styles.sideToggleText, bodyViewSide === 'front' && styles.sideToggleTextActive]}>Front</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => { setBodyViewSide('back'); setSelectedSpot(null); }}
                  style={[styles.sideToggleBtn, bodyViewSide === 'back' && styles.sideToggleBtnActive]}
                >
                  <Text style={[styles.sideToggleText, bodyViewSide === 'back' && styles.sideToggleTextActive]}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.mapViewport}>
              {/* Blueprint Tech Grid Background */}
              <View style={styles.gridOverlay} pointerEvents="none">
                {[...Array(6)].map((_, i) => (
                  <View key={`h-${i}`} style={[styles.gridLineH, { top: (250 / 6) * i }]} />
                ))}
                {[...Array(6)].map((_, i) => (
                  <View key={`v-${i}`} style={[styles.gridLineV, { left: (200 / 6) * i }]} />
                ))}
              </View>

              {/* Sweeping scan beam */}
              <Animated.View
                style={[
                  styles.scanBar,
                  {
                    transform: [{
                      translateY: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 260],
                      })
                    }]
                  }
                ]}
                pointerEvents="none"
              />

              <View style={styles.bodyGraphicContainer}>
                {/* Head */}
                <View style={styles.bodyHead} />
                {/* Neck */}
                <View style={styles.bodyNeck} />
                {/* Shoulders */}
                <View style={styles.bodyShoulders} />
                {/* Torso */}
                <View style={styles.bodyTorso} />
                {/* Arms */}
                <View style={styles.bodyArmLeft} />
                <View style={styles.bodyArmRight} />
                {/* Hips */}
                <View style={styles.bodyHips} />
                {/* Legs */}
                <View style={styles.bodyLegLeft} />
                <View style={styles.bodyLegRight} />
                
                {bodyViewSide === 'back' && (
                  <View style={styles.bodySpineLine} />
                )}

                {/* Hotspots */}
                {(bodyViewSide === 'front' ? FRONT_SPOTS : BACK_SPOTS).map((spot) => {
                  const active = selectedSpot?.id === spot.id
                  
                  // Setup scaling animation for 9-10
                  const scaleVal = active && selectedPainScale >= 9
                    ? activePulseAnim.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [1.1, 1.3],
                      })
                    : (active ? 1.15 : 1.0);

                  const borderColorVal = active ? getPainColor(selectedPainScale) : figmaTokens.primary;
                  const bgColorVal = active ? getPainBgColor(selectedPainScale) : 'rgba(13, 107, 107, 0.15)';
                  const innerBgColorVal = active ? getPainColor(selectedPainScale) : figmaTokens.primary;

                  return (
                    <TouchableOpacity
                      key={spot.id}
                      activeOpacity={0.8}
                      onPress={() => handleSpotSelect(spot)}
                      style={[
                        styles.hotspot,
                        { top: spot.top, left: spot.left, borderWidth: 0, backgroundColor: 'transparent' }
                      ]}
                    >
                      <Animated.View style={[
                        styles.hotspotInnerRing,
                        {
                          borderColor: borderColorVal,
                          backgroundColor: bgColorVal,
                          transform: [{ scale: scaleVal }],
                          shadowColor: borderColorVal,
                          shadowOpacity: active ? 0.6 : 0.1,
                          shadowRadius: active ? 6 : 1,
                        }
                      ]}>
                        <View style={[styles.hotspotInner, { backgroundColor: innerBgColorVal }]} />
                      </Animated.View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Selected Spot Tooltip Info */}
            <View style={styles.spotDetailContainer}>
              {selectedSpot ? (
                <View style={styles.spotDetailCard}>
                  <View style={styles.spotDetailHeader}>
                    <View style={styles.spotDetailIconWrap}>
                      <Ionicons name={selectedSpot.icon} size={14} color={figmaTokens.primary} />
                    </View>
                    <View style={styles.spotDetailBody}>
                      <Text style={styles.spotDetailTitle}>{selectedSpot.name}</Text>
                      <Text style={styles.spotDetailDesc}>{selectedSpot.desc}</Text>
                    </View>
                  </View>

                  {/* Custom Pain segment slider */}
                  <View style={styles.painScaleContainer}>
                    <View style={styles.painHeaderWithEmoji}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.painScaleHeading}>Pain Intensity Scale</Text>
                        <Text style={styles.painScaleSubheading}>Select level 1 (mild) to 10 (extreme)</Text>
                      </View>
                      <Animated.View style={[
                        styles.emojiBubble,
                        {
                          backgroundColor: getPainBgColor(selectedPainScale),
                          borderColor: getPainColor(selectedPainScale) + '40',
                          transform: [{ scale: emojiScaleAnim }]
                        }
                      ]}>
                        <Text style={styles.emojiText}>{getPainEmoji(selectedPainScale)}</Text>
                        <Text style={[styles.emojiLabel, { color: getPainColor(selectedPainScale) }]}>
                          {selectedPainScale} - {getPainLabel(selectedPainScale)}
                        </Text>
                      </Animated.View>
                    </View>
                    
                    <View style={styles.painScaleSegments}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                        const isSelected = selectedPainScale === num;
                        const activeColor = getPainColor(num);
                        return (
                          <TouchableOpacity
                            key={num}
                            style={[
                              styles.painScaleSegmentBtn,
                              isSelected && {
                                backgroundColor: activeColor,
                                borderColor: activeColor,
                                shadowColor: activeColor,
                                shadowOpacity: 0.4,
                                shadowRadius: 4,
                                elevation: 3,
                              }
                            ]}
                            onPress={() => handlePainScaleChange(num)}
                          >
                            <Text style={[
                              styles.painScaleSegmentText,
                              isSelected && styles.painScaleSegmentTextActive
                            ]}>
                              {num}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                    <View style={styles.painScaleRangeLabels}>
                      <Text style={styles.painScaleRangeText}>Mild</Text>
                      <Text style={styles.painScaleRangeText}>Moderate</Text>
                      <Text style={styles.painScaleRangeText}>Severe</Text>
                      <Text style={styles.painScaleRangeText}>Extreme</Text>
                    </View>

                    {/* Clinical Guidelines Card */}
                    <View style={[styles.clinicalGuideCard, { backgroundColor: getPainBgColor(selectedPainScale) + '15', borderColor: getPainColor(selectedPainScale) + '20' }]}>
                      <Ionicons name="medical" size={12} color={getPainColor(selectedPainScale)} style={{ marginTop: 2, marginRight: 6 }} />
                      <View style={styles.clinicalGuideBody}>
                        <Text style={[styles.clinicalGuideTitle, { color: getPainColor(selectedPainScale) }]}>
                          {getClinicalGuideTitle(selectedPainScale)}
                        </Text>
                        <Text style={styles.clinicalGuideDesc}>
                          {getClinicalGuideDesc(selectedPainScale)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.spotBookBtn, { backgroundColor: getPainColor(selectedPainScale) }]}
                    onPress={() => navigation.navigate('PhysioList', { 
                      issue: selectedSpot.issue,
                      painRating: selectedPainScale
                    })}
                  >
                    <Text style={styles.spotBookBtnText}>Find Doctors for {selectedSpot.issue}</Text>
                    <Ionicons name="arrow-forward" size={9} color="#ffffff" style={{ marginLeft: 3 }} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.spotDetailPlaceholder}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} style={{ marginRight: 6 }} />
                  <Text style={styles.spotDetailPlaceholderText}>Select a spot on the anatomical map to begin</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Physiotherapy Plans Carousel ────────────────────────────────── */}
        <SectionHeader icon="calendar-outline" title="Physiotherapy Plans" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoCarousel}
          decelerationRate="fast"
        >
          {planTierCards.map((plan, idx) => (
            <PromoCard
              key={idx}
              title={plan.label}
              desc={plan.desc}
              badge={plan.badge}
              saveCallout={plan.saveCallout}
              sessions={plan.sessions}
              bg={plan.bg}
              border={plan.border}
              color={plan.color}
              titleColor={plan.titleColor}
              icon={plan.icon}
            />
          ))}
        </ScrollView>

        {/* ── Featured Specialists Near You (Zocdoc style) ──────────────── */}
        <SectionHeader icon="people-outline" title="Featured Specialists Near You" />
        {loadingPhysios ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredCarousel}
          >
            {[...Array(3)].map((_, i) => (
              <PhysioCardSkeleton key={i} />
            ))}
          </ScrollView>
        ) : featuredPhysios.length === 0 ? (
          <View style={styles.noPhysioContainer}>
            <Ionicons name="location-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.noPhysioText}>No verified specialists available nearby right now.</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredCarousel}
            decelerationRate="fast"
          >
            {featuredPhysios.map((physio) => (
              <FeaturedPhysioCard
                key={physio._id}
                physio={physio}
                pulseAnim={activePulseAnim}
                onPress={() => navigation.navigate('PublicPhysician', { id: physio._id })}
              />
            ))}
          </ScrollView>
        )}

        {/* ── How It Works (Premium Step Timeline) ────────────────────── */}
        <SectionHeader icon="information-circle-outline" title="How It Works" />
        <View style={styles.timelineContainer}>
          <View style={styles.timelineLine} />

          <View style={styles.timelineStep}>
            <View style={styles.timelineNode}>
              <Text style={styles.timelineNodeText}>1</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineStepTitle}>Book Online</Text>
              <Text style={styles.timelineStepDesc}>
                Select a convenient slot and tell us about your physical symptoms in under 2 minutes.
              </Text>
              <View style={styles.timelineBadge}>
                <Ionicons name="flash-outline" size={10} color={figmaTokens.primary} />
                <Text style={styles.timelineBadgeText}>Instant Confirmation</Text>
              </View>
            </View>
          </View>

          <View style={styles.timelineStep}>
            <View style={styles.timelineNode}>
              <Text style={styles.timelineNodeText}>2</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineStepTitle}>Get Matched</Text>
              <Text style={styles.timelineStepDesc}>
                We assign a highly qualified, background-verified therapist specializing in your exact condition.
              </Text>
              <View style={styles.timelineBadge}>
                <Ionicons name="shield-checkmark-outline" size={10} color={figmaTokens.primary} />
                <Text style={styles.timelineBadgeText}>100% Background Checked</Text>
              </View>
            </View>
          </View>

          <View style={styles.timelineStep}>
            <View style={styles.timelineNode}>
              <Text style={styles.timelineNodeText}>3</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineStepTitle}>Recover At Home</Text>
              <Text style={styles.timelineStepDesc}>
                Your doctor visits your home for personalized therapy. Track all recovery, metrics & reports in-app.
              </Text>
              <View style={styles.timelineBadge}>
                <Ionicons name="trending-up-outline" size={10} color={figmaTokens.primary} />
                <Text style={styles.timelineBadgeText}>Progress Dashboard</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Care Comparison Board ────────────────────────────────── */}
        <SectionHeader icon="swap-horizontal-outline" title="Home Care vs. Traditional Clinic" />
        <View style={styles.compareContainer}>
          {/* Home Care */}
          <View style={[styles.compareCol, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={styles.compareHeader}>
              <Ionicons name="checkmark-circle" size={14} color="#15803d" />
              <Text style={[styles.compareHeaderTitle, { color: '#15803d' }]}>At-Home Care</Text>
            </View>
            <Text style={styles.compareSubtitle}>With PhysiOkhom</Text>
            <View style={styles.compareList}>
              <View style={styles.compareItem}>
                <Ionicons name="checkmark" size={10} color="#15803d" style={styles.compareItemIcon} />
                <Text style={styles.compareItemText}>100% focused 1-on-1 therapist attention</Text>
              </View>
              <View style={styles.compareItem}>
                <Ionicons name="checkmark" size={10} color="#15803d" style={styles.compareItemIcon} />
                <Text style={styles.compareItemText}>Comfort & safety of your own home</Text>
              </View>
              <View style={styles.compareItem}>
                <Ionicons name="checkmark" size={10} color="#15803d" style={styles.compareItemIcon} />
                <Text style={styles.compareItemText}>Zero travel, traffic, or parking stress</Text>
              </View>
              <View style={styles.compareItem}>
                <Ionicons name="checkmark" size={10} color="#15803d" style={styles.compareItemIcon} />
                <Text style={styles.compareItemText}>Personalized treatment in active setup</Text>
              </View>
            </View>
          </View>

          {/* Traditional Clinic */}
          <View style={[styles.compareCol, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
            <View style={styles.compareHeader}>
              <Ionicons name="close-circle" size={14} color="#64748b" />
              <Text style={[styles.compareHeaderTitle, { color: '#475569' }]}>Traditional Clinic</Text>
            </View>
            <Text style={styles.compareSubtitle}>Standard Facilities</Text>
            <View style={styles.compareList}>
              <View style={styles.compareItem}>
                <Ionicons name="close" size={10} color="#64748b" style={styles.compareItemIcon} />
                <Text style={styles.compareItemText}>Therapist splits time with 3-4 patients</Text>
              </View>
              <View style={styles.compareItem}>
                <Ionicons name="close" size={10} color="#64748b" style={styles.compareItemIcon} />
                <Text style={styles.compareItemText}>Exposure to clinical germs & viruses</Text>
              </View>
              <View style={styles.compareItem}>
                <Ionicons name="close" size={10} color="#64748b" style={styles.compareItemIcon} />
                <Text style={styles.compareItemText}>Painful commute when mobility is low</Text>
              </View>
              <View style={styles.compareItem}>
                <Ionicons name="close" size={10} color="#64748b" style={styles.compareItemIcon} />
                <Text style={styles.compareItemText}>Long waiting times in noisy rooms</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Why PhysiOkhom Card Grid (2-column layout) ───────────────── */}
        <SectionHeader icon="star-outline" title="Why Patients Choose Us" />
        <View style={styles.whyGrid}>
          <View style={styles.whyGridRow}>
            {/* Card 1 */}
            <View style={[styles.whyGridCard, { backgroundColor: WHY_FEATURES[0].bg, borderColor: WHY_FEATURES[0].color + '15' }]}>
              <View style={[styles.whyGridIconWrap, { backgroundColor: WHY_FEATURES[0].color + '12' }]}>
                <Ionicons name={WHY_FEATURES[0].icon} size={18} color={WHY_FEATURES[0].color} />
              </View>
              <Text style={styles.whyGridCardTitle}>{WHY_FEATURES[0].title}</Text>
              <Text style={styles.whyGridCardDesc}>{WHY_FEATURES[0].desc}</Text>
            </View>
            {/* Card 2 */}
            <View style={[styles.whyGridCard, { backgroundColor: WHY_FEATURES[1].bg, borderColor: WHY_FEATURES[1].color + '15' }]}>
              <View style={[styles.whyGridIconWrap, { backgroundColor: WHY_FEATURES[1].color + '12' }]}>
                <Ionicons name={WHY_FEATURES[1].icon} size={18} color={WHY_FEATURES[1].color} />
              </View>
              <Text style={styles.whyGridCardTitle}>{WHY_FEATURES[1].title}</Text>
              <Text style={styles.whyGridCardDesc}>{WHY_FEATURES[1].desc}</Text>
            </View>
          </View>
          {/* Card 3 - Full Width */}
          <View style={[styles.whyGridCardFull, { backgroundColor: WHY_FEATURES[2].bg, borderColor: WHY_FEATURES[2].color + '15' }]}>
            <View style={[styles.whyGridIconWrap, { backgroundColor: WHY_FEATURES[2].color + '12' }]}>
              <Ionicons name={WHY_FEATURES[2].icon} size={18} color={WHY_FEATURES[2].color} />
            </View>
            <View style={styles.whyGridCardFullBody}>
              <Text style={styles.whyGridCardTitle}>{WHY_FEATURES[2].title}</Text>
              <Text style={styles.whyGridCardDesc}>{WHY_FEATURES[2].desc}</Text>
            </View>
          </View>
        </View>

        {/* ── WhatsApp Care Concierge Banner ────────────────────────── */}
        <Pressable
          onPress={openWhatsAppConcierge}
          style={({ pressed }) => [styles.whatsappBanner, pressed && { opacity: 0.95 }]}
        >
          <View style={styles.whatsappIconCircle}>
            <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
          </View>
          <View style={styles.whatsappBannerBody}>
            <View style={styles.whatsappHeaderRow}>
              <Text style={styles.whatsappBannerTitle}>WhatsApp Care Concierge</Text>
              <View style={styles.whatsappLiveBadge}>
                <View style={styles.whatsappLiveDot} />
                <Text style={styles.whatsappLiveText}>Online</Text>
              </View>
            </View>
            <Text style={styles.whatsappBannerDesc}>
              Need help finding the right therapist? Chat with our Care Coordinator. Available 24/7.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#166534" style={styles.whatsappChevron} />
        </Pressable>

        {/* ── Testimonial Card Slider (Horizontal Carousel) ─────────────── */}
        <SectionHeader icon="chatbubbles-outline" title="What Patients Say" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={290}
          decelerationRate="fast"
          contentContainerStyle={styles.testimonialScroll}
        >
          {TESTIMONIALS.map((t, idx) => (
            <View key={idx} style={styles.testimonialContainer}>
              <Ionicons name="quote" size={48} color="rgba(13, 107, 107, 0.025)" style={styles.quoteBgIcon} />
              <View style={styles.testimonialHeader}>
                <View style={styles.testimonialAvatar}>
                  <Text style={styles.testimonialAvatarTxt}>{t.initials}</Text>
                </View>
                <View style={styles.testimonialMeta}>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <Text style={styles.testimonialLoc}>{t.loc}</Text>
                </View>
                <View style={styles.testimonialRating}>
                  <Ionicons name="star" size={11} color={colors.warning} />
                  <Text style={styles.testimonialRatingTxt}>{t.rating}</Text>
                </View>
              </View>
              <Text style={styles.testimonialText} numberOfLines={4}>
                {t.text}
              </Text>
              <View style={styles.testimonialFooter}>
                <Ionicons name="shield-checkmark" size={11} color={colors.success} />
                <Text style={styles.testimonialFooterTxt}>Verified Patient · {t.sessions}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* ── Safety Promise Shield ────────────────────────────────── */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <View style={styles.safetyIconBg}>
              <Ionicons name="shield-checkmark" size={20} color="#d97706" />
            </View>
            <View style={styles.safetyTitleWrap}>
              <Text style={styles.safetyTitle}>The PhysiOkhom At-Home Safety Promise</Text>
              <Text style={styles.safetySubtitle}>Making home rehabilitation secure and comfortable</Text>
            </View>
          </View>
          <View style={styles.safetyGrid}>
            <View style={styles.safetyRow}>
              <View style={styles.safetyItem}>
                <Ionicons name="locate-outline" size={13} color="#d97706" style={{ marginTop: 2 }} />
                <View style={styles.safetyItemBody}>
                  <Text style={styles.safetyItemTitle}>GPS-Tracked Visits</Text>
                  <Text style={styles.safetyItemDesc}>Sessions are logged with check-in and check-out tracking.</Text>
                </View>
              </View>
              <View style={styles.safetyItem}>
                <Ionicons name="ribbon-outline" size={13} color="#d97706" style={{ marginTop: 2 }} />
                <View style={styles.safetyItemBody}>
                  <Text style={styles.safetyItemTitle}>Verified Credentials</Text>
                  <Text style={styles.safetyItemDesc}>100% degree & professional background checked therapists.</Text>
                </View>
              </View>
            </View>
            <View style={styles.safetyRow}>
              <View style={styles.safetyItem}>
                <Ionicons name="sparkles-outline" size={13} color="#d97706" style={{ marginTop: 2 }} />
                <View style={styles.safetyItemBody}>
                  <Text style={styles.safetyItemTitle}>Sanitized Equipment</Text>
                  <Text style={styles.safetyItemDesc}>Thorough sanitation of all therapeutic tools before entering.</Text>
                </View>
              </View>
              <View style={styles.safetyItem}>
                <Ionicons name="help-buoy-outline" size={13} color="#d97706" style={{ marginTop: 2 }} />
                <View style={styles.safetyItemBody}>
                  <Text style={styles.safetyItemTitle}>Dedicated Helpline</Text>
                  <Text style={styles.safetyItemDesc}>24/7 care support center for patient safety & queries.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Trust Metrics Row ────────────────────────────────────────── */}
        <View style={styles.trustBar}>
          <Text style={styles.trustTitle}>TRUSTED BY LEADING CARE NETWORKS</Text>
          <View style={styles.trustBadgesRow}>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="ribbon-outline" size={11} color="rgba(15, 23, 42, 0.5)" />
              <Text style={styles.trustBadgeText}>ISO Certified</Text>
            </View>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="medical-outline" size={11} color="rgba(15, 23, 42, 0.5)" />
              <Text style={styles.trustBadgeText}>BPT/MPT Grads</Text>
            </View>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="star-outline" size={11} color="rgba(15, 23, 42, 0.5)" />
              <Text style={styles.trustBadgeText}>4.9/5 Rating</Text>
            </View>
          </View>
        </View>

        {/* ── FAQ Accordion with Category Filter Tabs ─────────────────────── */}
        <SectionHeader icon="help-circle-outline" title="Frequently Asked Questions" />
        
        {/* Category filters */}
        <View style={styles.faqCatRow}>
          {FAQ_CATEGORIES.map((cat) => {
            const isSelected = activeFaqCat === cat
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveFaqCat(cat)}
                style={[
                  styles.faqCatBtn,
                  isSelected && styles.faqCatBtnSelected
                ]}
              >
                <Text style={[styles.faqCatText, isSelected && styles.faqCatTextSelected]}>
                  {cat}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.faqCard}>
          {filteredFaqs.length === 0 ? (
            <View style={styles.faqEmpty}>
              <Text style={styles.faqEmptyText}>No FAQs found in this category.</Text>
            </View>
          ) : (
            filteredFaqs.map((item, i) => (
              <FaqRow key={item.q} q={item.q} a={item.a} last={i === filteredFaqs.length - 1} />
            ))
          )}
        </View>

        {/* ── Bottom Floating Action CTA ───────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => navigation.navigate('PhysioList')}
          style={styles.bottomCta}
          accessibilityRole="button"
          accessibilityLabel="Find therapists near me"
        >
          <View style={styles.bottomCtaIcon}>
            <Ionicons name="location-outline" size={18} color={colors.white} />
          </View>
          <View style={styles.bottomCtaBody}>
            <Text style={styles.bottomCtaTxt}>Find Physiotherapists Near Me</Text>
            <Text style={styles.bottomCtaSub}>Book verified at-home sessions today</Text>
          </View>
          <View style={styles.bottomCtaChevron}>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </View>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

const SpecialtyCard = memo(function SpecialtyCard({ title, image, bg, color, onPress }) {
  const dynamicBorderColor = color + '22'
  const dynamicShadowColor = color

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.specialtyItem,
        pressed && { transform: [{ scale: 0.94 }] }
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Consult for ${title}`}
    >
      <View style={[
        styles.specialtyCircle, 
        { 
          borderColor: dynamicBorderColor,
          shadowColor: dynamicShadowColor,
        }
      ]}>
        <View style={[styles.specialtyIconInner, { backgroundColor: bg }]}>
          <Image source={image} style={styles.specialtyIconImage} resizeMode="contain" />
        </View>
      </View>
      <Text style={styles.specialtyLabel} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  )
})

const PromoCard = memo(function PromoCard({ title, desc, badge, saveCallout, sessions, bg, border, color, titleColor, icon }) {
  return (
    <View style={[styles.promoCard, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.promoHeader}>
        <View style={[styles.promoBadge, { backgroundColor: color + '12', borderColor: color + '25' }]}>
          <Text style={[styles.promoBadgeTxt, { color: color }]}>{badge}</Text>
        </View>
        {saveCallout ? (
          <View style={[styles.promoSaveTag, { borderColor: color + '30', backgroundColor: color + '06' }]}>
            <Text style={[styles.promoSaveTagText, { color: color }]}>{saveCallout}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.promoContent}>
        <View style={styles.promoTitleRow}>
          <Ionicons name={icon} size={14} color={color} style={styles.promoTitleIcon} />
          <Text style={[styles.promoTitle, { color: titleColor }]} numberOfLines={1}>{title}</Text>
        </View>
        <Text style={styles.promoDesc} numberOfLines={2}>{desc}</Text>
        {sessions != null ? (
          <Text style={styles.promoSessions}>{sessions} sessions included</Text>
        ) : null}
      </View>
    </View>
  )
})

const FeaturedPhysioCard = memo(function FeaturedPhysioCard({ physio, pulseAnim, onPress }) {
  const initials = physio.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const displayName = physio.name.startsWith('Dr') ? physio.name : `Dr. ${physio.name}`
  const badgeColors = getSpecialtyBadgeColors(physio.specialization)
  const slotText = getNextSlotText(physio._id)
  const languages = physio.languages || 'English · Hindi · Assamese'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.featuredCard,
        pressed && { transform: [{ scale: 0.97 }] }
      ]}
    >
      <View style={styles.featuredHeader}>
        <View style={styles.featuredAvatarContainer}>
          <View style={styles.featuredAvatar}>
            {physio.avatar ? (
              <Image source={{ uri: physio.avatar }} style={styles.featuredAvatarImg} />
            ) : (
              <Text style={styles.featuredAvatarTxt}>{initials}</Text>
            )}
          </View>
          <View style={styles.featuredVerifiedBadge}>
            <Ionicons name="checkmark-sharp" size={8} color={colors.white} />
          </View>
        </View>
        
        <View style={styles.featuredMeta}>
          <View style={styles.featuredPulseRow}>
            <View style={styles.featuredPulsePill}>
              <Animated.View style={[styles.featuredPulseDot, { opacity: pulseAnim }]} />
              <Text style={styles.featuredPulseTxt}>Accepting Patients</Text>
            </View>
          </View>
          <Text style={styles.featuredName} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={[styles.featuredBadgePill, { backgroundColor: badgeColors.bg, borderColor: badgeColors.border }]}>
            <Text style={[styles.featuredBadgeText, { color: badgeColors.text }]} numberOfLines={1}>
              {physio.specialization || 'Physiotherapy'}
            </Text>
          </View>
        </View>
      </View>

      {/* Slots & Languages Metadata Section */}
      <View style={styles.featuredMiddle}>
        <View style={styles.featuredMiddleRow}>
          <Ionicons name="briefcase-outline" size={13} color="rgba(15, 23, 42, 0.45)" />
          <Text style={styles.featuredMiddleText} numberOfLines={1}>
            {physio.experience || 0} yrs exp · BPT/MPT Graduate
          </Text>
        </View>

        <View style={styles.featuredMiddleRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color="rgba(15, 23, 42, 0.45)" />
          <Text style={styles.featuredMiddleText} numberOfLines={1}>
            Speaks: {languages}
          </Text>
        </View>
        
        <View style={styles.featuredMiddleRow}>
          <View style={styles.featuredRatingWrapper}>
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text style={styles.featuredRatingVal}>
              {Number(physio.avgRating || 5.0).toFixed(1)}
            </Text>
            <Text style={styles.featuredRatingCount}>
              ({physio.totalReviews || 0} reviews)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.featuredFooter}>
        <View style={styles.featuredFooterLeft}>
          <View style={styles.featuredPriceRow}>
            <Text style={styles.featuredPriceVal}>₹{physio.pricePerSession}</Text>
            <Text style={styles.featuredPriceSub}>/session</Text>
          </View>
          <View style={styles.featuredSlotPill}>
            <Text style={styles.featuredSlotText}>{slotText}</Text>
          </View>
        </View>
        <View style={styles.featuredCta}>
          <Text style={styles.featuredCtaText}>Book Visit</Text>
          <Ionicons name="arrow-forward" size={11} color={colors.white} />
        </View>
      </View>
    </Pressable>
  )
})

function PhysioCardSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [opacity])

  return (
    <Animated.View style={[styles.physioCardSkeleton, { opacity }]} />
  )
}

const CARD_SHADOW = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.03,
  shadowRadius: 16,
  elevation: 2,
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingHorizontal: 16, paddingTop: 16, position: 'relative' },

  // Ambient Header glows
  ambientHeaderGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(162, 240, 239, 0.18)',
    zIndex: 0,
  },
  ambientHeaderGlow2: {
    position: 'absolute',
    top: -50,
    left: '20%',
    width: '60%',
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(13, 107, 107, 0.05)',
    zIndex: 0,
  },

  // Personalized Dashboard Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 4,
    zIndex: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerGreeting: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: figmaTokens.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontFamily: font.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.white,
  },
  notificationBadgeText: {
    color: colors.white,
    fontFamily: font.bold,
    fontSize: 8,
    lineHeight: 10,
  },
  profileAvatarBtn: {
    width: 38,
    height: 38,
  },
  profileAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: figmaTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  profileAvatarText: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.white,
  },

  // Real-time demand indicator widget
  demandInsightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
    gap: 6,
    zIndex: 1,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  demandInsightPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
  },
  demandInsightText: {
    fontFamily: font.bold,
    fontSize: 9,
    color: '#92400e',
  },

  // Unified Airbnb-Style Dual Search Bar
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 6,
    zIndex: 1,
  },
  searchLocationCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '34%',
    paddingRight: 4,
  },
  searchLocationIconBg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e6f4f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchLocationText: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.textPrimary,
    flex: 1,
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  searchQueryCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    gap: 8,
  },
  searchPlaceholderText: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textSecondary,
  },
  searchArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: figmaTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 2,
    gap: 8,
    zIndex: 1,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  valueText: {
    fontFamily: font.bold,
    fontSize: 9,
  },

  // Specialties
  specialtiesScroll: {
    paddingLeft: 4,
    paddingRight: 20,
    paddingBottom: 10,
    gap: 12,
  },
  specialtyItem: {
    width: 96,
    alignItems: 'center',
  },
  specialtyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  specialtyIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialtyIconImage: {
    width: '85%',
    height: '85%',
  },
  painIllustrationImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  specialtyLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },

  // Promo carousel & cards
  promoCarousel: {
    paddingLeft: 4,
    paddingRight: 20,
    paddingBottom: 10,
    gap: 12,
  },
  promoCard: {
    width: 250,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 124,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promoBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  promoBadgeTxt: {
    fontFamily: font.bold,
    fontSize: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  promoSaveTag: {
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  promoSaveTagText: {
    fontFamily: font.bold,
    fontSize: 8,
    letterSpacing: 0.2,
  },
  promoContent: {
    marginTop: 4,
  },
  promoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  promoTitleIcon: {
    flexShrink: 0,
  },
  promoTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    flex: 1,
  },
  promoDesc: {
    fontFamily: font.regular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  promoSessions: {
    fontFamily: font.semiBold,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
  },

  // Featured Specialists
  featuredCarousel: {
    paddingLeft: 4,
    paddingRight: 20,
    paddingBottom: 10,
    gap: 12,
  },
  featuredCard: {
    width: 275,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featuredAvatarContainer: {
    position: 'relative',
  },
  featuredAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#e6f4f3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featuredAvatarImg: {
    width: '100%',
    height: '100%',
  },
  featuredAvatarTxt: {
    fontFamily: font.bold,
    fontSize: type.base,
    color: figmaTokens.primary,
  },
  featuredVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.success,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  featuredMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  featuredPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  featuredPulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  featuredPulseTxt: {
    fontFamily: font.bold,
    fontSize: 8,
    color: colors.success,
    textTransform: 'uppercase',
  },
  featuredName: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  featuredBadgePill: {
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  featuredBadgeText: {
    fontFamily: font.bold,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  featuredMiddle: {
    flexDirection: 'column',
    gap: 5,
    marginVertical: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  featuredMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredMiddleText: {
    fontFamily: font.medium,
    fontSize: 10,
    color: colors.textSecondary,
  },
  featuredRatingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredRatingVal: {
    fontFamily: font.bold,
    fontSize: 10,
    color: colors.textPrimary,
  },
  featuredRatingCount: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.textSecondary,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredFooterLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  featuredPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  featuredPriceVal: {
    fontFamily: font.bold,
    fontSize: type.md,
    color: colors.textPrimary,
  },
  featuredPriceSub: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.textSecondary,
  },
  featuredSlotPill: {
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  featuredSlotText: {
    fontFamily: font.bold,
    fontSize: 8,
    color: '#1d4ed8',
  },
  featuredCta: {
    backgroundColor: figmaTokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  featuredCtaText: {
    fontFamily: font.bold,
    fontSize: 10,
    color: colors.white,
  },
  physioCardSkeleton: {
    width: 260,
    height: 160,
    backgroundColor: '#e2e8f0',
    borderRadius: 18,
    marginRight: 12,
  },
  noPhysioContainer: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
    ...CARD_SHADOW,
  },
  noPhysioText: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Section styling
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#e6f4f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },

  // Timeline (How it works)
  timelineContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
    padding: 20,
    marginBottom: 4,
    position: 'relative',
    ...CARD_SHADOW,
  },
  timelineLine: {
    position: 'absolute',
    left: 31,
    top: 30,
    bottom: 30,
    width: 2,
    backgroundColor: '#f1f5f9',
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e6f4f3',
    borderWidth: 2,
    borderColor: figmaTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    zIndex: 2,
  },
  timelineNodeText: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: figmaTokens.primary,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineStepTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  timelineStepDesc: {
    fontFamily: font.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  timelineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e6f4f3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  timelineBadgeText: {
    fontFamily: font.bold,
    fontSize: 8,
    color: figmaTokens.primary,
  },

  // Why Choose Us Grid
  whyGrid: {
    gap: 12,
    marginBottom: 4,
  },
  whyGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  whyGridCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  whyGridCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  whyGridCardFullBody: {
    flex: 1,
    gap: 2,
  },
  whyGridIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyGridCardTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  whyGridCardDesc: {
    fontFamily: font.regular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
  },

  // WhatsApp Concierge Banner
  whatsappBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  whatsappIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 1,
    flexShrink: 0,
  },
  whatsappBannerBody: {
    flex: 1,
  },
  whatsappHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  whatsappBannerTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: '#166534',
  },
  whatsappLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  whatsappLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22c55e',
  },
  whatsappLiveText: {
    fontFamily: font.bold,
    fontSize: 7,
    color: '#15803d',
    textTransform: 'uppercase',
  },
  whatsappBannerDesc: {
    fontFamily: font.medium,
    fontSize: 10,
    lineHeight: 14,
    color: '#166534',
    opacity: 0.85,
  },
  whatsappChevron: {
    flexShrink: 0,
  },

  // Testimonial
  testimonialScroll: {
    paddingLeft: 4,
    paddingRight: 20,
    paddingBottom: 10,
    gap: 12,
  },
  testimonialContainer: {
    width: 280,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  quoteBgIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  testimonialAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: figmaTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialAvatarTxt: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.white,
  },
  testimonialMeta: {
    flex: 1,
  },
  testimonialName: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  testimonialLoc: {
    fontFamily: font.regular,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  testimonialRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  testimonialRatingTxt: {
    fontFamily: font.bold,
    fontSize: 9,
    color: '#b45309',
  },
  testimonialText: {
    fontFamily: font.regular,
    fontSize: type.base,
    lineHeight: 18,
    color: colors.slate700,
    fontStyle: 'italic',
    height: 72,
  },
  testimonialFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  testimonialFooterTxt: {
    fontFamily: font.bold,
    fontSize: 10,
    color: colors.success,
  },

  // Trust Bar
  trustBar: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  trustTitle: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 1.0,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  trustBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trustBadgeText: {
    fontFamily: font.bold,
    fontSize: 9,
    color: colors.slate600,
  },

  // FAQ Card
  faqCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  faqRowPressed: {
    backgroundColor: '#f8fafc',
  },
  faqBody: {
    flex: 1,
  },
  faqDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  faqChevronBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  q: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  a: {
    fontFamily: font.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    marginTop: 6,
  },

  // FAQ Category Tabs
  faqCatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  faqCatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  faqCatBtnSelected: {
    backgroundColor: figmaTokens.primary + '10',
    borderColor: figmaTokens.primary + '30',
  },
  faqCatText: {
    fontFamily: font.bold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  faqCatTextSelected: {
    color: figmaTokens.primary,
  },
  faqEmpty: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqEmptyText: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.textSecondary,
  },

  // Floating sticky CTA
  bottomCta: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: figmaTokens.primary,
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomCtaIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bottomCtaBody: {
    flex: 1,
  },
  bottomCtaTxt: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.white,
  },
  bottomCtaSub: {
    fontFamily: font.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  bottomCtaChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Dynamic Onboarding & Recovery Hub Card Styles
  hubCard: {
    backgroundColor: '#0d6b6b',
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
    shadowColor: '#0d6b6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hubCardGuest: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    marginTop: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hubHeaderGuest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hubSessionsLeftGuest: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: figmaTokens.primary,
  },
  hubHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hubBadgeText: {
    fontFamily: font.bold,
    fontSize: 8,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  hubTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.white,
    marginTop: 2,
  },
  hubSessionsLeft: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hubProgressContainer: {
    marginBottom: 14,
  },
  hubProgressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  hubProgressBarFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 3,
  },
  hubProgressText: {
    fontFamily: font.medium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
  },
  hubDetailsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  hubDocAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hubDocInfo: {
    flex: 1,
  },
  hubDocName: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.white,
  },
  hubDocSub: {
    fontFamily: font.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  hubStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hubStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22c55e',
  },
  hubStatusText: {
    fontFamily: font.bold,
    fontSize: 8,
    color: '#4ade80',
    textTransform: 'uppercase',
  },
  hubActions: {
    flexDirection: 'row',
    gap: 8,
  },
  hubActionBtnSec: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  hubActionTextSec: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.textPrimary,
  },
  hubActionBtnPri: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hubActionTextPri: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.white,
  },
  checklistContainer: {
    gap: 6,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.03)',
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkCircleChecked: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  checkCircleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15,23,42,0.1)',
  },
  checkTextWrap: {
    flex: 1,
  },
  checkLabel: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  checkLabelChecked: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  checkDesc: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.textSecondary,
    lineHeight: 12,
  },
  checkActionBadge: {
    backgroundColor: figmaTokens.primary + '10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: figmaTokens.primary + '20',
  },
  checkActionBadgeText: {
    fontFamily: font.bold,
    fontSize: 8,
    color: figmaTokens.primary,
  },

  // Pain Zone Grid Styles
  painGrid: {
    paddingHorizontal: 2,
    gap: 10,
    marginBottom: 6,
  },
  painRow: {
    flexDirection: 'row',
    gap: 10,
  },
  painCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.015,
    shadowRadius: 6,
    elevation: 1,
  },
  painIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  painCardBody: {
    flex: 1,
    gap: 2,
  },
  painCardTitle: {
    fontFamily: font.bold,
    fontSize: 11,
  },
  painCardDesc: {
    fontFamily: font.regular,
    fontSize: 8,
    color: colors.textSecondary,
    lineHeight: 11,
  },

  // At-Home vs Clinic comparison Board Styles
  compareContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  compareCol: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.015,
    shadowRadius: 8,
    elevation: 1,
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compareHeaderTitle: {
    fontFamily: font.bold,
    fontSize: 11,
  },
  compareSubtitle: {
    fontFamily: font.medium,
    fontSize: 8,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  compareList: {
    gap: 6,
  },
  compareItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  compareItemIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  compareItemText: {
    fontFamily: font.regular,
    fontSize: 8.5,
    lineHeight: 12,
    color: colors.textPrimary,
    flex: 1,
  },

  // Safety Promise Shield Styles
  safetyCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 16,
    marginTop: 18,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7',
    paddingBottom: 12,
    marginBottom: 12,
  },
  safetyIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyTitleWrap: {
    flex: 1,
  },
  safetyTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: '#92400e',
  },
  safetySubtitle: {
    fontFamily: font.regular,
    fontSize: 9,
    color: '#b45309',
    marginTop: 1,
  },
  safetyGrid: {
    gap: 12,
  },
  safetyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  safetyItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  safetyItemBody: {
    flex: 1,
    gap: 2,
  },
  safetyItemTitle: {
    fontFamily: font.bold,
    fontSize: 10,
    color: '#92400e',
  },
  safetyItemDesc: {
    fontFamily: font.regular,
    fontSize: 8,
    color: '#b45309',
    lineHeight: 11,
  },

  // Pain View Toggle & Anatomical Map Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  painToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  painToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  painToggleBtnActive: {
    backgroundColor: figmaTokens.primary,
  },
  painToggleText: {
    fontFamily: font.bold,
    fontSize: 9,
    color: figmaTokens.primary,
  },
  painToggleTextActive: {
    color: '#ffffff',
  },

  // Map Container
  mapCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.015,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 6,
  },
  mapViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  mapViewSub: {
    fontFamily: font.regular,
    fontSize: 8.5,
    color: colors.textSecondary,
    flex: 1,
  },
  sideToggleBg: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 2,
  },
  sideToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sideToggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sideToggleText: {
    fontFamily: font.bold,
    fontSize: 8.5,
    color: colors.textSecondary,
  },
  sideToggleTextActive: {
    color: figmaTokens.primary,
  },

  // Map Viewport & Body outlines
  mapViewport: {
    height: 250,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
    overflow: 'hidden',
  },
  bodyGraphicContainer: {
    width: 140,
    height: 230,
    position: 'relative',
  },
  bodyHead: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 0,
    left: 57,
  },
  bodyNeck: {
    width: 6,
    height: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 26,
    left: 67,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  bodyShoulders: {
    width: 76,
    height: 12,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 36,
    left: 32,
  },
  bodyTorso: {
    width: 56,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 46,
    left: 42,
  },
  bodyArmLeft: {
    width: 10,
    height: 60,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 46,
    left: 20,
  },
  bodyArmRight: {
    width: 10,
    height: 60,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 46,
    left: 110,
  },
  bodyHips: {
    width: 52,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 116,
    left: 44,
  },
  bodyLegLeft: {
    width: 15,
    height: 86,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 130,
    left: 48,
  },
  bodyLegRight: {
    width: 15,
    height: 86,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 130,
    left: 77,
  },
  bodySpineLine: {
    width: 2,
    height: 64,
    backgroundColor: '#e2e8f0',
    position: 'absolute',
    top: 50,
    left: 69,
  },

  // Interactive Hotspots
  hotspot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: figmaTokens.primary,
    backgroundColor: 'rgba(13, 107, 107, 0.15)',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  hotspotActive: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    transform: [{ scale: 1.15 }],
  },
  hotspotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: figmaTokens.primary,
  },
  hotspotInnerActive: {
    backgroundColor: colors.warning,
  },

  // Selected Spot Panel
  spotDetailContainer: {
    marginTop: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  spotDetailPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  spotDetailPlaceholderText: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.textSecondary,
  },
  spotDetailCard: {
    flexDirection: 'column',
    backgroundColor: figmaTokens.mintSoft,
    borderColor: figmaTokens.primary + '18',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  spotDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotDetailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: figmaTokens.primary + '20',
  },
  spotDetailBody: {
    flex: 1,
    gap: 1,
  },
  spotDetailTitle: {
    fontFamily: font.bold,
    fontSize: 11,
    color: figmaTokens.primaryDark,
  },
  spotDetailDesc: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.textSecondary,
  },
  spotBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: figmaTokens.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  spotBookBtnText: {
    fontFamily: font.bold,
    fontSize: 10,
    color: '#ffffff',
  },
  hotspotInnerRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painScaleContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.08)',
  },
  painScaleLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  painScaleHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    color: figmaTokens.primaryDark,
  },
  painScaleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  painScaleBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  painScaleSegments: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  painScaleSegmentBtn: {
    flex: 1,
    height: 24,
    marginHorizontal: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  painScaleSegmentText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  painScaleSegmentTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  painScaleRangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  painScaleRangeText: {
    fontSize: 8.5,
    color: '#94a3b8',
    fontWeight: '600',
  },
  // Blueprint Tech Grid Background
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#0d6b6b',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#0d6b6b',
  },
  // Sweeping scan beam
  scanBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#2dd4bf',
    shadowColor: '#2dd4bf',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
    zIndex: 5,
  },
  // Pain scale styles
  painHeaderWithEmoji: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  painScaleSubheading: {
    fontFamily: font.regular,
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 1,
  },
  emojiBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  emojiText: {
    fontSize: 14,
  },
  emojiLabel: {
    fontFamily: font.bold,
    fontSize: 8.5,
  },
  // Clinical Guideline
  clinicalGuideCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    marginTop: 10,
  },
  clinicalGuideBody: {
    flex: 1,
  },
  clinicalGuideTitle: {
    fontFamily: font.bold,
    fontSize: 9,
    marginBottom: 1,
  },
  clinicalGuideDesc: {
    fontFamily: font.regular,
    fontSize: 8,
    color: '#475569',
    lineHeight: 11,
  },
})
