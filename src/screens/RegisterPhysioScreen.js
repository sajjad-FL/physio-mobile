import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as Location from 'expo-location'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Image,
  Keyboard,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import AppHeader from '../components/AppHeader'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import DropdownField from '../components/ui/DropdownField'
import Input from '../components/ui/Input'
import { ID_PROOF_TYPE_OPTIONS } from '../constants/idProofTypes'
import { PHYSIO_DEGREE_OPTIONS } from '../constants/physioQualification'
import { colors } from '../theme/colors'
import { r } from '../theme/radius'
import { font, type, leading } from '../theme/typography'
import { normalizeIndianPhone, validateIndianMobile } from '../utils/phoneIndia'
import {
  validateAvatarFile,
  validateBasicSection,
  validateDocumentsStep,
  validateFileAsset,
  validatePracticeSection,
  validateQualificationSection,
  validateRegistrationAccount,
} from '../utils/onboardingValidation'
import { formatPhysioSessionFeeLabel } from '../utils/physioSessionFee'
import { appendFormDataFile, normalizePickedDocument } from '../utils/physioFormMultipart'

const STEPS = [
  { n: 1, title: 'Account & basic' },
  { n: 2, title: 'Qualification' },
  { n: 3, title: 'Practice' },
  { n: 4, title: 'Documents' },
  { n: 5, title: 'Review' },
]

const GENDER_OPTIONS = [
  { value: '', label: '—' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

/** Inline dropdown — omit empty placeholder row used by legacy modal list. */
const GENDER_DROPDOWN_OPTIONS = GENDER_OPTIONS.filter((o) => o.value !== '')

const SERVICE_TYPE_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'home', label: 'Home visit' },
  { value: 'both', label: 'Both' },
]

const DEGREE_DROPDOWN_OPTIONS = PHYSIO_DEGREE_OPTIONS.map((d) => ({ value: d, label: d }))

const DOB_MIN = new Date(1900, 0, 1)
const DOB_DEFAULT = new Date(1998, 0, 15)

function formatYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDobToDate(ymd) {
  const s = String(ymd || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, mo, d] = s.split('-').map(Number)
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

function ErrorBanner({ formError, fieldErrors }) {
  const entries = Object.entries(fieldErrors || {}).filter(([, v]) => Boolean(v))
  if (!formError && entries.length === 0) return null
  return (
    <View style={styles.errorBanner}>
      {formError ? <Text style={styles.errorBannerTitle}>{formError}</Text> : null}
      {entries.map(([k, v]) => (
        <Text key={k} style={styles.errorBannerItem}>
          • {v}
        </Text>
      ))}
    </View>
  )
}

function DocRow({ title, subtitle, asset, error, onPick }) {
  const mime = String(asset?.mimeType || '').toLowerCase()
  const isImage = mime.startsWith('image/')
  const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(String(asset?.name || ''))
  const displayName = asset?.uri
    ? asset.name && String(asset.name).trim()
      ? asset.name
      : 'Selected file'
    : 'No file chosen'

  return (
    <View style={styles.docRow}>
      <Text style={styles.docTitle}>{title}</Text>
      {subtitle ? <Text style={styles.docSub}>{subtitle}</Text> : null}
      {asset?.uri ? (
        <View style={styles.docPreviewRow}>
          {isImage ? (
            <Image source={{ uri: asset.uri }} style={styles.docThumb} accessibilityIgnoresInvertColors />
          ) : (
            <View style={styles.docIconWrap}>
              <Ionicons name={isPdf ? 'document-text-outline' : 'document-attach-outline'} size={28} color={colors.brand} />
            </View>
          )}
          <Text style={[styles.docName, styles.docNameInRow]} numberOfLines={2}>
            {displayName}
          </Text>
        </View>
      ) : (
        <Text style={styles.docName} numberOfLines={2}>
          {displayName}
        </Text>
      )}
      {error ? <Text style={styles.fieldErr}>{error}</Text> : null}
      <View style={{ height: 8 }} />
      <Button title={asset?.uri ? 'Replace file' : 'Choose file'} variant="outline" onPress={onPick} />
    </View>
  )
}

export default function RegisterPhysioScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState('')
  const [locationLat, setLocationLat] = useState(null)
  const [locationLng, setLocationLng] = useState(null)
  const [latStr, setLatStr] = useState('')
  const [lngStr, setLngStr] = useState('')

  const [avatarAsset, setAvatarAsset] = useState(null)

  const [degree, setDegree] = useState('')
  const [university, setUniversity] = useState('')
  const [year, setYear] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')

  const [experience, setExperience] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [serviceType, setServiceType] = useState('both')
  const [areas, setAreas] = useState('')
  const [feeMin, setFeeMin] = useState('')

  const [fCertificate, setFCertificate] = useState(null)
  const [fIdProof, setFIdProof] = useState(null)
  const [fRegCert, setFRegCert] = useState(null)
  const [fSelfie, setFSelfie] = useState(null)
  const [fInternship, setFInternship] = useState(null)
  const [fCouncil, setFCouncil] = useState(null)
  const [idProofType, setIdProofType] = useState('')
  const [qualificationAgreed, setQualificationAgreed] = useState(false)

  const [ndaPolicy, setNdaPolicy] = useState({
    requireQualificationDeclaration: true,
    declarationText: '',
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  const [keyboardInset, setKeyboardInset] = useState(0)
  const [dobPickerVisible, setDobPickerVisible] = useState(false)
  const [pickerTempDate, setPickerTempDate] = useState(() => DOB_DEFAULT)
  const maxDob = useMemo(() => new Date(), [])

  const clearErrors = useCallback(() => {
    setFieldErrors({})
    setFormError('')
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('/platform/physio-nda')
        if (cancelled) return
        setNdaPolicy({
          requireQualificationDeclaration: data.requireQualificationDeclaration !== false,
          declarationText: data.declarationText || '',
        })
      } catch {
        if (!cancelled) {
          setNdaPolicy({ requireQualificationDeclaration: true, declarationText: '' })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const onShow = (e) => {
      const h = e?.endCoordinates?.height
      setKeyboardInset(Number.isFinite(h) ? h : 0)
    }
    const onHide = () => setKeyboardInset(0)
    const subShow = Keyboard.addListener(showEvt, onShow)
    const subHide = Keyboard.addListener(hideEvt, onHide)
    return () => {
      subShow.remove()
      subHide.remove()
    }
  }, [])

  function syncCoordsFromStrings() {
    const la = parseFloat(String(latStr).trim())
    const ln = parseFloat(String(lngStr).trim())
    if (Number.isFinite(la) && Number.isFinite(ln)) {
      setLocationLat(la)
      setLocationLng(ln)
    }
  }

  async function pickDoc(label, setter, avatar = false) {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: avatar ? ['image/*'] : ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      })
      if (res?.canceled === true || res?.assets == null) return
      const raw = Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : null
      const legacy =
        !raw &&
        typeof res.uri === 'string' &&
        res.uri
          ? {
              uri: res.uri,
              name: res.name,
              mimeType: res.mimeType,
              size: res.size,
            }
          : null
      const wrappedRaw = raw || legacy
      const wrapped = normalizePickedDocument(wrappedRaw)
      if (!wrapped?.uri) {
        Toast.show({
          type: 'error',
          text1: 'Could not read that file',
          text2: 'Try another file or pick from device storage (not cloud-only).',
        })
        return
      }
      const v = avatar ? validateAvatarFile(wrapped) : validateFileAsset(wrapped, label)
      if (!v.ok) {
        Toast.show({ type: 'error', text1: v.message })
        return
      }
      setter(wrapped)
      if (avatar) {
        setFieldErrors((prev) => ({ ...prev, avatar: '' }))
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: e.message || 'Could not pick file' })
    }
  }

  async function useCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' })
        return
      }
      const pos = await Location.getCurrentPositionAsync({})
      const la = pos.coords.latitude
      const ln = pos.coords.longitude
      setLocationLat(la)
      setLocationLng(ln)
      setLatStr(String(la.toFixed(6)))
      setLngStr(String(ln.toFixed(6)))
      if (!location.trim()) {
        setLocation(`Coverage (${la.toFixed(5)}, ${ln.toFixed(5)})`)
      }
      Toast.show({ type: 'success', text1: 'Location captured' })
    } catch (e) {
      Toast.show({ type: 'error', text1: e.message || 'Could not read GPS' })
    }
  }

  function computeCoords() {
    const la = parseFloat(String(latStr).trim())
    const ln = parseFloat(String(lngStr).trim())
    if (Number.isFinite(la) && Number.isFinite(ln)) return { lat: la, lng: ln }
    if (locationLat != null && locationLng != null) return { lat: locationLat, lng: locationLng }
    return { lat: NaN, lng: NaN }
  }

  function computeAccountBasicErrors() {
    const { lat, lng } = computeCoords()
    const e1 = validateRegistrationAccount({ phone, password })
    const e2 = validateBasicSection({
      name,
      email,
      location,
      dob: dob || undefined,
      gender,
      address,
    })
    const merged = { ...e1.errors, ...e2.errors }
    if (avatarAsset) {
      const av = validateAvatarFile(avatarAsset)
      if (!av.ok) merged.avatar = av.message
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      merged.location =
        merged.location ||
        'Set coverage latitude & longitude (use GPS or type values from Maps) — both are required.'
    } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      merged.location = merged.location || 'Invalid coordinates'
    }
    return merged
  }

  function tryGoToStep(targetStep) {
    if (targetStep === step) return
    if (targetStep > 1 && targetStep > step) {
      const merged = computeAccountBasicErrors()
      if (Object.keys(merged).length) {
        setFieldErrors(merged)
        setFormError('Complete Account & basic before continuing')
        Toast.show({ type: 'error', text1: 'Complete Account & basic before continuing' })
        return
      }
    }
    setStep(targetStep)
    clearErrors()
  }

  async function goNext(fromStep) {
    clearErrors()
    setSaving(true)
    try {
      if (fromStep === 1) {
        syncCoordsFromStrings()
        const merged = computeAccountBasicErrors()
        if (Object.keys(merged).length) {
          setFieldErrors(merged)
          setFormError('Fix the errors below before continuing')
          Toast.show({ type: 'error', text1: 'Check step 1' })
          return
        }
      }
      if (fromStep === 2) {
        const { errors } = validateQualificationSection({ degree, university, year, registrationNumber })
        if (Object.keys(errors).length) {
          setFieldErrors(errors)
          setFormError('Fix the errors below before continuing')
          return
        }
      }
      if (fromStep === 3) {
        const { errors } = validatePracticeSection({
          experience,
          specialization,
          serviceType,
          areas,
          feeMin,
        })
        if (Object.keys(errors).length) {
          setFieldErrors(errors)
          setFormError('Fix the errors below before continuing')
          return
        }
      }
      if (fromStep === 4) {
        const { errors, ok } = validateDocumentsStep(
          { fCertificate, fIdProof, fRegCert, fSelfie, fInternship, fCouncil },
          {},
          {
            requireQualificationDeclaration: ndaPolicy.requireQualificationDeclaration,
            declarationAccepted: qualificationAgreed,
            idProofType,
          },
        )
        if (!ok) {
          setFieldErrors(errors)
          setFormError('Upload all required documents')
          Toast.show({ type: 'error', text1: 'Complete documents step' })
          return
        }
        const checks = [
          [fCertificate, 'Qualification certificate'],
          [fIdProof, 'ID proof'],
          [fRegCert, 'Registration certificate'],
          [fSelfie, 'Selfie with ID'],
        ]
        for (const [file, label] of checks) {
          const r = validateFileAsset(file, label)
          if (!r.ok) {
            setFieldErrors({ file: r.message })
            setFormError(r.message)
            return
          }
        }
        for (const [file, label] of [
          [fInternship, 'Internship certificate'],
          [fCouncil, 'Council registration certificate'],
        ]) {
          if (file) {
            const r = validateFileAsset(file, label)
            if (!r.ok) {
              setFieldErrors({ file: r.message })
              setFormError(r.message)
              return
            }
          }
        }
      }
      setStep(Math.min(5, fromStep + 1))
      clearErrors()
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (ndaPolicy.requireQualificationDeclaration && !qualificationAgreed) {
      setFormError('Confirm the qualification declaration')
      Toast.show({ type: 'error', text1: 'Confirm the qualification declaration' })
      return
    }
    syncCoordsFromStrings()
    const { lat, lng } = computeCoords()
    setSaving(true)
    clearErrors()
    try {
      const fd = new FormData()
      const pv = validateIndianMobile(phone)
      if (!pv.valid) {
        Toast.show({ type: 'error', text1: pv.message })
        return
      }
      fd.append('phone', pv.normalized)
      fd.append('password', password)
      fd.append('name', name.trim())
      fd.append('email', email.trim().toLowerCase())
      if (dob) fd.append('dob', dob)
      if (gender) fd.append('gender', gender)
      if (address.trim()) fd.append('address', address.trim())
      fd.append('location', location.trim())
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        fd.append('lat', String(lat))
        fd.append('lng', String(lng))
      }
      fd.append('degree', degree.trim())
      fd.append('university', university.trim())
      fd.append('year', String(year))
      fd.append('registrationNumber', registrationNumber.trim())
      fd.append('experience', String(experience))
      fd.append('specialization', specialization.trim())
      fd.append('serviceType', serviceType)
      fd.append('areas', areas)
      fd.append('feeMin', String(feeMin))
      appendFormDataFile(fd, 'avatar', avatarAsset)
      appendFormDataFile(fd, 'certificate', fCertificate)
      appendFormDataFile(fd, 'idProof', fIdProof)
      fd.append('idProofType', String(idProofType).trim().toLowerCase())
      appendFormDataFile(fd, 'registrationCertificate', fRegCert)
      appendFormDataFile(fd, 'selfieWithId', fSelfie)
      if (fInternship) appendFormDataFile(fd, 'internshipCertificate', fInternship)
      if (fCouncil) appendFormDataFile(fd, 'councilRegistrationCertificate', fCouncil)
      fd.append('qualificationDeclaration', qualificationAgreed ? 'true' : 'false')

      await api.post('/auth/register-physio', fd)

      Toast.show({
        type: 'success',
        text1: 'Application submitted',
        text2: 'Sign in after an admin approves your account.',
      })
      navigation.replace('Login')
    } catch (e) {
      const data = e.response?.data
      if (data?.errors && typeof data.errors === 'object') {
        setFieldErrors(data.errors)
        setFormError(data.message || 'Please fix the errors below')
        Toast.show({ type: 'error', text1: data.message || 'Registration failed' })
      } else {
        Toast.show({ type: 'error', text1: data?.message || e.message || 'Registration failed' })
      }
    } finally {
      setSaving(false)
    }
  }

  function openDobPicker() {
    setPickerTempDate(parseDobToDate(dob) || DOB_DEFAULT)
    setDobPickerVisible(true)
  }

  function applyPickedDob(date) {
    setDob(formatYmd(date))
    setFieldErrors((f) => ({ ...f, dob: '' }))
  }

  const ccoords = computeCoords()
  const coordsReviewStr =
    Number.isFinite(ccoords.lat) && Number.isFinite(ccoords.lng) ? `${ccoords.lat.toFixed(5)}, ${ccoords.lng.toFixed(5)}` : '—'

  /** Space for footer row + safe area + keyboard so fields can scroll above the keyboard (esp. Android). */
  const footerReserve = step < 5 ? 88 + insets.bottom : 0
  const keyboardPad =
    Platform.OS === 'android' ? keyboardInset : Math.min(100, Math.round(keyboardInset * 0.4))
  const scrollBottomPad = 24 + footerReserve + keyboardPad

  const kavOffset = Math.max(insets.top, 8) + 52

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={kavOffset}
      enabled={Platform.OS === 'ios'}
    >
      <AppHeader
        title="Register"
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        right={
          <Pressable
            onPress={() => navigation.navigate('Login')}
            hitSlop={10}
            style={styles.headerSignIn}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.headerLink}>Sign in</Text>
            <Ionicons name="log-in-outline" size={18} color={colors.brand} />
          </Pressable>
        }
      />
      <View style={styles.mainCol}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={[styles.scrollPad, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        style={styles.scrollFlex}
      >
        <Text style={styles.h1}>Register as a physiotherapist</Text>
        <Text style={styles.lead}>
          Same steps as on the web. After submit, an admin reviews your application before you can work on the
          platform.
        </Text>
        <View style={{ height: 16 }} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={styles.stepRow}
        >
          {STEPS.map((s) => (
            <Pressable
              key={s.n}
              onPress={() => tryGoToStep(s.n)}
              style={[styles.stepChip, step === s.n ? styles.stepChipOn : styles.stepChipOff]}
            >
              <Text style={[styles.stepChipText, step === s.n ? styles.stepChipTextOn : null]}>
                {s.n}. {s.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ height: 16 }} />
        <ErrorBanner formError={formError} fieldErrors={fieldErrors} />

        {step === 1 && (
          <Card padding="lg" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Account & basic info</Text>
            <View style={{ height: 14 }} />
            <Input
              label="Phone (for account)"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={fieldErrors.phone}
              placeholder="Enter mobile number"
            />
            <View style={{ height: 12 }} />
            <Input
              label="Password (min 8)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              placeholder="Enter password"
            />
            <View style={{ height: 12 }} />
            <Input label="Full name" value={name} onChangeText={setName} error={fieldErrors.name} placeholder="Enter full name" />
            <View style={{ height: 12 }} />
            <Input
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              placeholder="Enter email address"
            />
            <View style={{ height: 12 }} />
            {Platform.OS !== 'web' ? (
              <View>
                <Text style={styles.pickLabel}>Date of birth</Text>
                <Pressable
                  onPress={openDobPicker}
                  style={[styles.pickField, fieldErrors.dob ? styles.pickFieldErr : null]}
                  accessibilityRole="button"
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.brand} style={styles.pickFieldIcon} />
                  <Text style={[styles.pickFieldText, styles.pickFieldTextFlex, !dob ? styles.pickPlaceholder : null]}>
                    {dob || 'Select date of birth'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>
                {fieldErrors.dob ? <Text style={styles.fieldErr}>{fieldErrors.dob}</Text> : null}
              </View>
            ) : (
              <Input
                label="Date of birth (YYYY-MM-DD)"
                value={dob}
                onChangeText={setDob}
                error={fieldErrors.dob}
                placeholder="YYYY-MM-DD"
              />
            )}
            <View style={{ height: 12 }} />
            <View style={{ marginBottom: 12 }}>
              <DropdownField
                label="Gender"
                value={gender}
                placeholder="Select gender"
                options={GENDER_DROPDOWN_OPTIONS}
                onSelect={(v) => {
                  setGender(v)
                  setFieldErrors((prev) => ({ ...prev, gender: '' }))
                }}
                variant="inline"
              />
              {fieldErrors.gender ? <Text style={styles.fieldErr}>{fieldErrors.gender}</Text> : null}
            </View>
            <Text style={styles.pickLabel}>Address</Text>
            <TextInput
              style={[styles.textArea, fieldErrors.address ? styles.textAreaErr : null]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter street, locality"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
            {fieldErrors.address ? <Text style={styles.fieldErr}>{fieldErrors.address}</Text> : null}
            <View style={{ height: 12 }} />
            <Text style={styles.sectionTitle}>Coverage / location</Text>
            <Text style={styles.help}>
              Type a label patients will see and set latitude & longitude (GPS or paste from Maps). Both coordinates
              are required for bookings.
            </Text>
            <Input
              label="Coverage label (area)"
              value={location}
              onChangeText={setLocation}
              error={fieldErrors.location}
              placeholder="e.g. Central Guwahati, Beltola"
            />
            <View style={{ height: 10 }} />
            <Button title="Use current GPS location" variant="outline" onPress={useCurrentLocation} />
            <View style={{ height: 12 }} />
            <Input
              label="Latitude"
              value={latStr}
              onChangeText={(t) => {
                setLatStr(t)
                const v = parseFloat(t.trim())
                setLocationLat(Number.isFinite(v) ? v : null)
              }}
              keyboardType="decimal-pad"
              placeholder="e.g. 26.144516"
            />
            <View style={{ height: 12 }} />
            <Input
              label="Longitude"
              value={lngStr}
              onChangeText={(t) => {
                setLngStr(t)
                const v = parseFloat(t.trim())
                setLocationLng(Number.isFinite(v) ? v : null)
              }}
              keyboardType="decimal-pad"
              placeholder="e.g. 91.736226"
            />
            {locationLat != null && locationLng != null && Number.isFinite(locationLat) && Number.isFinite(locationLng) ? (
              <Text style={styles.coordHint}>
                Map point: {locationLat.toFixed(5)}, {locationLng.toFixed(5)}
              </Text>
            ) : null}

            <View style={{ height: 16 }} />
            <Text style={styles.pickLabel}>Profile photo (optional)</Text>
            {avatarAsset?.uri ? (
              <Image source={{ uri: avatarAsset.uri }} style={styles.avatar} />
            ) : null}
            <Button title={avatarAsset ? 'Change photo' : 'Choose photo'} variant="outline" onPress={() => pickDoc('Profile photo', setAvatarAsset, true)} />
            {fieldErrors.avatar ? <Text style={styles.fieldErr}>{fieldErrors.avatar}</Text> : null}
          </Card>
        )}

        {step === 2 && (
          <Card padding="lg" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Qualification</Text>
            <View style={{ height: 14 }} />
            <View style={{ marginBottom: 12 }}>
              <DropdownField
                label="Degree"
                value={degree}
                placeholder="Select degree"
                options={DEGREE_DROPDOWN_OPTIONS}
                onSelect={(v) => {
                  setDegree(v)
                  setFieldErrors((prev) => ({ ...prev, degree: '' }))
                }}
                variant="inline"
              />
              {fieldErrors.degree ? <Text style={styles.fieldErr}>{fieldErrors.degree}</Text> : null}
            </View>
            <View style={{ height: 12 }} />
            <Input
              label="University"
              value={university}
              onChangeText={setUniversity}
              error={fieldErrors.university}
              placeholder="Enter university or college"
            />
            <View style={{ height: 12 }} />
            <Input
              label="Passing year"
              keyboardType="number-pad"
              value={year}
              onChangeText={setYear}
              error={fieldErrors.year}
              placeholder="e.g. 2018"
            />
            <View style={{ height: 12 }} />
            <Input
              label="Council registration no (optional)"
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              error={fieldErrors.registrationNumber}
              placeholder="If registered, enter council number"
            />
          </Card>
        )}

        {step === 3 && (
          <Card padding="lg" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Practice details</Text>
            <View style={{ height: 14 }} />
            <Input
              label="Experience (years)"
              keyboardType="decimal-pad"
              value={experience}
              onChangeText={setExperience}
              error={fieldErrors.experience}
              placeholder="e.g. 5"
            />
            <View style={{ height: 12 }} />
            <Input
              label="Specialization"
              value={specialization}
              onChangeText={setSpecialization}
              error={fieldErrors.specialization}
              placeholder="e.g. Orthopaedic, sports injury"
            />
            <View style={{ height: 12 }} />
            <View style={{ marginBottom: 12 }}>
              <DropdownField
                label="Service type"
                value={serviceType}
                placeholder="Select service type"
                options={SERVICE_TYPE_OPTIONS}
                onSelect={(v) => {
                  setServiceType(v)
                  setFieldErrors((prev) => ({ ...prev, serviceType: '' }))
                }}
                variant="inline"
              />
              {fieldErrors.serviceType ? <Text style={styles.fieldErr}>{fieldErrors.serviceType}</Text> : null}
            </View>
            <View style={{ height: 12 }} />
            <Input
              label="Areas (comma-separated)"
              value={areas}
              onChangeText={setAreas}
              placeholder="e.g. Guwahati, Beltola"
              error={fieldErrors.areas}
            />
            <View style={{ height: 12 }} />
            <Input
              label="Fee per session (₹)"
              keyboardType="decimal-pad"
              value={feeMin}
              onChangeText={setFeeMin}
              error={fieldErrors.feeMin}
              placeholder="e.g. 800"
            />
          </Card>
        )}

        {step === 4 && (
          <Card padding="lg" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <Text style={styles.help}>PDF or image, max 2MB each.</Text>
            <View style={{ height: 12 }} />
            <DocRow
              title="Qualification certificate"
              subtitle="Degree or marksheet."
              asset={fCertificate}
              error={fieldErrors.certificate}
              onPick={() => pickDoc('Qualification certificate', setFCertificate)}
            />
            <View style={{ height: 16 }} />
            <DocRow
              title="Government ID"
              subtitle="Clear photo or PDF."
              asset={fIdProof}
              error={fieldErrors.idProof || fieldErrors.idProofType}
              onPick={() => pickDoc('ID proof', setFIdProof)}
            />
            <View style={{ marginBottom: 12 }}>
              <DropdownField
                label="ID type"
                value={idProofType}
                placeholder="Select ID type"
                options={ID_PROOF_TYPE_OPTIONS}
                onSelect={(v) => {
                  setIdProofType(v)
                  setFieldErrors((prev) => ({ ...prev, idProofType: '', idProof: '' }))
                }}
                variant="inline"
              />
              {fieldErrors.idProofType || fieldErrors.idProof ? (
                <Text style={styles.fieldErr}>{fieldErrors.idProofType || fieldErrors.idProof}</Text>
              ) : null}
            </View>
            <View style={{ height: 16 }} />
            <DocRow
              title="Professional registration"
              subtitle="State council document."
              asset={fRegCert}
              error={fieldErrors.registrationCertificate}
              onPick={() => pickDoc('Registration certificate', setFRegCert)}
            />
            <View style={{ height: 16 }} />
            <DocRow
              title="Selfie with ID"
              subtitle="Face visible next to same ID."
              asset={fSelfie}
              error={fieldErrors.selfieWithId}
              onPick={() => pickDoc('Selfie with ID', setFSelfie)}
            />
            <View style={{ height: 16 }} />
            <DocRow
              title="Internship certificate (optional)"
              asset={fInternship}
              error={fieldErrors.internshipCertificate}
              onPick={() => pickDoc('Internship certificate', setFInternship)}
            />
            <View style={{ height: 16 }} />
            <DocRow
              title="Council certificate (optional)"
              asset={fCouncil}
              error={fieldErrors.councilRegistrationCertificate}
              onPick={() => pickDoc('Council registration certificate', setFCouncil)}
            />
            <View style={{ height: 20 }} />
            <Text style={styles.sectionTitle}>Qualification declaration</Text>
            <Text style={styles.declaration}>
              {ndaPolicy.declarationText ||
                'I confirm that all qualifications and documents I submit to PhysioKhom are accurate. Misrepresentation may result in removal from the platform and legal consequences.'}
            </Text>
            <Pressable style={styles.checkRow} onPress={() => setQualificationAgreed((v) => !v)}>
              <View style={[styles.checkBox, qualificationAgreed ? styles.checkBoxOn : null]}>
                {qualificationAgreed ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
              </View>
              <Text style={styles.checkLabel}>I have read and agree to the declaration above.</Text>
            </Pressable>
            {fieldErrors.qualificationDeclaration ? (
              <Text style={styles.fieldErr}>{fieldErrors.qualificationDeclaration}</Text>
            ) : null}
            {fieldErrors.file ? <Text style={styles.fieldErr}>{fieldErrors.file}</Text> : null}
          </Card>
        )}

        {step === 5 && (
          <Card padding="lg" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Review & submit</Text>
            <View style={{ height: 12 }} />
            <ReviewLine label="Phone" value={normalizeIndianPhone(phone) || '—'} />
            <ReviewLine label="Name" value={name} />
            <ReviewLine label="Email" value={email} />
            <ReviewLine label="Specialization" value={specialization} />
            <ReviewLine label="Experience" value={experience !== '' ? `${experience} yrs` : '—'} />
            <ReviewLine
              label="Fee / session"
              value={feeMin === '' ? '—' : formatPhysioSessionFeeLabel({ pricePerSession: Number(feeMin) })}
            />
            <ReviewLine label="Coverage coords" value={coordsReviewStr} />
            <Text style={styles.help}>
              Submitting creates your account in pending status until an admin approves you.
            </Text>
            <View style={{ height: 16 }} />
            <Button title={saving ? 'Submitting…' : 'Submit application'} onPress={handleSubmit} loading={saving} />
          </Card>
        )}

      </ScrollView>

      {step < 5 ? (
          <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom + 12) }]}>
            {step > 1 ? (
              <Button
                title="Back"
                variant="outline"
                onPress={() => {
                  setStep((s) => Math.max(1, s - 1))
                  clearErrors()
                }}
              />
            ) : (
              <View style={{ width: 88 }} />
            )}
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Button
                title={saving ? '…' : step === 4 ? 'Continue to review' : 'Save & continue'}
                onPress={() => goNext(step)}
                loading={saving}
              />
            </View>
          </View>
        ) : null}
      </View>

      {Platform.OS === 'ios' && (
        <Modal transparent visible={dobPickerVisible} animationType="fade">
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={() => setDobPickerVisible(false)} />
            <View style={[styles.modalSheet, { paddingBottom: Math.max(16, insets.bottom) }]}>
              <View style={styles.modalToolbar}>
                <Pressable hitSlop={12} onPress={() => setDobPickerVisible(false)}>
                  <Text style={styles.modalBtn}>Cancel</Text>
                </Pressable>
                <Pressable
                  hitSlop={12}
                  onPress={() => {
                    applyPickedDob(pickerTempDate)
                    setDobPickerVisible(false)
                  }}
                >
                  <Text style={[styles.modalBtn, styles.modalBtnPrimary]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerTempDate}
                mode="date"
                display="spinner"
                themeVariant="light"
                onChange={(_, date) => date && setPickerTempDate(date)}
                maximumDate={maxDob}
                minimumDate={DOB_MIN}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && dobPickerVisible ? (
        <DateTimePicker
          value={pickerTempDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setDobPickerVisible(false)
            if (event?.type === 'dismissed') return
            if (date) applyPickedDob(date)
          }}
          maximumDate={maxDob}
          minimumDate={DOB_MIN}
        />
      ) : null}
    </KeyboardAvoidingView>
  )
}

function ReviewLine({ label, value }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewVal} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  scrollPad: { paddingHorizontal: 16, paddingTop: 10 },
  headerSignIn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerLink: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
  h1: { fontFamily: font.bold, fontSize: type['2xl'], color: colors.ink, letterSpacing: -0.3 },
  lead: { marginTop: 6, fontFamily: font.regular, fontSize: type.sm, color: colors.inkMuted, lineHeight: leading.sm },
  stepRow: { flexDirection: 'row', gap: 10, paddingVertical: 6, paddingRight: 8, alignItems: 'center' },
  stepChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: r.full, borderWidth: 1, minHeight: 38, flexShrink: 0, justifyContent: 'center' },
  stepChipOff: { backgroundColor: colors.white, borderColor: colors.borderSubtle },
  stepChipOn: { backgroundColor: colors.brand, borderColor: colors.brand, shadowColor: colors.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  stepChipText: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.inkMuted },
  stepChipTextOn: { color: colors.white },
  sectionCard: { marginBottom: 10 },
  sectionTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.ink },
  help: { marginTop: 6, fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary, lineHeight: leading.xs },
  pickLabel: { marginBottom: 6, fontFamily: font.semiBold, fontSize: type.sm, color: colors.inkMuted },
  pickField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: r.xl,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  pickFieldErr: { borderColor: colors.danger },
  pickFieldText: { fontFamily: font.regular, fontSize: type.sm, color: colors.ink },
  pickFieldTextFlex: { flex: 1 },
  pickFieldIcon: { marginRight: 8 },
  pickPlaceholder: { color: colors.textTertiary },
  textArea: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: r.lg,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  textAreaErr: { borderColor: colors.danger },
  coordHint: { marginTop: 6, fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 2, borderColor: colors.borderSubtle },
  docRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.canvas,
    borderRadius: r.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  docTitle: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.ink },
  docSub: { marginTop: 3, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  docPreviewRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docThumb: {
    width: 52,
    height: 52,
    borderRadius: r.md,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  docIconWrap: {
    width: 52,
    height: 52,
    borderRadius: r.md,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: { marginTop: 6, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  docNameInRow: { marginTop: 0, flex: 1, fontSize: type.sm, color: colors.ink },
  declaration: {
    marginTop: 8,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.inkMuted,
    lineHeight: leading.sm,
    padding: 12,
    backgroundColor: colors.slate50,
    borderRadius: r.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 14 },
  checkBox: {
    marginTop: 2,
    width: 24,
    height: 24,
    borderRadius: r.sm,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkBoxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkLabel: { flex: 1, fontFamily: font.regular, fontSize: type.sm, color: colors.inkMuted, lineHeight: leading.sm },
  fieldErr: { marginTop: 5, fontFamily: font.regular, fontSize: type.xs, color: colors.danger },
  errorBanner: {
    marginBottom: 14,
    padding: 14,
    borderRadius: r.xl,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
  },
  errorBannerTitle: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.danger, marginBottom: 6 },
  errorBannerItem: { fontFamily: font.regular, fontSize: type.xs, color: colors.danger, marginTop: 2 },
  mainCol: { flex: 1 },
  scrollFlex: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  reviewLabel: { fontFamily: font.regular, fontSize: type.sm, color: colors.inkMuted },
  reviewVal: { flex: 1, fontFamily: font.semiBold, fontSize: type.sm, color: colors.ink, textAlign: 'right' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: r['2xl'],
    borderTopRightRadius: r['2xl'],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  modalToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  modalBtn: { fontFamily: font.medium, fontSize: type.sm, color: colors.textSecondary },
  modalBtnPrimary: { fontFamily: font.bold, color: colors.brand },
})
