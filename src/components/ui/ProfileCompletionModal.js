import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { api } from '../../api/client'
import { colors } from '../../theme/colors'
import { r } from '../../theme/radius'
import { font, type, leading } from '../../theme/typography'
import { validateProfileLiveField } from '../../utils/profileLiveValidation'
import DropdownField from './DropdownField'
import { useKeyboardAwareScroll } from '../../hooks/useKeyboardAwareScroll'

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

/**
 * Dismissible modal: missing checklist + minimal fields to PATCH /profile.
 * @param {{ visible: boolean, onDismiss: () => void, profile: object | null, missingFields: { key: string, label: string }[], refresh: () => Promise<any> }} props
 */
export default function ProfileCompletionModal({ visible, onDismiss, profile, missingFields, refresh }) {
  const insets = useSafeAreaInsets()
  const { padBottom, scrollViewProps, keyboardAvoidingViewProps } = useKeyboardAwareScroll({
    iosHeaderOffset: 0,
    extraBottomPadding: 16,
    minBottomInset: 12,
  })
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [addressText, setAddressText] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const isGenericPhysio = profile?.role && profile.role !== 'user' && missingFields?.[0]?.key === 'profile'

  const showAllPatientFields = useMemo(() => {
    if (!profile || profile.role !== 'user' || profile.isProfileComplete) return false
    return !missingFields?.length
  }, [profile, missingFields])

  const fieldVisible = useCallback(
    (key) => {
      if (isGenericPhysio) return false
      if (showAllPatientFields) return true
      return missingFields?.some((m) => m.key === key)
    },
    [isGenericPhysio, missingFields, showAllPatientFields],
  )

  useEffect(() => {
    if (!visible || !profile) return
    setName(profile.name || '')
    setDob(profile.dob ? String(profile.dob).slice(0, 10) : '')
    setGender(profile.gender || '')
    setAddressText(String(profile.address?.text ?? profile.location ?? ''))
    setFieldErrors({})
  }, [visible, profile])

  const lat = Number.isFinite(profile?.address?.lat) ? profile.address.lat : null
  const lng = Number.isFinite(profile?.address?.lng) ? profile.address.lng : null

  async function submit() {
    if (isGenericPhysio) {
      onDismiss()
      return
    }
    const next = {
      name: validateProfileLiveField('name', name),
      dob: validateProfileLiveField('dob', dob),
      gender: validateProfileLiveField('gender', gender, { requiredGender: true }),
      address: validateProfileLiveField('location', addressText, { mode: 'booking' }),
      addressCoords: validateProfileLiveField('addressCoords', '', { addressLat: lat, addressLng: lng }),
    }
    setFieldErrors(next)
    if (Object.values(next).some(Boolean)) {
      Toast.show({ type: 'error', text1: 'Please fix the highlighted fields' })
      return
    }

    setBusy(true)
    try {
      const res = await api.patch('/profile', {
        name: name.trim(),
        dob,
        gender,
        address: {
          text: addressText.trim(),
          lat,
          lng,
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      setFieldErrors({})
      if (res.data?.isProfileComplete === true) {
        Toast.show({ type: 'success', text1: 'Profile saved' })
        await refresh()
        onDismiss()
      } else {
        Toast.show({
          type: 'error',
          text1: 'Profile still incomplete',
          text2: 'Check date of birth, gender, and address.',
        })
        await refresh()
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Could not save profile',
      })
    } finally {
      setBusy(false)
    }
  }

  if (!profile) return null

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView {...keyboardAvoidingViewProps}>
        <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Close backdrop" />
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>Finish setup</Text>
                <Text style={styles.title}>Complete your profile</Text>
              </View>
              <Pressable
                onPress={onDismiss}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.sub}>
              Add the details below so you can book sessions and use your dashboard. This reminder appears about once a
              minute until your profile is complete.
            </Text>

            {missingFields?.length ? (
              <View style={styles.checkBlock}>
                <Text style={styles.checkTitle}>Still needed</Text>
                {missingFields.map((m) => (
                  <View key={m.key} style={styles.checkRow}>
                    <Ionicons name="ellipse-outline" size={14} color={colors.brand} />
                    <Text style={styles.checkTxt}>{m.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {isGenericPhysio ? (
              <Pressable style={styles.primaryBtn} onPress={onDismiss}>
                <Text style={styles.primaryBtnTxt}>OK</Text>
              </Pressable>
            ) : (
              <ScrollView
                {...scrollViewProps}
                nestedScrollEnabled
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: padBottom }]}
              >
                {fieldVisible('name') ? (
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Full name <Text style={styles.req}>*</Text>
                    </Text>
                    <TextInput
                      value={name}
                      onChangeText={(v) => {
                        setName(v)
                        setFieldErrors((prev) => ({ ...prev, name: validateProfileLiveField('name', v) }))
                      }}
                      placeholder="As on official ID"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, fieldErrors.name ? styles.inputErr : null]}
                      autoCapitalize="words"
                    />
                    {fieldErrors.name ? <Text style={styles.err}>{fieldErrors.name}</Text> : null}
                  </View>
                ) : null}

                {fieldVisible('dob') ? (
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Date of birth <Text style={styles.req}>*</Text>
                    </Text>
                    <TextInput
                      value={dob}
                      onChangeText={(v) => {
                        setDob(v)
                        setFieldErrors((prev) => ({ ...prev, dob: validateProfileLiveField('dob', v) }))
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, fieldErrors.dob ? styles.inputErr : null]}
                      keyboardType="numbers-and-punctuation"
                    />
                    {fieldErrors.dob ? <Text style={styles.err}>{fieldErrors.dob}</Text> : null}
                  </View>
                ) : null}

                {fieldVisible('gender') ? (
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Gender <Text style={styles.req}>*</Text>
                    </Text>
                    <DropdownField
                      label={null}
                      value={gender}
                      placeholder="Select…"
                      options={GENDER_OPTIONS}
                      onSelect={(v) => {
                        setGender(v)
                        setFieldErrors((prev) => ({
                          ...prev,
                          gender: validateProfileLiveField('gender', v, { requiredGender: true }),
                        }))
                      }}
                      variant="inline"
                    />
                    {fieldErrors.gender ? <Text style={styles.err}>{fieldErrors.gender}</Text> : null}
                  </View>
                ) : null}

                {fieldVisible('address') ? (
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Address <Text style={styles.req}>*</Text>
                    </Text>
                    <TextInput
                      value={addressText}
                      onChangeText={(v) => {
                        setAddressText(v)
                        setFieldErrors((prev) => ({
                          ...prev,
                          address: validateProfileLiveField('location', v, { mode: 'booking' }),
                        }))
                      }}
                      placeholder="Area or city (at least 2 characters)"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, styles.inputMulti, fieldErrors.address ? styles.inputErr : null]}
                      multiline
                    />
                    {fieldErrors.address ? <Text style={styles.err}>{fieldErrors.address}</Text> : null}
                  </View>
                ) : null}

                <Pressable style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]} onPress={submit} disabled={busy}>
                  {busy ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnTxt}>Save</Text>
                  )}
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: r.lg,
    padding: 18,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  kicker: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 4,
    fontFamily: font.bold,
    fontSize: type['2xl'],
    lineHeight: leading['2xl'],
    color: colors.ink,
  },
  sub: {
    marginTop: 10,
    fontFamily: font.regular,
    fontSize: type.sm,
    lineHeight: leading.sm,
    color: colors.textSecondary,
  },
  checkBlock: {
    marginTop: 14,
    padding: 12,
    borderRadius: r.md,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  checkTitle: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.ink,
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkTxt: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
    borderRadius: r.sm,
  },
  scroll: { marginTop: 12, maxHeight: 360 },
  scrollContent: { paddingBottom: 8, gap: 4 },
  field: { marginTop: 10 },
  label: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.ink,
  },
  req: { color: colors.danger },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: r.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font.regular,
    fontSize: type.md,
    color: colors.ink,
    backgroundColor: colors.slate50,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  inputErr: { borderColor: colors.danger },
  err: {
    marginTop: 4,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.danger,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.brand,
    borderRadius: r.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnTxt: {
    fontFamily: font.semiBold,
    fontSize: type.lg,
    color: colors.white,
  },
})
