import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import { assetUrl } from '../utils/assetUrl'
import { validateProfileLiveField } from '../utils/profileLiveValidation'

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

function profileRoleFromApi(d) {
  if (d?.role === 'user' || d?.role === 'physio' || d?.role === 'admin') return d.role
  const arr = Array.isArray(d?.roles) ? d.roles : []
  if (arr.includes('admin')) return 'admin'
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
  const { logout } = useAuth()
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
      fd.append('avatar', {
        uri,
        name: asset.fileName || 'avatar.jpg',
        type: mime,
      })
      const res = await api.patch('/profile/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
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

  const roleLabel = useMemo(() => {
    if (role === 'physio') return 'Physiotherapist profile'
    if (role === 'admin') return 'Admin profile'
    return 'Patient profile'
  }, [role])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
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

        <Text style={styles.eyebrow}>{roleLabel}</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.lead}>Your details, photo, and saved address</Text>

        <Card style={styles.mainCard}>
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
            <Button title={uploading ? 'Uploading…' : 'Upload photo'} variant="outline" onPress={pickAvatar} disabled={uploading} />
            <Text style={styles.avatarHint}>JPEG, PNG, or WebP · max ~2MB (same as web)</Text>
          </View>

          <View style={styles.formBlock}>
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
            <View style={styles.fieldGap} />

            <Text style={styles.label}>Address</Text>
            {addressText.trim() || addressLat != null ? (
              <View style={styles.currentAddr}>
                <Text style={styles.currentAddrStrong}>Current:</Text>{' '}
                <Text style={styles.currentAddrBody}>{addressText.trim() || '—'}</Text>
                {addressLat != null && addressLng != null ? (
                  <Text style={styles.coords}>
                    {Number(addressLat).toFixed(5)}, {Number(addressLng).toFixed(5)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.helper}>No address saved yet. Enter below or use your device location.</Text>
            )}
            <Pressable
              style={[styles.locBtn, locating && styles.locBtnBusy]}
              onPress={useDeviceLocation}
              disabled={locating}
            >
              <Text style={styles.locBtnTxt}>{locating ? 'Getting location…' : 'Use current location'}</Text>
            </Pressable>
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
            <View style={styles.fieldGap} />

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
                <View style={styles.fieldGap} />
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
            <Button
              title={saving ? 'Saving…' : 'Save changes'}
              onPress={save}
              loading={saving}
              disabled={saving || uploading}
              style={styles.saveBtn}
            />
          </View>
        </Card>

        <View style={{ height: 20 }} />
        <Button title="Sign out" variant="outline" onPress={() => logout(navigation)} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.slate50 },
  pad: { paddingHorizontal: 16, paddingTop: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.slate50 },
  backRow: { marginBottom: 8 },
  backTxt: { fontSize: 15, fontWeight: '600', color: colors.brand },
  eyebrow: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.slate900, letterSpacing: -0.4, textAlign: 'center' },
  lead: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 14,
    color: colors.slate600,
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
  },
  mainCard: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: colors.slate100,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarMonogram: { fontSize: 40, fontWeight: '700', color: colors.slate400 },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: { marginTop: 10, fontSize: 11, color: colors.slate500, textAlign: 'center', maxWidth: 280 },
  formBlock: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  fieldGap: { height: 16 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600', color: colors.slate800 },
  helper: { marginTop: 6, fontSize: 12, color: colors.slate500, lineHeight: 17 },
  helperTight: { marginTop: -2, marginBottom: 8, fontSize: 12, color: colors.slate500 },
  currentAddr: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  currentAddrStrong: { fontSize: 12, fontWeight: '700', color: colors.slate800 },
  currentAddrBody: { fontSize: 12, color: colors.slate600, lineHeight: 18 },
  coords: { marginTop: 6, fontSize: 11, color: colors.slate500, fontVariant: ['tabular-nums'] },
  locBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.35)',
  },
  locBtnBusy: { opacity: 0.7 },
  locBtnTxt: { fontSize: 13, fontWeight: '700', color: colors.teal800 },
  textArea: {
    marginTop: 4,
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    fontSize: 16,
    color: colors.slate900,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
  },
  textAreaErr: { borderColor: colors.red500 },
  err: { marginTop: 6, fontSize: 12, color: colors.red600 },
  dateBtn: {
    marginTop: 4,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  dateBtnTxt: { fontSize: 16, color: colors.slate900, fontVariant: ['tabular-nums'] },
  iosPickWrap: { marginTop: 8 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  genderChipOn: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  genderChipTxt: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
  genderChipTxtOn: { color: colors.teal800 },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  twoColItem: {
    flex: 1,
    minWidth: 140,
  },
  singleInput: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: colors.slate900,
    backgroundColor: colors.white,
  },
  singleInputErr: {
    borderColor: colors.red500,
  },
  saveGap: { height: 8 },
  saveBtn: { alignSelf: 'stretch' },
})
