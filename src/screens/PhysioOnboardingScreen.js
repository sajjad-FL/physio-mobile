import DateTimePicker from '@react-native-community/datetimepicker'
import * as DocumentPicker from 'expo-document-picker'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import AppHeader from '../components/AppHeader'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { ID_PROOF_TYPE_OPTIONS } from '../constants/idProofTypes'
import { useKeyboardAwareScroll } from '../hooks/useKeyboardAwareScroll'
import { PHYSIO_DEGREE_OPTIONS } from '../constants/physioQualification'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import {
  validateAvatarFile,
  validateBasicSection,
  validateDocumentsStep,
  validateFileAsset,
  validatePracticeSection,
  validateQualificationSection,
  validateSubmitForm,
} from '../utils/onboardingValidation'
import { formatPhysioSessionFeeLabel } from '../utils/physioSessionFee'
import { appendFormDataFile, normalizePickedDocument } from '../utils/physioFormMultipart'

const STEPS = [
  { n: 1, title: 'Basic info' },
  { n: 2, title: 'Qualification' },
  { n: 3, title: 'Practice' },
  { n: 4, title: 'Documents' },
  { n: 5, title: 'Submit' },
]

const GENDER_OPTIONS = [
  { value: '', label: '—' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const SERVICE_TYPE_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'home', label: 'Home visit' },
  { value: 'both', label: 'Both' },
]

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

function OptionPickRow({ label, valueLabel, error, onPress }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.pickLabel}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={[styles.pickField, error ? styles.pickFieldErr : null]}
      >
        <Text style={[styles.pickFieldText, !valueLabel ? styles.pickPlaceholder : null]}>{valueLabel || 'Tap to choose'}</Text>
      </Pressable>
      {error ? <Text style={styles.fieldErr}>{error}</Text> : null}
    </View>
  )
}

function DocRow({ title, subtitle, asset, existingUrl, error, onPick }) {
  const onFileLabel = asset?.name || 'No file chosen'
  return (
    <View style={styles.docRow}>
      <Text style={styles.docTitle}>{title}</Text>
      {subtitle ? <Text style={styles.docSub}>{subtitle}</Text> : null}
      {existingUrl ? (
        <Text style={styles.docOnFile} numberOfLines={1}>
          On file ✓
        </Text>
      ) : null}
      <Text style={styles.docName} numberOfLines={2}>
        {onFileLabel}
      </Text>
      {error ? <Text style={styles.fieldErr}>{error}</Text> : null}
      <View style={{ height: 8 }} />
      <Button title={asset ? 'Replace file' : 'Choose file'} variant="outline" onPress={onPick} />
    </View>
  )
}

function dobInputFromApi(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export default function PhysioOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { padBottom, scrollViewProps, keyboardAvoidingViewProps } = useKeyboardAwareScroll({
    extraBottomPadding: 24,
  })
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [onboardingLocked, setOnboardingLocked] = useState(false)
  const [vStatus, setVStatus] = useState('pending')
  const [vReason, setVReason] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState('')

  const [avatarAsset, setAvatarAsset] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState('')

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
    requireSignedNda: false,
    requireQualificationDeclaration: true,
    declarationText: '',
    templateUrl: '',
    originalName: '',
  })
  const [qualificationDeclarationAcceptedAt, setQualificationDeclarationAcceptedAt] = useState(null)

  const [docUrls, setDocUrls] = useState({
    certificate: '',
    idProof: '',
    registration: '',
    selfie: '',
    internship: '',
    council: '',
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  const [pickModal, setPickModal] = useState(null)
  const [dobPickerVisible, setDobPickerVisible] = useState(false)
  const [pickerTempDate, setPickerTempDate] = useState(() => DOB_DEFAULT)
  const maxDob = useMemo(() => new Date(), [])

  const clearErrors = useCallback(() => {
    setFieldErrors({})
    setFormError('')
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/physio/onboarding')
      setName(data.name || '')
      setEmail(data.email || '')
      setDob(dobInputFromApi(data.dob))
      setGender(data.gender || '')
      setAddress(data.address || '')
      setLocation(data.location || '')
      setAvatarUrl(data.avatar || '')
      setDegree(data.qualification?.degree || '')
      setUniversity(data.qualification?.university || '')
      setYear(data.qualification?.year != null ? String(data.qualification.year) : '')
      setRegistrationNumber(data.qualification?.registrationNumber || '')
      setExperience(data.experience != null ? String(data.experience) : '')
      setSpecialization(data.specialization || '')
      setServiceType(data.serviceType || 'both')
      setAreas((data.serviceAreas || []).join(', '))
      setFeeMin(data.pricePerSession != null ? String(data.pricePerSession) : '')
      setStep(Math.min(5, Math.max(1, data.onboarding?.currentStep || 1)))
      setVStatus(data.verification?.status || 'pending')
      setVReason(data.verification?.rejectionReason || '')
      const apiLocked = data.onboardingLocked
      setOnboardingLocked(
        apiLocked === true ||
          (apiLocked == null &&
            (data.verificationStatus === 'approved' ||
              data.verification?.status === 'verified' ||
              data.verification?.level === 'verified')),
      )
      setNdaPolicy(
        data.ndaPolicy || {
          requireSignedNda: false,
          requireQualificationDeclaration: true,
          declarationText: '',
          templateUrl: '',
          originalName: '',
        },
      )
      setQualificationDeclarationAcceptedAt(data.qualificationDeclarationAcceptedAt || null)
      setQualificationAgreed(Boolean(data.qualificationDeclarationAcceptedAt))
      setDocUrls({
        certificate: data.qualification?.certificateUrl || '',
        idProof: data.documentUrls?.idProof || '',
        registration: data.documentUrls?.registrationCertificate || '',
        selfie: data.documentUrls?.selfieWithId || '',
        internship: data.documentUrls?.internshipCertificate || '',
        council: data.documentUrls?.councilRegistrationCertificate || '',
      })
      setIdProofType(String(data.documentUrls?.idProofType || '').trim().toLowerCase())
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load onboarding' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function uploadFilesPartial(formExtra) {
    const fd = new FormData()
    let n = 0
    function add(field, asset) {
      if (!asset?.uri) return
      appendFormDataFile(fd, field, asset)
      n += 1
    }
    if (formExtra.avatar) add('avatar', formExtra.avatar)
    if (formExtra.certificate) add('certificate', formExtra.certificate)
    if (formExtra.idProof) add('idProof', formExtra.idProof)
    if (formExtra.registrationCertificate) add('registrationCertificate', formExtra.registrationCertificate)
    if (formExtra.selfieWithId) add('selfieWithId', formExtra.selfieWithId)
    if (formExtra.internshipCertificate) add('internshipCertificate', formExtra.internshipCertificate)
    if (formExtra.councilRegistrationCertificate) {
      add('councilRegistrationCertificate', formExtra.councilRegistrationCertificate)
    }
    if (n === 0) return
    await api.post('/physio/onboarding/upload', fd)
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

  function computeBasicStepErrors() {
    const e2 = validateBasicSection({
      name,
      email,
      location,
      dob: dob || undefined,
      gender,
      address,
    })
    const merged = { ...e2.errors }
    if (avatarAsset) {
      const av = validateAvatarFile(avatarAsset)
      if (!av.ok) merged.avatar = av.message
    }
    return merged
  }

  function tryGoToStep(targetStep) {
    if (onboardingLocked) return
    if (targetStep === step) return
    if (targetStep > 1 && targetStep > step) {
      const merged = computeBasicStepErrors()
      if (Object.keys(merged).length) {
        setFieldErrors(merged)
        setFormError('Complete basic info before continuing')
        Toast.show({ type: 'error', text1: 'Complete basic info before continuing' })
        return
      }
    }
    setStep(targetStep)
    clearErrors()
  }

  async function goNext(fromStep) {
    if (onboardingLocked) return
    clearErrors()
    setSaving(true)
    try {
      if (fromStep === 1) {
        const merged = computeBasicStepErrors()
        if (Object.keys(merged).length) {
          setFieldErrors(merged)
          setFormError('Fix the errors below before continuing')
          Toast.show({ type: 'error', text1: 'Check step 1' })
          return
        }
        if (avatarAsset) {
          const av = validateAvatarFile(avatarAsset)
          if (!av.ok) {
            setFieldErrors({ avatar: av.message })
            setFormError(av.message)
            Toast.show({ type: 'error', text1: av.message })
            return
          }
          await uploadFilesPartial({ avatar: avatarAsset })
          setAvatarAsset(null)
          await load()
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
          {
            certificate: docUrls.certificate,
            idProof: docUrls.idProof,
            registration: docUrls.registration,
            selfie: docUrls.selfie,
          },
          {
            requireSignedNda: ndaPolicy.requireSignedNda,
            requireQualificationDeclaration: ndaPolicy.requireQualificationDeclaration,
            declarationAccepted: qualificationAgreed,
            idProofType,
          },
        )
        if (!ok) {
          setFieldErrors(errors)
          setFormError('Upload all required documents before continuing')
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
          if (file) {
            const r = validateFileAsset(file, label)
            if (!r.ok) {
              setFieldErrors({ file: r.message })
              setFormError(r.message)
              return
            }
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
        await uploadFilesPartial({
          certificate: fCertificate || undefined,
          idProof: fIdProof || undefined,
          registrationCertificate: fRegCert || undefined,
          selfieWithId: fSelfie || undefined,
          internshipCertificate: fInternship || undefined,
          councilRegistrationCertificate: fCouncil || undefined,
        })
        setFCertificate(null)
        setFIdProof(null)
        setFRegCert(null)
        setFSelfie(null)
        setFInternship(null)
        setFCouncil(null)
        await load()
      }

      const next = Math.min(5, fromStep + 1)
      const patch = { step: next }
      if (fromStep === 4) {
        patch.idProofType = String(idProofType).trim().toLowerCase()
        if (qualificationAgreed) patch.qualificationDeclarationAccepted = true
      }
      if (fromStep === 1) {
        patch.basic = {
          name,
          email,
          dob: dob || undefined,
          gender,
          address,
          location,
        }
      }
      if (fromStep === 2) {
        patch.qualification = {
          degree,
          university,
          year: year || undefined,
          registrationNumber,
        }
      }
      if (fromStep === 3) {
        patch.practice = {
          experience,
          specialization,
          serviceType,
          areas,
          feeMin,
        }
      }
      if (fromStep < 5) {
        await api.patch('/physio/onboarding', patch)
        setStep(next)
        clearErrors()
        Toast.show({ type: 'success', text1: 'Progress saved' })
        await load()
      }
    } catch (e) {
      const data = e.response?.data
      const msg = data?.message || 'Could not save'
      setFormError(msg)
      if (data?.errors && typeof data.errors === 'object') {
        setFieldErrors(data.errors)
      }
      Toast.show({ type: 'error', text1: msg })
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (onboardingLocked) return
    clearErrors()
    setSaving(true)
    try {
      const submitValues = {
        name,
        email,
        location,
        dob,
        gender,
        address,
        degree,
        university,
        year,
        registrationNumber,
        experience,
        specialization,
        serviceType,
        areas,
        feeMin,
        docCertificate: docUrls.certificate,
        docIdProof: docUrls.idProof,
        docRegistration: docUrls.registration,
        docSelfie: docUrls.selfie,
        idProofType,
        docSignedNda: '',
        requireSignedNda: Boolean(ndaPolicy.requireSignedNda),
        requireQualificationDeclaration: ndaPolicy.requireQualificationDeclaration !== false,
        qualificationDeclarationAccepted: qualificationAgreed,
        qualificationDeclarationAcceptedAt,
      }
      const { errors, ok } = validateSubmitForm(submitValues)
      if (!ok) {
        setFieldErrors(errors)
        setFormError('Complete every section and upload all documents before submitting')
        Toast.show({ type: 'error', text1: 'Complete every section before submitting' })
        return
      }

      await api.post('/physio/onboarding/submit')
      clearErrors()
      Toast.show({ type: 'success', text1: 'Application submitted for review' })
      await load()
      setStep(5)
    } catch (e) {
      const data = e.response?.data
      const msg = data?.message || 'Could not submit'
      setFormError(msg)
      if (data?.errors && typeof data.errors === 'object') {
        setFieldErrors(data.errors)
      }
      Toast.show({ type: 'error', text1: msg })
    } finally {
      setSaving(false)
    }
  }

  function genderLabel() {
    const g = GENDER_OPTIONS.find((o) => o.value === gender)
    return g?.label ?? ''
  }
  function degreeLabel() {
    return degree || ''
  }

  function pickOptions() {
    if (pickModal === 'genderAll') return GENDER_OPTIONS
    if (pickModal === 'degree')
      return [{ value: '', label: '—' }, ...PHYSIO_DEGREE_OPTIONS.map((d) => ({ value: d, label: d }))]
    if (pickModal === 'service') return SERVICE_TYPE_OPTIONS
    if (pickModal === 'idProof') return ID_PROOF_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
    return []
  }

  function openDobPicker() {
    setPickerTempDate(parseDobToDate(dob) || DOB_DEFAULT)
    setDobPickerVisible(true)
  }

  function applyPickedDob(date) {
    setDob(formatYmd(date))
    setFieldErrors((f) => ({ ...f, dob: '' }))
  }

  function resolveMediaUrl(ref) {
    const s = String(ref || '').trim()
    if (!s) return null
    if (/^https?:\/\//i.test(s)) return s
    const base = api.defaults.baseURL.replace(/\/api\/?$/i, '')
    return `${base}${s.startsWith('/') ? '' : '/'}${s}`
  }

  if (loading) {
    return (
      <View style={[styles.flex, styles.centerSplash]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={[styles.lead, { marginTop: 12 }]}>Loading onboarding…</Text>
      </View>
    )
  }

  if (onboardingLocked) {
    const rootNav = navigation.getParent()?.getParent() || navigation.getParent()
    return (
      <ScrollView style={styles.flex} contentContainerStyle={[styles.scrollPad, { paddingBottom: 48 }]}>
        <AppHeader title="Onboarding" onBack={() => navigation.goBack()} />
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionTitle}>Profile verified</Text>
          <Text style={[styles.help, { marginTop: 10 }]}>
            Your account is verified — onboarding is closed. Update photo and profile details from Profile.
          </Text>
          <Text style={[styles.help, { marginTop: 8 }]}>
            Verification: <Text style={{ fontWeight: '700' }}>{vStatus}</Text>
            {vReason ? ` — ${vReason}` : ''}
          </Text>
          <View style={{ height: 16 }} />
          <Button
            title="Go to bookings"
            onPress={() => (rootNav ? rootNav.navigate('PhysioTabs') : navigation.navigate('PhysioTabs'))}
          />
        </Card>
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionTitle}>On file</Text>
          <ReviewLine label="Name" value={name || '—'} />
          <ReviewLine label="Specialization" value={specialization || '—'} />
          <ReviewLine label="Experience" value={experience !== '' ? `${experience} yrs` : '—'} />
          <ReviewLine
            label="Fee / session"
            value={feeMin === '' ? '—' : formatPhysioSessionFeeLabel({ pricePerSession: Number(feeMin) })}
          />
        </Card>
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView {...keyboardAvoidingViewProps}>
      <AppHeader title="Onboarding" onBack={() => navigation.goBack()} />
      <View style={styles.mainCol}>
      <ScrollView
        {...scrollViewProps}
        contentContainerStyle={[styles.scrollPad, { paddingBottom: padBottom }]}
        style={styles.scrollFlex}
      >
        <Text style={styles.h1}>Physiotherapist onboarding</Text>
        <Text style={styles.lead}>
          Complete all steps. Verification: <Text style={{ fontWeight: '700' }}>{vStatus}</Text>
          {vReason ? ` — ${vReason}` : ''}
        </Text>
        <View style={{ height: 16 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepRow}>
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
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Basic info</Text>
            <View style={{ height: 14 }} />
            <Input label="Full name" value={name} onChangeText={setName} error={fieldErrors.name} />
            <View style={{ height: 12 }} />
            <Input
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
            />
            <View style={{ height: 12 }} />
            {Platform.OS !== 'web' ? (
              <View>
                <Text style={styles.pickLabel}>Date of birth</Text>
                <Pressable
                  onPress={openDobPicker}
                  style={[styles.pickField, fieldErrors.dob ? styles.pickFieldErr : null]}
                >
                  <Text style={[styles.pickFieldText, !dob ? styles.pickPlaceholder : null]}>
                    {dob || 'Tap to choose'}
                  </Text>
                </Pressable>
                {fieldErrors.dob ? <Text style={styles.fieldErr}>{fieldErrors.dob}</Text> : null}
              </View>
            ) : (
              <Input label="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} error={fieldErrors.dob} />
            )}
            <View style={{ height: 12 }} />
            <OptionPickRow
              label="Gender"
              valueLabel={gender ? genderLabel() : ''}
              error={fieldErrors.gender}
              onPress={() => setPickModal('genderAll')}
            />
            <View style={{ height: 4 }} />
            <Text style={styles.pickLabel}>Address</Text>
            <TextInput
              style={[styles.textArea, fieldErrors.address ? styles.textAreaErr : null]}
              value={address}
              onChangeText={setAddress}
              placeholder="Street, locality"
              placeholderTextColor={colors.slate500}
              multiline
            />
            {fieldErrors.address ? <Text style={styles.fieldErr}>{fieldErrors.address}</Text> : null}
            <View style={{ height: 12 }} />
            <Text style={styles.pickLabel}>Coverage / location</Text>
            <Text style={styles.help}>Label patients see when booking (matches web onboarding).</Text>
            <Input label="Coverage label (area)" value={location} onChangeText={setLocation} error={fieldErrors.location} />

            <View style={{ height: 16 }} />
            <Text style={styles.pickLabel}>Profile photo (optional)</Text>
            {(avatarAsset?.uri || resolveMediaUrl(avatarUrl)) ? (
              <Image
                source={{ uri: avatarAsset?.uri || resolveMediaUrl(avatarUrl) }}
                style={styles.avatar}
              />
            ) : null}
            <Button title={avatarAsset ? 'Change photo' : 'Choose photo'} variant="outline" onPress={() => pickDoc('Profile photo', setAvatarAsset, true)} />
            {fieldErrors.avatar ? <Text style={styles.fieldErr}>{fieldErrors.avatar}</Text> : null}
          </Card>
        )}

        {step === 2 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Qualification</Text>
            <View style={{ height: 14 }} />
            <OptionPickRow label="Degree" valueLabel={degreeLabel()} error={fieldErrors.degree} onPress={() => setPickModal('degree')} />
            <View style={{ height: 12 }} />
            <Input label="University" value={university} onChangeText={setUniversity} error={fieldErrors.university} />
            <View style={{ height: 12 }} />
            <Input label="Passing year" keyboardType="number-pad" value={year} onChangeText={setYear} error={fieldErrors.year} />
            <View style={{ height: 12 }} />
            <Input
              label="Council registration no (optional)"
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              error={fieldErrors.registrationNumber}
            />
          </Card>
        )}

        {step === 3 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Practice details</Text>
            <View style={{ height: 14 }} />
            <Input label="Experience (years)" keyboardType="decimal-pad" value={experience} onChangeText={setExperience} error={fieldErrors.experience} />
            <View style={{ height: 12 }} />
            <Input label="Specialization" value={specialization} onChangeText={setSpecialization} error={fieldErrors.specialization} />
            <View style={{ height: 12 }} />
            <OptionPickRow
              label="Service type"
              valueLabel={SERVICE_TYPE_OPTIONS.find((o) => o.value === serviceType)?.label || ''}
              error={fieldErrors.serviceType}
              onPress={() => setPickModal('service')}
            />
            <View style={{ height: 12 }} />
            <Input
              label="Areas (comma-separated)"
              value={areas}
              onChangeText={setAreas}
              placeholder="e.g. Guwahati, Beltola"
              error={fieldErrors.areas}
            />
            <View style={{ height: 12 }} />
            <Input label="Fee per session (₹)" keyboardType="decimal-pad" value={feeMin} onChangeText={setFeeMin} error={fieldErrors.feeMin} />
          </Card>
        )}

        {step === 4 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <Text style={styles.help}>PDF or image, max 2MB each.</Text>
            <View style={{ height: 12 }} />
            <DocRow
              title="Qualification certificate"
              subtitle="Degree or marksheet."
              asset={fCertificate}
              existingUrl={docUrls.certificate}
              error={fieldErrors.certificate}
              onPick={() => pickDoc('Qualification certificate', setFCertificate)}
            />
            <View style={{ height: 16 }} />
            <DocRow
              title="Government ID"
              subtitle="Clear photo or PDF."
              asset={fIdProof}
              existingUrl={docUrls.idProof}
              error={fieldErrors.idProof || fieldErrors.idProofType}
              onPick={() => pickDoc('ID proof', setFIdProof)}
            />
            <OptionPickRow
              label="ID type"
              valueLabel={ID_PROOF_TYPE_OPTIONS.find((o) => o.value === idProofType)?.label || ''}
              error={fieldErrors.idProofType}
              onPress={() => setPickModal('idProof')}
            />
            <View style={{ height: 16 }} />
            <DocRow
              title="Professional registration"
              subtitle="State council document."
              asset={fRegCert}
              existingUrl={docUrls.registration}
              error={fieldErrors.registrationCertificate}
              onPick={() => pickDoc('Registration certificate', setFRegCert)}
            />
            <View style={{ height: 16 }} />
            <DocRow
              title="Selfie with ID"
              subtitle="Face visible next to same ID."
              asset={fSelfie}
              existingUrl={docUrls.selfie}
              error={fieldErrors.selfieWithId}
              onPick={() => pickDoc('Selfie with ID', setFSelfie)}
            />
            <View style={{ height: 16 }} />
            <DocRow
              title="Internship certificate (optional)"
              asset={fInternship}
              existingUrl={docUrls.internship}
              error={fieldErrors.internshipCertificate}
              onPick={() => pickDoc('Internship certificate', setFInternship)}
            />
            <View style={{ height: 16 }} />
            <DocRow
              title="Council certificate (optional)"
              asset={fCouncil}
              existingUrl={docUrls.council}
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
                {qualificationAgreed ? <Text style={styles.checkMark}>✓</Text> : null}
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
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Submit for review</Text>
            <View style={{ height: 12 }} />
            <ReviewLine label="Name" value={name} />
            <ReviewLine label="Email" value={email} />
            <ReviewLine label="Location" value={location} />
            <ReviewLine label="Specialization" value={specialization} />
            <ReviewLine label="Experience" value={experience !== '' ? `${experience} yrs` : '—'} />
            <ReviewLine
              label="Fee / session"
              value={feeMin === '' ? '—' : formatPhysioSessionFeeLabel({ pricePerSession: Number(feeMin) })}
            />
            <Text style={styles.help}>
              Submit sends your application to admin review (same as the web physio onboarding).
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

      <Modal transparent visible={Boolean(pickModal)} animationType="slide">
        <View style={styles.modalRootPick}>
          <Pressable style={styles.modalBackdropFill} onPress={() => setPickModal(null)} />
          <View style={[styles.modalSheetPick, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
            <Text style={styles.modalTitle}>Select</Text>
            <FlatList
              data={pickModal ? pickOptions() : []}
              keyExtractor={(item, index) => `${item.value}-${index}`}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickItem}
                  onPress={() => {
                    if (pickModal === 'genderAll') setGender(item.value)
                    if (pickModal === 'degree') setDegree(item.value)
                    if (pickModal === 'service') setServiceType(item.value)
                    if (pickModal === 'idProof') {
                      setIdProofType(item.value)
                      setFieldErrors((prev) => ({ ...prev, idProofType: '' }))
                    }
                    setPickModal(null)
                  }}
                >
                  <Text style={styles.pickItemText}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

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
  centerSplash: { justifyContent: 'center', alignItems: 'center' },
  scrollPad: { paddingHorizontal: 16, paddingTop: 10 },
  headerLink: { fontFamily: font.bold, fontSize: type.sm, color: colors.brand },
  h1: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary, letterSpacing: -0.3 },
  lead: { marginTop: 6, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: leading.sm },
  stepRow: { flexDirection: 'row', gap: 8 },
  stepChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  stepChipOff: { backgroundColor: colors.white, borderColor: colors.borderSubtle },
  stepChipOn: { backgroundColor: colors.brand, borderColor: colors.brand, shadowColor: colors.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  stepChipText: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.textSecondary },
  stepChipTextOn: { color: colors.white },
  sectionCard: { marginBottom: 10 },
  sectionTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  help: { marginTop: 6, fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary, lineHeight: leading.xs },
  pickLabel: { marginBottom: 6, fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary },
  pickField: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
    minHeight: 42,
    justifyContent: 'center',
  },
  pickFieldErr: { borderColor: colors.danger },
  pickFieldText: { fontFamily: font.regular, fontSize: type.sm, color: colors.textPrimary },
  pickPlaceholder: { color: colors.slate300 },
  textArea: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  textAreaErr: { borderColor: colors.danger },
  coordHint: { marginTop: 6, fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 2, borderColor: colors.borderSubtle },
  docRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  docTitle: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  docSub: { marginTop: 3, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  docOnFile: { marginTop: 4, fontFamily: font.semiBold, fontSize: type.xs, color: colors.success },
  docName: { marginTop: 6, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  declaration: {
    marginTop: 8,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
    lineHeight: leading.sm,
    padding: 12,
    backgroundColor: colors.slate50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 14 },
  checkBox: {
    marginTop: 2,
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkBoxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkMark: { color: colors.white, fontSize: 14, fontFamily: font.bold },
  checkLabel: { flex: 1, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: leading.sm },
  fieldErr: { marginTop: 5, fontFamily: font.regular, fontSize: type.xs, color: colors.danger },
  errorBanner: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
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
  reviewLabel: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  reviewVal: { flex: 1, fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary, textAlign: 'right' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalRootPick: { flex: 1, justifyContent: 'flex-end' },
  modalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  modalSheetPick: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '55%',
    paddingTop: 16,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary, marginBottom: 8, paddingHorizontal: 12 },
  pickItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  pickItemText: { fontFamily: font.regular, fontSize: type.base, color: colors.textPrimary },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
