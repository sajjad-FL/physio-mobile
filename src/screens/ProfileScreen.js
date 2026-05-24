import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
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
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../api/client'
import { getTokenSync } from '../auth/tokenStore'
import {
  DEFAULT_REFERRAL_REWARD_AMOUNT,
  DEFAULT_REFERRAL_SIGNUP_BONUS_AMOUNT,
  useReferralMyCode,
} from '../api/queries'
import MapPickerModal from '../components/booking/MapPickerModal'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { figmaTokens, figmaShadowCard, figmaShadowGlow } from '../theme/figmaTokens'
import { assetUrl } from '../utils/assetUrl'
import { validateProfileLiveField } from '../utils/profileLiveValidation'

const GENDERS = [
  { value: 'male', label: 'Male', icon: 'male' },
  { value: 'female', label: 'Female', icon: 'female' },
  { value: 'other', label: 'Other', icon: 'help-circle' },
  { value: 'prefer_not_to_say', label: 'Private', icon: 'eye-off' },
]

const CARD_SHADOW = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 3,
}

function profileRoleFromApi(d) {
  if (d?.role === 'physio') return 'physio'
  if (d?.role === 'user' || d?.role === 'patient') return 'user'
  const arr = Array.isArray(d?.roles) ? d.roles : []
  if (arr.includes('physio')) return 'physio'
  return 'user'
}

function formatYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmd(s) {
  const t = String(s || '').trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (!m) return new Date(1990, 0, 15)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

// Custom Premium Form Input component
function PremiumInput({ icon, error, label, style, multiline, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={styles.inputWrapper}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={[
        styles.inputContainer,
        multiline && styles.textAreaContainer,
        focused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        style
      ]}>
        <Ionicons
          name={icon}
          size={18}
          color={focused ? figmaTokens.primary : colors.slate400}
          style={[styles.inputIcon, multiline && { marginTop: 12 }]}
        />
        <TextInput
          {...props}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.slate400}
          style={[styles.textInput, multiline && styles.textInputMultiline]}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

// Custom Premium Read Only display component
function PremiumReadOnlyInput({ icon, label, value, helper }) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainerReadOnly}>
        <Ionicons name={icon} size={18} color={colors.slate400} style={styles.inputIcon} />
        <Text style={styles.textInputReadOnly}>{value || '—'}</Text>
        <Ionicons name="lock-closed-outline" size={14} color={colors.slate400} style={{ marginRight: 12 }} />
      </View>
      {helper ? <Text style={styles.inputHelperText}>{helper}</Text> : null}
    </View>
  )
}

// Custom Premium Date selector component
function PremiumDateInput({ label, value, onPress, error }) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.inputContainer,
          error && styles.inputContainerError,
          pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }
        ]}
        onPress={onPress}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.slate400} style={styles.inputIcon} />
        <Text style={[styles.textInputStyle, !value && styles.textInputPlaceholder]}>
          {value || 'Select date…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.slate400} style={{ marginRight: 12 }} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [dobShow, setDobShow] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [previewLocal, setPreviewLocal] = useState(null)
  const [role, setRole] = useState('user')
  const [specialization, setSpecialization] = useState('')
  const [experience, setExperience] = useState('')
  const [fees, setFees] = useState('')
  const [addressText, setAddressText] = useState('')
  const [addressLat, setAddressLat] = useState(null)
  const [addressLng, setAddressLng] = useState(null)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [locationDraft, setLocationDraft] = useState('')
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [mapPin, setMapPin] = useState({ lat: 17.36162, lng: 78.47452 })
  const [fieldErrors, setFieldErrors] = useState({})

  const isPhysio = role === 'physio'
  const { data: referralInfo } = useReferralMyCode({ enabled: !isPhysio })
  const referralEarnAmount = referralInfo?.referralRewardAmount || DEFAULT_REFERRAL_REWARD_AMOUNT
  const friendSignupBonus =
    referralInfo?.referralSignupBonusAmount ?? DEFAULT_REFERRAL_SIGNUP_BONUS_AMOUNT

  const displayAvatarUri = previewLocal || assetUrl(avatarUrl)

  const profileStrength = useMemo(() => {
    const fields = [name, email, dob, gender, addressText]
    if (isPhysio) {
      fields.push(specialization, experience, fees)
    }
    const filled = fields.filter((x) => String(x || '').trim() !== '').length
    return Math.round((filled / fields.length) * 100)
  }, [name, email, dob, gender, addressText, specialization, experience, fees, isPhysio])

  const patchField = useCallback(
    (fieldName, value, extra = {}) => {
      setFieldErrors((prev) => {
        const ctx = { isPhysio, requiredGender: true, ...extra }
        if (fieldName === 'addressCoords') {
          ctx.addressLat = addressLat
          ctx.addressLng = addressLng
        }
        return { ...prev, [fieldName]: validateProfileLiveField(fieldName, value, ctx) }
      })
    },
    [addressLat, addressLng, isPhysio],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/profile')
      const d = res.data
      setName(d.name || '')
      setPhone(d.phone || '')
      setEmail(d.email || '')
      setDob(d.dob ? String(d.dob).slice(0, 10) : '')
      setGender(d.gender || '')
      setAvatarUrl(d.avatarUrl || '')
      setPreviewLocal(null)
      setRole(profileRoleFromApi(d))
      setSpecialization(d.physio?.specialization || '')
      setExperience(d.physio?.experience != null ? String(d.physio.experience) : '')
      setFees(d.physio?.fees != null ? String(d.physio.fees) : '')
      setAddressText(d.address?.text || '')
      setAddressLat(Number.isFinite(d.address?.lat) ? d.address.lat : null)
      setAddressLng(Number.isFinite(d.address?.lng) ? d.address.lng : null)
      setFieldErrors({})
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not load profile' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setFieldErrors((prev) => ({
      ...prev,
      addressCoords: validateProfileLiveField('addressCoords', '', { addressLat, addressLng }),
    }))
  }, [addressLat, addressLng])

  async function useDeviceLocation() {
    setLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission is required to set your address pin' })
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setAddressLat(lat)
      setAddressLng(lng)
      patchField('addressCoords', '', {})
      let label = ''
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        const g = geo[0]
        if (g) {
          const parts = [g.name, g.street, g.streetNumber, g.district, g.city, g.region, g.postalCode, g.country]
            .filter(Boolean)
            .map((x) => String(x).trim())
          label = [...new Set(parts)].join(', ')
        }
      } catch {
        /* ignore reverse geocode */
      }
      if (!label) label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      setAddressText(label)
      patchField('address', label)
      Toast.show({ type: 'success', text1: 'Location applied — adjust the text if needed' })
    } catch (e) {
      Toast.show({ type: 'error', text1: e.message || 'Could not read location' })
    } finally {
      setLocating(false)
    }
  }

  async function useLocationForModal() {
    setLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission is required to set your address pin' })
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setAddressLat(lat)
      setAddressLng(lng)
      setMapPin({ lat, lng })
      let label = ''
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        const g = geo[0]
        if (g) {
          const parts = [g.name, g.street, g.streetNumber, g.district, g.city, g.region, g.postalCode, g.country]
            .filter(Boolean)
            .map((x) => String(x).trim())
          label = [...new Set(parts)].join(', ')
        }
      } catch {
        /* ignore reverse geocode */
      }
      if (!label) label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      setLocationDraft(label)
      Toast.show({ type: 'success', text1: 'Location captured' })
    } catch (e) {
      Toast.show({ type: 'error', text1: e.message || 'Could not read location' })
    } finally {
      setLocating(false)
    }
  }

  async function applyMapPinToDraft() {
    const lat = Number(mapPin?.lat)
    const lng = Number(mapPin?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Toast.show({ type: 'error', text1: 'Pick a valid map location' })
      return
    }
    setAddressLat(lat)
    setAddressLng(lng)
    patchField('addressCoords', '', {})
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      const g = geo?.[0]
      const parts = [g?.name, g?.street, g?.streetNumber, g?.district, g?.city, g?.region, g?.postalCode, g?.country]
        .filter(Boolean)
        .map((x) => String(x).trim())
      const label = [...new Set(parts)].join(', ')
      setLocationDraft(label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } catch {
      setLocationDraft(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    }
    setMapPickerOpen(false)
  }

  function applyAddressDraft() {
    const txt = String(locationDraft || '').trim()
    if (!txt) {
      Toast.show({ type: 'error', text1: 'Please enter address' })
      return
    }
    setAddressText(txt)
    patchField('address', txt)
    patchField('addressCoords', '', {})
    setLocationModalOpen(false)
  }

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Photo library access is needed to upload an avatar' })
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    if (asset.fileSize != null && asset.fileSize > 2 * 1024 * 1024) {
      Toast.show({ type: 'error', text1: 'Image must be 2MB or smaller' })
      return
    }
    const uri = asset.uri
    // Normalize mime: iOS returns 'image/heic' for HEIF photos (edited URI is JPEG),
    // some Android returns 'image/jpg' instead of 'image/jpeg'
    let mime = asset.mimeType || 'image/jpeg'
    if (mime === 'image/heic' || mime === 'image/heif') mime = 'image/jpeg'
    if (mime === 'image/jpg') mime = 'image/jpeg'
    if (!mime.startsWith('image/')) {
      Toast.show({ type: 'error', text1: 'Please choose an image file' })
      return
    }
    setPreviewLocal(uri)
    setUploading(true)
    try {
      const fd = new FormData()
      let next = ''

      if (Platform.OS === 'web') {
        const resp = await fetch(uri)
        const blob = await resp.blob()
        fd.append('avatar', new File([blob], asset.fileName || 'avatar.jpg', { type: mime }))
        const res = await api.patch('/profile/avatar', fd)
        next = res.data?.avatarUrl || ''
      } else {
        fd.append('avatar', { uri, name: asset.fileName || 'avatar.jpg', type: mime })
        const token = getTokenSync()
        const fetchRes = await fetch(`${api.defaults.baseURL}/profile/avatar`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        const json = await fetchRes.json().catch(() => ({}))
        if (!fetchRes.ok) throw new Error(json?.message || 'Upload failed')
        next = json?.avatarUrl || ''
      }

      setAvatarUrl(next)
      setPreviewLocal(null)
      Toast.show({ type: 'success', text1: 'Photo updated' })
    } catch (err) {
      setPreviewLocal(null)
      Toast.show({ type: 'error', text1: err.message || 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    const physio = role === 'physio'
    const nextErrors = {
      name: validateProfileLiveField('name', name),
      profileEmail: validateProfileLiveField('profileEmail', email),
      dob: validateProfileLiveField('dob', dob),
      gender: validateProfileLiveField('gender', gender, { requiredGender: true }),
      address: physio
        ? validateProfileLiveField('address', addressText)
        : validateProfileLiveField('location', addressText, { mode: 'booking' }),
      addressCoords: validateProfileLiveField('addressCoords', '', { addressLat, addressLng }),
    }
    if (physio) {
      nextErrors.specialization = validateProfileLiveField('specialization', specialization, { isPhysio: true })
      nextErrors.profileExperience = validateProfileLiveField('profileExperience', experience)
      nextErrors.profileFees = validateProfileLiveField('profileFees', fees)
    }
    setFieldErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      Toast.show({ type: 'error', text1: 'Please fix the highlighted fields' })
      return
    }

    setSaving(true)
    try {
      const res = await api.patch('/profile', {
        name: name.trim(),
        email: email.trim(),
        dob,
        gender,
        address: {
          text: addressText.trim(),
          lat: addressLat,
          lng: addressLng,
        },
        ...(physio
          ? {
              specialization: specialization.trim(),
              experience: experience === '' ? 0 : Number(experience),
              fees: fees === '' ? 0 : Number(fees),
            }
          : {}),
      })
      const d = res.data
      setName(d.name || '')
      setEmail(d.email || '')
      setDob(d.dob ? String(d.dob).slice(0, 10) : '')
      setGender(d.gender || '')
      setRole(profileRoleFromApi(d))
      setAvatarUrl(d.avatarUrl ?? avatarUrl)
      setSpecialization(d.physio?.specialization || '')
      setExperience(d.physio?.experience != null ? String(d.physio.experience) : '')
      setFees(d.physio?.fees != null ? String(d.physio.fees) : '')
      setAddressText(d.address?.text || '')
      setAddressLat(Number.isFinite(d.address?.lat) ? d.address.lat : null)
      setAddressLng(Number.isFinite(d.address?.lng) ? d.address.lng : null)
      setFieldErrors({})
      Toast.show({ type: 'success', text1: 'Profile updated' })
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Could not save profile' })
    } finally {
      setSaving(false)
    }
  }

  const profileSubtitle = useMemo(
    () =>
      isPhysio
        ? 'Update your practice details, fees, and service address so patients can book with confidence.'
        : 'Keep your contact details and address current for bookings and care visits.',
    [isPhysio],
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      {/* Ambient Top Background Halo Glow */}
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

      {/* Floating Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 6 }]}>
        {navigation.canGoBack() ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.brand} />
          </Pressable>
        ) : <View style={{ width: 36 }} />}
        <Text style={styles.headerBarTitle}>My Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: Math.max(insets.bottom, 20) + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Luxe Profile Card ─────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardRow}>
            {/* Camera avatar container */}
            <Pressable
              onPress={pickAvatar}
              disabled={uploading}
              style={({ pressed }) => [
                styles.avatarContainer,
                pressed && { transform: [{ scale: 0.96 }] }
              ]}
            >
              <View style={styles.avatarRing}>
                {displayAvatarUri ? (
                  <Image source={{ uri: displayAvatarUri }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarMonogram}>{(name || phone || '?').slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                {uploading && (
                  <View style={styles.avatarBusy}>
                    <ActivityIndicator color={colors.white} size="small" />
                  </View>
                )}
              </View>
              <View style={styles.avatarCameraBadge}>
                <Ionicons name="camera" size={10} color={colors.white} />
              </View>
            </Pressable>

            {/* Profile Text and Role Details */}
            <View style={styles.profileCardDetails}>
              <View style={styles.roleRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeTxt}>{isPhysio ? 'Therapist' : 'Patient'}</Text>
                </View>
                {phone ? <Text style={styles.rolePhoneSub}>{phone}</Text> : null}
              </View>
              <Text style={styles.profileCardName} numberOfLines={1}>{name || 'PhysioKhom User'}</Text>
              
              {/* Profile Strength Progress Bar */}
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarOuter}>
                  <View style={[styles.strengthBarInner, { width: `${profileStrength}%` }]} />
                </View>
                <Text style={styles.strengthText}>{profileStrength}% Complete</Text>
              </View>
            </View>
          </View>

          {/* Quick Metrics Chips Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricChip}>
              <Ionicons name="calendar-outline" size={13} color={figmaTokens.primary} />
              <View style={styles.metricTexts}>
                <Text style={styles.metricLabel}>Joined</Text>
                <Text style={styles.metricVal}>2026</Text>
              </View>
            </View>
            <View style={styles.metricChip}>
              <Ionicons name="shield-checkmark-outline" size={13} color={figmaTokens.primary} />
              <View style={styles.metricTexts}>
                <Text style={styles.metricLabel}>Status</Text>
                <Text style={styles.metricVal}>Verified</Text>
              </View>
            </View>
            <View style={styles.metricChip}>
              <Ionicons name="ribbon-outline" size={13} color={figmaTokens.primary} />
              <View style={styles.metricTexts}>
                <Text style={styles.metricLabel}>Account</Text>
                <Text style={styles.metricVal}>Patient</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Refer & Earn Banner ───────────────────── */}
        {!isPhysio ? (
          <Pressable
            style={({ pressed }) => [
              styles.referBanner,
              pressed && { transform: [{ scale: 0.985 }] }
            ]}
            onPress={() => navigation.getParent()?.navigate('ReferEarn')}
          >
            <View style={styles.referBannerIconWrap}>
              <Ionicons name="gift-outline" size={20} color={figmaTokens.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.referBannerTitle}>Refer &amp; Earn Credits</Text>
              <Text style={styles.referBannerSub}>
                {friendSignupBonus > 0
                  ? `Friends get ₹${friendSignupBonus} on signup · you earn ₹${referralEarnAmount}`
                  : `Share your code and earn ₹${referralEarnAmount} per friend`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={figmaTokens.primary} />
          </Pressable>
        ) : null}

        {/* ── Contact Section ───────────────────────── */}
        <View style={styles.formCard}>
          <View style={styles.formSectionHeader}>
            <View style={styles.sectionHeaderIndicator} />
            <Ionicons name="person-outline" size={16} color={figmaTokens.primary} style={{ marginRight: 8 }} />
            <Text style={styles.formSectionTitle}>Account Contact</Text>
          </View>

          <PremiumInput
            label="Full Name"
            icon="person-outline"
            value={name}
            onChangeText={(v) => { setName(v); patchField('name', v) }}
            autoComplete="name"
            placeholder="Your full name"
            placeholderTextColor={colors.slate400}
            error={fieldErrors.name}
          />

          <View style={styles.fieldGap} />

          <PremiumReadOnlyInput
            label="Mobile Number"
            icon="call-outline"
            value={phone}
            helper="Linked to your secure auth login — cannot be edited."
          />

          <View style={styles.fieldGap} />

          <PremiumInput
            label="Email Address"
            icon="mail-outline"
            value={email}
            onChangeText={(v) => { setEmail(v); patchField('profileEmail', v) }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
            placeholderTextColor={colors.slate400}
            error={fieldErrors.profileEmail}
          />
        </View>

        {/* ── Address Section ───────────────────────── */}
        <View style={styles.formCard}>
          <View style={styles.formSectionHeader}>
            <View style={styles.sectionHeaderIndicator} />
            <Ionicons name="location-outline" size={16} color={figmaTokens.primary} style={{ marginRight: 8 }} />
            <Text style={styles.formSectionTitle}>Service Address</Text>
          </View>

          {addressText.trim() || addressLat != null ? (
            <View style={styles.currentAddrCard}>
              <View style={styles.addressLeftCol}>
                <View style={styles.addressMapBadge}>
                  <Ionicons name="map-sharp" size={20} color={figmaTokens.primary} />
                </View>
              </View>
              <View style={styles.addressRightCol}>
                <View style={styles.currentAddrHeader}>
                  <Text style={styles.currentAddrLabel}>Saved Coordinates</Text>
                  <View style={styles.verifiedIndicator}>
                    <Ionicons name="checkmark-circle" size={10} color={colors.success} />
                    <Text style={styles.verifiedTxt}>GPS Set</Text>
                  </View>
                </View>
                <Text style={styles.currentAddrText} numberOfLines={2}>{addressText.trim() || '—'}</Text>
                {addressLat != null && addressLng != null ? (
                  <View style={styles.coordsRow}>
                    <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
                    <Text style={styles.coordsText}>{Number(addressLat).toFixed(6)}° N, {Number(addressLng).toFixed(6)}° E</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.noAddressCard}>
              <Text style={styles.noAddressText}>No service address coordinates saved yet.</Text>
            </View>
          )}

          <View style={styles.tactileLocRow}>
            <Pressable
              style={({ pressed }) => [
                styles.tactileLocBtn,
                locating && { opacity: 0.7 },
                pressed && { transform: [{ scale: 0.97 }] }
              ]}
              onPress={useDeviceLocation}
              disabled={locating}
            >
              <Ionicons name="locate" size={14} color={figmaTokens.primary} />
              <Text style={styles.tactileLocBtnTxt}>{locating ? 'GPS Searching…' : 'Use Live GPS'}</Text>
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [
                styles.tactileLocBtn,
                pressed && { transform: [{ scale: 0.97 }] }
              ]}
              onPress={() => {
                setLocationDraft(addressText || '')
                setMapPin({
                  lat: Number.isFinite(addressLat) ? addressLat : 17.36162,
                  lng: Number.isFinite(addressLng) ? addressLng : 78.47452,
                })
                setLocationModalOpen(true)
              }}
            >
              <Ionicons name="map" size={14} color={figmaTokens.primary} />
              <Text style={styles.tactileLocBtnTxt}>Map Location</Text>
            </Pressable>
          </View>

          <PremiumInput
            label="Street Address Details"
            icon="home-outline"
            value={addressText}
            onChangeText={(v) => { setAddressText(v); patchField('address', v) }}
            placeholder="Apartment/Flat, Street details, Landmark, Area"
            placeholderTextColor={colors.slate400}
            multiline
            editable={false}
            error={fieldErrors.address || fieldErrors.addressCoords}
          />
        </View>

        {/* ── Personal Section ──────────────────────── */}
        <View style={styles.formCard}>
          <View style={styles.formSectionHeader}>
            <View style={styles.sectionHeaderIndicator} />
            <Ionicons name="sparkles-outline" size={16} color={figmaTokens.primary} style={{ marginRight: 8 }} />
            <Text style={styles.formSectionTitle}>Personal Details</Text>
          </View>

          <PremiumDateInput
            label="Date of Birth"
            value={dob}
            onPress={() => setDobShow(true)}
            error={fieldErrors.dob}
          />

          {dobShow && Platform.OS !== 'ios' ? (
            <DateTimePicker
              value={parseYmd(dob)}
              mode="date"
              display="default"
              onChange={(ev, date) => {
                setDobShow(false)
                if (ev.type === 'set' && date) {
                  const ymd = formatYmd(date)
                  setDob(ymd)
                  patchField('dob', ymd)
                }
              }}
            />
          ) : null}

          {dobShow && Platform.OS === 'ios' ? (
            <View style={styles.iosPickWrap}>
              <DateTimePicker
                value={parseYmd(dob)}
                mode="date"
                display="spinner"
                themeVariant="light"
                onChange={(_, date) => {
                  if (date) {
                    const ymd = formatYmd(date)
                    setDob(ymd)
                    patchField('dob', ymd)
                  }
                }}
              />
              <Pressable style={styles.doneBtn} onPress={() => setDobShow(false)}>
                <Text style={styles.doneBtnTxt}>Done Selection</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.fieldGap} />

          <Text style={styles.inputLabel}>Gender Profile</Text>
          <View style={styles.genderPillsRow}>
            {GENDERS.map((g) => {
              const on = gender === g.value
              return (
                <Pressable
                  key={g.value}
                  style={({ pressed }) => [
                    styles.genderPillButton,
                    on && styles.genderPillButtonActive,
                    pressed && { transform: [{ scale: 0.95 }] }
                  ]}
                  onPress={() => { setGender(g.value); patchField('gender', g.value) }}
                >
                  <Ionicons
                    name={g.icon}
                    size={14}
                    color={on ? colors.white : colors.slate500}
                  />
                  <Text style={[styles.genderPillTxt, on && styles.genderPillTxtActive]}>{g.label}</Text>
                </Pressable>
              )
            })}
          </View>
          {fieldErrors.gender ? <Text style={styles.errorText}>{fieldErrors.gender}</Text> : null}
        </View>

        {/* ── Practice Section (physio only) ────────── */}
        {isPhysio ? (
          <View style={styles.formCard}>
            <View style={styles.formSectionHeader}>
              <View style={styles.sectionHeaderIndicator} />
              <Ionicons name="medical-outline" size={16} color={figmaTokens.primary} style={{ marginRight: 8 }} />
              <Text style={styles.formSectionTitle}>Practice Credentials</Text>
            </View>

            <PremiumInput
              label="Medical Specialization"
              icon="ribbon-outline"
              value={specialization}
              onChangeText={(v) => { setSpecialization(v); patchField('specialization', v) }}
              placeholder="e.g. Orthopedic Rehab, Neurological Care"
              placeholderTextColor={colors.slate400}
              error={fieldErrors.specialization}
            />

            <View style={styles.fieldGap} />

            <View style={styles.twoCol}>
              <View style={styles.twoColItem}>
                <PremiumInput
                  label="Experience (Yrs)"
                  icon="briefcase-outline"
                  value={experience}
                  onChangeText={(v) => { setExperience(v); patchField('profileExperience', v) }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.slate400}
                  error={fieldErrors.profileExperience}
                />
              </View>
              <View style={styles.twoColItem}>
                <PremiumInput
                  label="Fees / Session"
                  icon="card-outline"
                  value={fees}
                  onChangeText={(v) => { setFees(v); patchField('profileFees', v) }}
                  keyboardType="decimal-pad"
                  placeholder="₹0"
                  placeholderTextColor={colors.slate400}
                  error={fieldErrors.profileFees}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Floating Action Save ──────────────────── */}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.saveCta,
            (saving || uploading) && styles.saveCtaDisabled,
            pressed && !saving && !uploading && styles.saveCtaPressed,
          ]}
          onPress={save}
          disabled={saving || uploading}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={18} color={colors.white} />
              <Text style={styles.saveCtaTxt}>Save Changes</Text>
            </>
          )}
        </Pressable>
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Location Modal ────────────────────────── */}
      <Modal transparent visible={locationModalOpen} animationType="fade" onRequestClose={() => setLocationModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLocationModalOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="map-outline" size={18} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Set Address Pin</Text>
                <Text style={styles.modalSub}>Locate address via GPS or manually drop a pin.</Text>
              </View>
            </View>
            
            <PremiumInput
              label="Address Text"
              icon="search-outline"
              value={locationDraft}
              onChangeText={setLocationDraft}
              placeholder="Enter location detail"
              placeholderTextColor={colors.slate400}
            />
            
            <View style={{ height: 12 }} />
            
            <View style={styles.modalOptionsRow}>
              <Pressable style={styles.modalOutlineBtn} onPress={() => setMapPickerOpen(true)}>
                <Ionicons name="pin" size={14} color={colors.brand} />
                <Text style={styles.modalOutlineBtnTxt}>Set Map Pin</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalOutlineBtn, locating && { opacity: 0.6 }]}
                onPress={useLocationForModal}
                disabled={locating}
              >
                <Ionicons name="locate-outline" size={14} color={colors.brand} />
                <Text style={styles.modalOutlineBtnTxt}>{locating ? 'Locating…' : 'Use GPS'}</Text>
              </Pressable>
            </View>
            
            <View style={{ height: 16 }} />
            
            <Pressable style={styles.modalPrimaryBtn} onPress={applyAddressDraft}>
              <Text style={styles.modalPrimaryBtnTxt}>Apply Address Coordinates</Text>
            </Pressable>
            
            <View style={{ height: 8 }} />
            
            <Pressable style={styles.modalCancelBtn} onPress={() => setLocationModalOpen(false)}>
              <Text style={styles.modalCancelBtnTxt}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <MapPickerModal
        visible={mapPickerOpen}
        pin={mapPin}
        geoBusy={locating}
        onClose={() => setMapPickerOpen(false)}
        onPick={setMapPin}
        onUseMyLocation={useLocationForModal}
        onUseLocation={applyMapPinToDraft}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: figmaTokens.canvas, position: 'relative' },
  pad: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, zIndex: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: figmaTokens.canvas },

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

  // Floating Header Navigation Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  headerBarTitle: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.textPrimary,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...figmaShadowCard,
  },

  // Profile Card Header Section
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...figmaShadowCard,
  },
  profileCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(13, 107, 107, 0.15)',
    overflow: 'hidden',
    backgroundColor: figmaTokens.mintSoft,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarMonogram: { fontFamily: font.bold, fontSize: type['2xl'], color: figmaTokens.primary },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: figmaTokens.primary,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCardDetails: {
    flex: 1,
    gap: 4,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: figmaTokens.mintSoft,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeTxt: {
    fontFamily: font.bold,
    fontSize: 9,
    color: figmaTokens.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rolePhoneSub: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textTertiary,
  },
  profileCardName: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.textPrimary,
  },

  // Strength Indicator
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  strengthBarOuter: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(13, 107, 107, 0.08)',
    overflow: 'hidden',
  },
  strengthBarInner: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.success,
  },
  strengthText: {
    fontFamily: font.semiBold,
    fontSize: 9,
    color: colors.success,
  },

  // Metrics Grid Row
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  metricChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: figmaTokens.mintSoft,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.12)',
  },
  metricTexts: {
    flexDirection: 'column',
  },
  metricLabel: {
    fontFamily: font.regular,
    fontSize: 8,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricVal: {
    fontFamily: font.bold,
    fontSize: 10,
    color: colors.textPrimary,
  },

  // Refer banner card
  referBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: figmaTokens.mintSoft,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.25)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    ...figmaShadowCard,
  },
  referBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referBannerTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  referBannerSub: {
    fontFamily: font.medium,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 13,
  },

  // Form Section cards
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    marginBottom: 14,
    ...figmaShadowCard,
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionHeaderIndicator: {
    width: 3,
    height: 14,
    backgroundColor: figmaTokens.primary,
    borderRadius: 1.5,
    marginRight: 6,
  },
  formSectionTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },

  // Fields and Labels styling
  inputWrapper: {
    width: '100%',
  },
  inputLabel: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    backgroundColor: figmaTokens.canvas,
    height: 48,
  },
  textAreaContainer: {
    height: 96,
    alignItems: 'flex-start',
  },
  inputContainerFocused: {
    borderColor: figmaTokens.primary,
    backgroundColor: colors.white,
  },
  inputContainerError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.textPrimary,
    height: '100%',
    paddingRight: 12,
  },
  textInputStyle: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.textPrimary,
    paddingRight: 12,
  },
  textInputPlaceholder: {
    color: colors.slate400,
  },
  textInputMultiline: {
    height: '100%',
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  errorText: {
    fontFamily: font.semiBold,
    fontSize: 10,
    color: colors.danger,
    marginTop: 4,
  },
  fieldGap: {
    height: 16,
  },

  // Read-only specific components
  inputContainerReadOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    backgroundColor: colors.slate100,
    height: 48,
  },
  textInputReadOnly: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.textSecondary,
  },
  inputHelperText: {
    fontFamily: font.regular,
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
    lineHeight: 13,
  },

  // Address sub-layout cards
  currentAddrCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: figmaTokens.mintSoft,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.15)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  addressLeftCol: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressMapBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    ...figmaShadowCard,
  },
  addressRightCol: {
    flex: 1,
    gap: 2,
  },
  currentAddrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentAddrLabel: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.textPrimary,
  },
  verifiedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  verifiedTxt: {
    fontFamily: font.bold,
    fontSize: 8,
    color: colors.success,
  },
  currentAddrText: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  coordsText: {
    fontFamily: font.bold,
    fontSize: 9,
    color: colors.textTertiary,
  },
  noAddressCard: {
    backgroundColor: colors.slate100,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  noAddressText: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textTertiary,
  },
  tactileLocRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  tactileLocBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.25)',
    backgroundColor: colors.white,
  },
  tactileLocBtnTxt: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: figmaTokens.primary,
  },

  // Personal DOB / Gender specifics
  iosPickWrap: {
    marginTop: 8,
    gap: 8,
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: 8,
  },
  doneBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: figmaTokens.primary,
    alignItems: 'center',
  },
  doneBtnTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },

  genderPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  genderPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  genderPillButtonActive: {
    borderColor: figmaTokens.primary,
    backgroundColor: figmaTokens.primary,
  },
  genderPillTxt: {
    fontFamily: font.bold,
    fontSize: type.xs,
    color: colors.slate700,
  },
  genderPillTxtActive: {
    color: colors.white,
  },

  // Practice specifics
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  twoColItem: {
    flex: 1,
  },

  // Bottom Save Changes CTA
  saveCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 16,
    backgroundColor: figmaTokens.primary,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 2,
  },
  saveCtaPressed: { opacity: 0.9 },
  saveCtaDisabled: { opacity: 0.45, shadowOpacity: 0 },
  saveCtaTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.white },

  // Location modal layout
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 20,
    overflow: 'hidden',
    ...figmaShadowCard,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: figmaTokens.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary },
  modalSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  modalOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalOutlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.25)',
    backgroundColor: figmaTokens.mintSoft,
  },
  modalOutlineBtnTxt: { fontFamily: font.bold, fontSize: type.xs, color: figmaTokens.primary },
  modalPrimaryBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: figmaTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  modalPrimaryBtnTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },
  modalCancelBtn: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalCancelBtnTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.textPrimary },
})
