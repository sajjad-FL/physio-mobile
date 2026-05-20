import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
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
import {
  DEFAULT_REFERRAL_REWARD_AMOUNT,
  DEFAULT_REFERRAL_SIGNUP_BONUS_AMOUNT,
  useReferralMyCode,
} from '../api/queries'
import MapPickerModal from '../components/booking/MapPickerModal'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { assetUrl } from '../utils/assetUrl'
import { useKeyboardAwareScroll } from '../hooks/useKeyboardAwareScroll'
import { validateProfileLiveField } from '../utils/profileLiveValidation'

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

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

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { padBottom, scrollViewProps, keyboardAvoidingViewProps } = useKeyboardAwareScroll({
    iosHeaderOffset: 0,
    extraBottomPadding: 28,
  })
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
    const mime = asset.mimeType || 'image/jpeg'
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) {
      Toast.show({ type: 'error', text1: 'Please choose a JPEG, PNG, or WebP image' })
      return
    }
    setPreviewLocal(uri)
    setUploading(true)
    try {
      const fd = new FormData()
      if (Platform.OS === 'web') {
        const resp = await fetch(uri)
        const blob = await resp.blob()
        const file = new File([blob], asset.fileName || 'avatar.jpg', { type: mime })
        fd.append('avatar', file)
      } else {
        fd.append('avatar', {
          uri,
          name: asset.fileName || 'avatar.jpg',
          type: mime,
        })
      }
      // Let axios set multipart boundary automatically.
      const res = await api.patch('/profile/avatar', fd)
      const next = res.data?.avatarUrl || ''
      setAvatarUrl(next)
      setPreviewLocal(null)
      Toast.show({ type: 'success', text1: 'Photo updated' })
    } catch (err) {
      setPreviewLocal(null)
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Upload failed' })
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
    <KeyboardAvoidingView {...keyboardAvoidingViewProps}>
      <ScrollView
        {...scrollViewProps}
        contentContainerStyle={[styles.pad, { paddingBottom: padBottom }]}
      >
        {/* ── Hero band ─────────────────────────────── */}
        <View style={[styles.heroBand, { paddingTop: insets.top + 14 }]}>
          {navigation.canGoBack() ? (
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={16} color={colors.white} />
            </Pressable>
          ) : <View style={styles.backBtnSpacer} />}
          <View style={styles.heroBandCenter}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillTxt}>{isPhysio ? 'Physiotherapist' : 'Patient'}</Text>
            </View>
            <Text style={styles.heroTitle}>My Profile</Text>
            <Text style={styles.heroSub}>{profileSubtitle}</Text>
          </View>

          {/* Avatar floated in the band */}
          <Pressable onPress={pickAvatar} disabled={uploading} style={styles.avatarOuter}>
            <View style={styles.avatarRing}>
              {displayAvatarUri ? (
                <Image source={{ uri: displayAvatarUri }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarMonogram}>{(name || phone || '?').slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              {uploading ? (
                <View style={styles.avatarBusy}>
                  <ActivityIndicator color={colors.white} />
                </View>
              ) : null}
            </View>
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={10} color={colors.white} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Tap photo to change · JPEG/PNG max 2MB</Text>
        </View>

        {!isPhysio ? (
          <Pressable
            style={styles.referCard}
            onPress={() => navigation.getParent()?.navigate('ReferEarn')}
          >
            <View style={styles.referCardIcon}>
              <Ionicons name="gift-outline" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.referCardTitle}>Refer &amp; Earn</Text>
              <Text style={styles.referCardSub}>
                {friendSignupBonus > 0
                  ? `Friends get ₹${friendSignupBonus} on signup · you earn ₹${referralEarnAmount}`
                  : `Share your code and earn ₹${referralEarnAmount} per friend`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
          </Pressable>
        ) : null}

        {/* ── Contact section ───────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="person-outline" size={13} color={colors.brand} />
            </View>
            <Text style={styles.sectionKicker}>Contact</Text>
          </View>

          <FieldLabel label="Full name" />
          <TextInput
            value={name}
            onChangeText={(v) => { setName(v); patchField('name', v) }}
            autoComplete="name"
            placeholder="Your full name"
            placeholderTextColor={colors.slate400}
            style={[styles.inp, fieldErrors.name && styles.inpErr]}
          />
          {fieldErrors.name ? <Text style={styles.err}>{fieldErrors.name}</Text> : null}

          <View style={styles.fieldGap} />
          <FieldLabel label="Phone" />
          <View style={styles.inpReadOnly}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.slate400} />
            <Text style={styles.inpReadOnlyTxt}>{phone || '—'}</Text>
          </View>
          <Text style={styles.helper}>Linked to your login — cannot be changed here.</Text>

          <View style={styles.fieldGap} />
          <FieldLabel label="Email" />
          <TextInput
            value={email}
            onChangeText={(v) => { setEmail(v); patchField('profileEmail', v) }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
            placeholderTextColor={colors.slate400}
            style={[styles.inp, fieldErrors.profileEmail && styles.inpErr]}
          />
          {fieldErrors.profileEmail ? <Text style={styles.err}>{fieldErrors.profileEmail}</Text> : null}
        </View>

        {/* ── Address section ───────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="location-outline" size={13} color={colors.brand} />
            </View>
            <Text style={styles.sectionKicker}>Address</Text>
          </View>

          {addressText.trim() || addressLat != null ? (
            <View style={styles.currentAddr}>
              <View style={styles.currentAddrIconRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.currentAddrLabel}>Saved address</Text>
              </View>
              <Text style={styles.currentAddrBody}>{addressText.trim() || '—'}</Text>
              {addressLat != null && addressLng != null ? (
                <Text style={styles.coords}>{Number(addressLat).toFixed(5)}, {Number(addressLng).toFixed(5)}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.helper}>No address saved yet.</Text>
          )}

          <View style={styles.locRow}>
            <Pressable
              style={[styles.locBtn, locating && styles.locBtnBusy]}
              onPress={useDeviceLocation}
              disabled={locating}
            >
              <Ionicons name="locate-outline" size={13} color={colors.brand} />
              <Text style={styles.locBtnTxt}>{locating ? 'Locating…' : 'Use GPS'}</Text>
            </Pressable>
            <Pressable
              style={[styles.locBtn, locating && styles.locBtnBusy]}
              onPress={() => {
                setLocationDraft(addressText || '')
                setMapPin({
                  lat: Number.isFinite(addressLat) ? addressLat : 17.36162,
                  lng: Number.isFinite(addressLng) ? addressLng : 78.47452,
                })
                setLocationModalOpen(true)
              }}
              disabled={locating}
            >
              <Ionicons name="map-outline" size={13} color={colors.brand} />
              <Text style={styles.locBtnTxt}>Change address</Text>
            </Pressable>
          </View>

          <FieldLabel label="Address text" />
          <TextInput
            value={addressText}
            onChangeText={(v) => { setAddressText(v); patchField('address', v) }}
            placeholder="Type your address or area"
            placeholderTextColor={colors.slate400}
            multiline
            style={[styles.textArea, fieldErrors.address && styles.inpErr]}
          />
          {fieldErrors.address ? <Text style={styles.err}>{fieldErrors.address}</Text> : null}
          {fieldErrors.addressCoords ? <Text style={styles.err}>{fieldErrors.addressCoords}</Text> : null}
        </View>

        {/* ── Personal section ──────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="calendar-outline" size={13} color={colors.brand} />
            </View>
            <Text style={styles.sectionKicker}>Personal</Text>
          </View>

          <FieldLabel label="Date of birth" />
          <Pressable style={styles.dateBtn} onPress={() => setDobShow(true)}>
            <Ionicons name="calendar-outline" size={14} color={colors.slate400} />
            <Text style={[styles.dateBtnTxt, !dob && styles.dateBtnPlaceholder]}>{dob || 'Select date…'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.slate400} />
          </Pressable>
          {fieldErrors.dob ? <Text style={styles.err}>{fieldErrors.dob}</Text> : null}
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
                <Text style={styles.doneBtnTxt}>Done</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.fieldGap} />
          <FieldLabel label="Gender" />
          <View style={styles.genderRow}>
            {GENDERS.map((g) => {
              const on = gender === g.value
              return (
                <Pressable
                  key={g.value}
                  style={[styles.genderChip, on && styles.genderChipOn]}
                  onPress={() => { setGender(g.value); patchField('gender', g.value) }}
                >
                  {on ? <Ionicons name="checkmark-circle" size={12} color={colors.brand} /> : null}
                  <Text style={[styles.genderChipTxt, on && styles.genderChipTxtOn]}>{g.label}</Text>
                </Pressable>
              )
            })}
          </View>
          {fieldErrors.gender ? <Text style={styles.err}>{fieldErrors.gender}</Text> : null}
        </View>

        {/* ── Practice section (physio only) ────────── */}
        {isPhysio ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="medical-outline" size={13} color={colors.brand} />
              </View>
              <Text style={styles.sectionKicker}>Practice</Text>
            </View>

            <FieldLabel label="Specialization" />
            <TextInput
              value={specialization}
              onChangeText={(v) => { setSpecialization(v); patchField('specialization', v) }}
              placeholder="e.g. Orthopedic, Sports rehab"
              placeholderTextColor={colors.slate400}
              style={[styles.inp, fieldErrors.specialization && styles.inpErr]}
            />
            {fieldErrors.specialization ? <Text style={styles.err}>{fieldErrors.specialization}</Text> : null}

            <View style={styles.fieldGap} />
            <View style={styles.twoCol}>
              <View style={styles.twoColItem}>
                <FieldLabel label="Experience (years)" />
                <TextInput
                  value={experience}
                  onChangeText={(v) => { setExperience(v); patchField('profileExperience', v) }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.slate400}
                  style={[styles.inp, fieldErrors.profileExperience && styles.inpErr]}
                />
                {fieldErrors.profileExperience ? <Text style={styles.err}>{fieldErrors.profileExperience}</Text> : null}
              </View>
              <View style={styles.twoColItem}>
                <FieldLabel label="Fee / session (₹)" />
                <TextInput
                  value={fees}
                  onChangeText={(v) => { setFees(v); patchField('profileFees', v) }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.slate400}
                  style={[styles.inp, fieldErrors.profileFees && styles.inpErr]}
                />
                {fieldErrors.profileFees ? <Text style={styles.err}>{fieldErrors.profileFees}</Text> : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Save CTA ──────────────────────────────── */}
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
              <Ionicons name="cloud-upload-outline" size={16} color={colors.white} />
              <Text style={styles.saveCtaTxt}>Save changes</Text>
            </>
          )}
        </Pressable>
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* ── Location modal ────────────────────────── */}
      <Modal transparent visible={locationModalOpen} animationType="fade" onRequestClose={() => setLocationModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLocationModalOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="map-outline" size={18} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Set location</Text>
                <Text style={styles.modalSub}>Search, use GPS, or drop a pin.</Text>
              </View>
            </View>
            <FieldLabel label="Address" />
            <TextInput
              value={locationDraft}
              onChangeText={setLocationDraft}
              placeholder="Enter address"
              placeholderTextColor={colors.slate400}
              style={styles.inp}
            />
            <View style={{ height: 10 }} />
            <Pressable style={styles.modalOutlineBtn} onPress={() => setMapPickerOpen(true)}>
              <Ionicons name="map-outline" size={14} color={colors.brand} />
              <Text style={styles.modalOutlineBtnTxt}>Select on map</Text>
            </Pressable>
            <View style={{ height: 8 }} />
            <Pressable
              style={[styles.modalOutlineBtn, locating && { opacity: 0.6 }]}
              onPress={useLocationForModal}
              disabled={locating}
            >
              <Ionicons name="locate-outline" size={14} color={colors.brand} />
              <Text style={styles.modalOutlineBtnTxt}>{locating ? 'Locating…' : 'Use my location'}</Text>
            </Pressable>
            <View style={{ height: 10 }} />
            <Pressable style={styles.modalPrimaryBtn} onPress={applyAddressDraft}>
              <Text style={styles.modalPrimaryBtnTxt}>Use this location</Text>
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
    </KeyboardAvoidingView>
  )
}

function FieldLabel({ label }) {
  return <Text style={styles.label}>{label}</Text>
}

const CARD_SHADOW = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 1,
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  pad: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas },

  // ── Hero band ──────────────────────────────────
  heroBand: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginHorizontal: -16,
    marginBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backBtnSpacer: { height: 32 },
  heroBandCenter: { gap: 4 },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  rolePillTxt: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 0.9,
    color: colors.white,
    textTransform: 'uppercase',
  },
  heroTitle: { fontFamily: font.bold, fontSize: 22, color: colors.white, letterSpacing: -0.3, lineHeight: 28 },
  heroSub: { fontFamily: font.regular, fontSize: type.sm, color: 'rgba(255,255,255,0.8)', lineHeight: 19 },

  // Avatar
  avatarOuter: {
    alignSelf: 'center',
    marginTop: 8,
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    backgroundColor: colors.brandSoft,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarMonogram: { fontFamily: font.bold, fontSize: 22, color: colors.brand },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brandHover,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    marginTop: 10,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },

  referCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    marginTop: -8,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...CARD_SHADOW,
  },
  referCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referCardTitle: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  referCardSub: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary, marginTop: 2 },

  // ── Section cards ──────────────────────────────
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    marginBottom: 10,
    ...CARD_SHADOW,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionKicker: {
    fontFamily: font.bold,
    fontSize: type.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },

  // ── Form fields ────────────────────────────────
  label: {
    marginBottom: 6,
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },
  fieldGap: { height: 14 },
  helper: { marginTop: 5, fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary, lineHeight: leading.xs },
  err: { marginTop: 5, fontFamily: font.semiBold, fontSize: type.xs, color: colors.danger },

  inp: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
  },
  inpErr: { borderColor: colors.danger },
  inpReadOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: colors.slate50,
  },
  inpReadOnlyTxt: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, flex: 1 },

  textArea: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 88,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
    textAlignVertical: 'top',
  },

  // Address
  currentAddr: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    gap: 4,
  },
  currentAddrIconRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  currentAddrLabel: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.success },
  currentAddrBody: { fontFamily: font.regular, fontSize: type.sm, color: colors.slate700, lineHeight: 18 },
  coords: { fontFamily: font.medium, fontSize: type.xs, color: colors.textTertiary },

  locRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brandSoft,
  },
  locBtnBusy: { opacity: 0.6 },
  locBtnTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.brand },

  // DOB
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: colors.canvas,
  },
  dateBtnTxt: { flex: 1, fontFamily: font.regular, fontSize: type.sm, color: colors.textPrimary },
  dateBtnPlaceholder: { color: colors.slate400 },
  iosPickWrap: { marginTop: 8, gap: 8 },
  doneBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
  },
  doneBtnTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },

  // Gender
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  genderChipOn: { borderColor: colors.brand, backgroundColor: colors.teal50 },
  genderChipTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.textSecondary },
  genderChipTxtOn: { color: colors.brand },

  // Practice (physio)
  twoCol: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  twoColItem: { flex: 1, minWidth: 140 },

  // Save CTA
  saveCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.brand,
    marginHorizontal: 0,
    marginBottom: 4,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  saveCtaPressed: { opacity: 0.9 },
  saveCtaDisabled: { opacity: 0.45, shadowOpacity: 0 },
  saveCtaTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.white },

  // Location modal
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
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
    borderRadius: 11,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary },
  modalSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  modalOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
  },
  modalOutlineBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
  modalPrimaryBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  modalPrimaryBtnTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },
  modalCancelBtn: {
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  modalCancelBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
})
