import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import MapPickerModal from '../components/booking/MapPickerModal'
import { colors } from '../theme/colors'
import { figmaTokens as F, figmaShadowSm } from '../theme/figmaTokens'
import { font, type } from '../theme/typography'
import { assetUrl } from '../utils/assetUrl'
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
        <ActivityIndicator size="large" color={F.primary} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.pad,
          { paddingBottom: 28 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {navigation.canGoBack() ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backRow}>
            <Text style={styles.backTxt}>← Back</Text>
          </Pressable>
        ) : null}

        <View style={styles.heroBlock}>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillTxt}>{isPhysio ? 'Physiotherapist' : 'Patient'}</Text>
          </View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.lead}>{profileSubtitle}</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.avatarSection}>
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
            <Button title={uploading ? 'Uploading…' : 'Upload photo'} variant="outline" size="sm" onPress={pickAvatar} disabled={uploading} />
            <Text style={styles.avatarHint}>JPEG, PNG, or WebP · max ~2MB</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionKicker, styles.sectionKickerFirst]}>Contact</Text>
            <Input
              label="Name"
              value={name}
              onChangeText={(v) => {
                setName(v)
                patchField('name', v)
              }}
              autoComplete="name"
              error={fieldErrors.name}
            />
            <View style={styles.fieldGap} />
            <Input label="Phone" value={phone} editable={false} />
            <Text style={styles.helper}>Phone is tied to your login and cannot be changed here.</Text>
            <View style={styles.fieldGap} />
            <Input
              label="Email"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => {
                setEmail(v)
                patchField('profileEmail', v)
              }}
              autoCapitalize="none"
              autoCorrect={false}
              error={fieldErrors.profileEmail}
            />
            <View style={styles.sectionRule} />
            <Text style={styles.sectionKicker}>Address</Text>
            {addressText.trim() || addressLat != null ? (
              <View style={styles.currentAddr}>
                <Text style={styles.currentAddrStrong}>
                  Current: <Text style={styles.currentAddrBody}>{addressText.trim() || '—'}</Text>
                </Text>
                {addressLat != null && addressLng != null ? (
                  <Text style={styles.coords}>
                    {Number(addressLat).toFixed(5)}, {Number(addressLng).toFixed(5)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.helper}>No address saved yet. Enter below or use your device location.</Text>
            )}
            <View style={styles.locRow}>
              <Pressable
                style={[styles.locBtn, locating && styles.locBtnBusy]}
                onPress={useDeviceLocation}
                disabled={locating}
              >
                <Text style={styles.locBtnTxt}>{locating ? 'Getting location…' : 'Use current location'}</Text>
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
                <Text style={styles.locBtnTxt}>Change location</Text>
              </Pressable>
            </View>
            <TextInput
              value={addressText}
              onChangeText={(v) => {
                setAddressText(v)
                patchField('address', v)
              }}
              placeholder="Type your address or area (required for patients)"
              placeholderTextColor={colors.slate500}
              multiline
              style={[styles.textArea, fieldErrors.address ? styles.textAreaErr : null]}
            />
            {fieldErrors.address ? <Text style={styles.err}>{fieldErrors.address}</Text> : null}
            {fieldErrors.addressCoords ? <Text style={styles.err}>{fieldErrors.addressCoords}</Text> : null}
            <View style={styles.sectionRule} />
            <Text style={styles.sectionKicker}>Personal</Text>
            <Text style={styles.label}>Date of birth</Text>
            <Pressable style={styles.dateBtn} onPress={() => setDobShow(true)}>
              <Text style={[styles.dateBtnTxt, !dob && { color: colors.slate500 }]}>{dob || 'Select date…'}</Text>
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
                <Button title="Done" onPress={() => setDobShow(false)} />
              </View>
            ) : null}

            <View style={styles.fieldGap} />
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => {
                const on = gender === g.value
                return (
                  <Pressable
                    key={g.value}
                    style={[styles.genderChip, on && styles.genderChipOn]}
                    onPress={() => {
                      setGender(g.value)
                      patchField('gender', g.value)
                    }}
                  >
                    <Text style={[styles.genderChipTxt, on && styles.genderChipTxtOn]}>{g.label}</Text>
                  </Pressable>
                )
              })}
            </View>
            {fieldErrors.gender ? <Text style={styles.err}>{fieldErrors.gender}</Text> : null}

            {isPhysio ? (
              <>
                <View style={styles.sectionRule} />
                <Text style={styles.sectionKicker}>Practice</Text>
                <Input
                  label="Specialization"
                  value={specialization}
                  onChangeText={(v) => {
                    setSpecialization(v)
                    patchField('specialization', v)
                  }}
                  placeholder="e.g. Orthopedic, Sports rehab"
                  error={fieldErrors.specialization}
                />
                <View style={styles.fieldGap} />
                <View style={styles.twoCol}>
                  <View style={styles.twoColItem}>
                    <Input
                      label="Experience (years)"
                      keyboardType="number-pad"
                      value={experience}
                      onChangeText={(v) => {
                        setExperience(v)
                        patchField('profileExperience', v)
                      }}
                      error={fieldErrors.profileExperience}
                    />
                  </View>
                  <View style={styles.twoColItem}>
                    <Text style={[styles.label, { marginBottom: 8 }]}>Fee per session (INR)</Text>
                    <Text style={styles.helperTight}>One fixed amount per session.</Text>
                    <TextInput
                      value={fees}
                      onChangeText={(v) => {
                        setFees(v)
                        patchField('profileFees', v)
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.slate500}
                      style={[styles.singleInput, fieldErrors.profileFees ? styles.singleInputErr : null]}
                    />
                    {fieldErrors.profileFees ? <Text style={styles.err}>{fieldErrors.profileFees}</Text> : null}
                  </View>
                </View>
              </>
            ) : null}

            <View style={styles.saveGap} />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.saveCta, (saving || uploading) && styles.saveCtaDisabled, pressed && !saving && !uploading && styles.saveCtaPressed]}
              onPress={save}
              disabled={saving || uploading}
            >
              {saving ? (
                <ActivityIndicator color={F.surface} size="small" />
              ) : (
                <Text style={styles.saveCtaTxt}>Save changes</Text>
              )}
            </Pressable>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      <Modal transparent visible={locationModalOpen} animationType="fade" onRequestClose={() => setLocationModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLocationModalOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Set location</Text>
            <Text style={styles.helper}>Search, use GPS, or drop a pin. This updates your saved profile address.</Text>
            <Text style={[styles.label, { marginTop: 10 }]}>Search</Text>
            <TextInput
              value={locationDraft}
              onChangeText={setLocationDraft}
              placeholder="Enter address"
              placeholderTextColor={colors.slate500}
              style={styles.singleInput}
            />
            <View style={{ height: 8 }} />
            <Button title="Select on map" variant="outline" onPress={() => setMapPickerOpen(true)} />
            <View style={{ height: 8 }} />
            <Button
              title={locating ? 'Locating…' : 'Use my location'}
              variant="outline"
              onPress={useLocationForModal}
              disabled={locating}
            />
            <View style={{ height: 8 }} />
            <Button title="Use this location" onPress={applyAddressDraft} />
            <View style={{ height: 8 }} />
            <Button title="Cancel" variant="outline" onPress={() => setLocationModalOpen(false)} />
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: F.canvas },
  pad: { paddingHorizontal: F.padScreen, paddingTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: F.canvas },
  backRow: { marginBottom: 10 },
  backTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: F.primaryDark },
  heroBlock: { marginBottom: 12 },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: F.badgeMint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: F.radiusPill,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(162, 240, 239, 0.65)',
  },
  rolePillTxt: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: F.primaryDark,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: font.bold,
    fontSize: 20,
    color: F.ink,
    letterSpacing: -0.35,
    lineHeight: 26,
  },
  lead: {
    marginTop: 6,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: F.body,
    lineHeight: 19,
    maxWidth: 400,
  },
  sectionCard: {
    backgroundColor: F.surface,
    borderRadius: F.radiusCardLg,
    borderWidth: 1,
    borderColor: F.borderSoft,
    padding: F.padCard,
    marginBottom: 10,
    ...figmaShadowSm,
  },
  sectionKicker: {
    marginTop: 4,
    marginBottom: 10,
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: F.muted,
  },
  sectionKickerFirst: { marginTop: 0 },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: F.line,
    marginVertical: 14,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: F.outlineVariant,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#e2e8f0',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarMonogram: { fontFamily: font.bold, fontSize: 20, color: F.inkSecondary },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: { marginTop: 8, fontSize: type.xs, color: F.muted, textAlign: 'center', maxWidth: 280 },
  fieldGap: { height: 12 },
  label: { marginBottom: 6, fontFamily: font.semiBold, fontSize: type.sm, color: F.ink },
  helper: { marginTop: 4, fontFamily: font.regular, fontSize: type.xs, color: F.muted, lineHeight: 17 },
  helperTight: { marginTop: -2, marginBottom: 6, fontFamily: font.regular, fontSize: type.xs, color: F.muted },
  locRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  currentAddr: {
    marginBottom: 10,
    paddingHorizontal: F.padCard,
    paddingVertical: 10,
    borderRadius: F.radiusCard,
    backgroundColor: F.mintSoft,
    borderWidth: 1,
    borderColor: F.borderSoft,
  },
  currentAddrStrong: { fontFamily: font.bold, fontSize: type.sm, color: F.ink },
  currentAddrBody: { fontFamily: font.regular, fontSize: type.sm, color: F.body, lineHeight: 18 },
  coords: { marginTop: 4, fontFamily: font.medium, fontSize: type.xs, color: F.muted, fontVariant: ['tabular-nums'] },
  locBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: F.radiusButton,
    backgroundColor: F.surface,
    borderWidth: 1,
    borderColor: F.outlineVariant,
  },
  locBtnBusy: { opacity: 0.7 },
  locBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: F.primaryDark },
  textArea: {
    marginTop: 4,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: F.radiusCard,
    borderWidth: 1,
    borderColor: F.outlineVariant,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: F.ink,
    backgroundColor: F.surface,
    textAlignVertical: 'top',
  },
  textAreaErr: { borderColor: colors.red500 },
  err: { marginTop: 6, fontSize: type.xs, color: colors.red600 },
  dateBtn: {
    marginTop: 4,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: F.radiusCard,
    borderWidth: 1,
    borderColor: F.outlineVariant,
    backgroundColor: F.surface,
  },
  dateBtnTxt: { fontFamily: font.regular, fontSize: type.sm, color: F.ink, fontVariant: ['tabular-nums'] },
  iosPickWrap: { marginTop: 8 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  genderChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: F.radiusPill,
    borderWidth: 1,
    borderColor: F.outlineVariant,
    backgroundColor: F.surface,
  },
  genderChipOn: {
    borderColor: F.primary,
    backgroundColor: F.mintSoft,
  },
  genderChipTxt: { fontFamily: font.semiBold, fontSize: 11, color: F.body },
  genderChipTxtOn: { color: F.primaryDark },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  twoColItem: {
    flex: 1,
    minWidth: 140,
  },
  singleInput: {
    borderWidth: 1,
    borderColor: F.outlineVariant,
    borderRadius: F.radiusCard,
    paddingHorizontal: 12,
    height: 42,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: F.ink,
    backgroundColor: F.surface,
  },
  singleInputErr: {
    borderColor: colors.red500,
  },
  saveGap: { height: 14 },
  saveCta: {
    minHeight: 40,
    borderRadius: F.radiusButton,
    backgroundColor: F.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: F.padCard,
  },
  saveCtaPressed: { opacity: 0.92 },
  saveCtaDisabled: { opacity: 0.45 },
  saveCtaTxt: { fontFamily: font.bold, fontSize: type.sm, color: F.surface, letterSpacing: 0.15 },
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: F.padScreen },
  modalCard: {
    borderRadius: F.radiusHero,
    backgroundColor: F.surface,
    borderWidth: 1,
    borderColor: F.borderSoft,
    padding: F.padCard,
    ...figmaShadowSm,
  },
  cardTitle: { fontFamily: font.bold, fontSize: type.md, color: F.ink },
})
