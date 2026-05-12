import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { CommonActions } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../api/client'
import { setSession, getTokenSync } from '../auth/tokenStore'
import { openWebLoginInBrowser } from '../utils/webApp'
import { getDefaultDashboardScreen } from '../auth/navigationTargets'
import { validateIndianMobile } from '../utils/phoneIndia'
import { siteOrigin } from '../utils/siteOrigin'
import { validateLoginPassword } from '../utils/validation'
import { authFormCard } from '../theme/authFormCard'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { useAuth } from '../context/AuthContext'

function digitsOnly(text, maxLen) {
  const d = String(text || '').replace(/\D/g, '')
  return maxLen != null ? d.slice(0, maxLen) : d
}

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState(true)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [phoneFocused, setPhoneFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)
  const { authEpoch } = useAuth()

  useEffect(() => {
    if (getTokenSync()) {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: getDefaultDashboardScreen() }] }),
      )
      return
    }
    setBusy(false)
  }, [navigation, authEpoch])

  async function handleSubmit() {
    setLoginError('')
    const pv = validateIndianMobile(phone)
    const pe = validateLoginPassword(password)
    setFieldErrors({
      phone: pv.valid ? '' : pv.message,
      password: pe,
    })
    if (!pv.valid || pe) return

    setLoading(true)
    try {
      const res = await api.post('/auth/login', { phone: pv.normalized, password })
      const role = res.data?.role ?? 'user'
      if (role === 'admin') {
        Toast.show({
          type: 'info',
          text1: 'Opening browser',
          text2: 'Admin tools live on the web — sign in there.',
        })
        const opened = await openWebLoginInBrowser()
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'Could not open browser',
            text2: 'Set EXPO_PUBLIC_SITE_URL in .env to your web app URL (e.g. https://yourapp.com).',
          })
        }
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }))
        return
      }
      Toast.show({ type: 'success', text1: 'Signed in' })
      await setSession(res.data.token, role, res.data.isProfileComplete === true)
    } catch (err) {
      const d = err.response?.data
      setLoginError(d?.message || err.message || 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const openLink = useCallback(async (url) => {
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) await Linking.openURL(url)
    } catch {
      // ignore
    }
  }, [])

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  const base = siteOrigin()

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.bg}>

        {/* ── Header ─────────────────────────────── */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.navigate('Home')}
              style={styles.backBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back to Home"
            >
              <Ionicons name="chevron-back" size={16} color={colors.brand} />
              <Text style={styles.backTxt}>Home</Text>
            </Pressable>
            <View style={styles.brandRow}>
              <View style={styles.logoMark}>
                <Ionicons name="pulse" size={11} color={colors.white} />
              </View>
              <Text style={styles.brandPhysio}>Physio</Text>
              <Text style={styles.brandKhom}>Khom</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 20) + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Hero ───────────────────────────────── */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="person-circle-outline" size={32} color={colors.white} />
            </View>
            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSub}>
              Sign in with your registered Indian mobile and password.
            </Text>
          </View>

          {/* ── Form card ──────────────────────────── */}
          <View style={styles.formCard}>

            {loginError ? (
              <View style={styles.alert}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                <Text style={styles.alertText}>{loginError}</Text>
              </View>
            ) : null}

            {/* Mobile field */}
            <View>
              <Text style={styles.fieldLabel}>Mobile number</Text>
              <View style={[
                styles.mobileField,
                phoneFocused && styles.fieldFocused,
                Boolean(fieldErrors.phone) && styles.fieldError,
              ]}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixTxt}>+91</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  maxLength={10}
                  value={phone}
                  onChangeText={(txt) => setPhone(digitsOnly(txt, 10))}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                />
              </View>
              {fieldErrors.phone ? <Text style={styles.fieldErrTxt}>{fieldErrors.phone}</Text> : null}
            </View>

            {/* Password field */}
            <View style={styles.fieldGap}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[
                styles.passField,
                passFocused && styles.fieldFocused,
                Boolean(fieldErrors.password) && styles.fieldError,
              ]}>
                <TextInput
                  style={[styles.textInput, styles.passInput]}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={colors.textTertiary}
                  />
                </Pressable>
              </View>
              {fieldErrors.password ? <Text style={styles.fieldErrTxt}>{fieldErrors.password}</Text> : null}
            </View>

            <View style={styles.spacer16} />

            {/* Sign in */}
            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                loading && styles.btnDisabled,
                pressed && !loading && styles.primaryBtnPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryBtnTxt}>Sign in</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.white} />
                </>
              )}
            </Pressable>

            <View style={styles.spacer10} />

            {/* Create account */}
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Register')}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
            >
              <Text style={styles.secondaryBtnTxt}>Create account</Text>
            </Pressable>

            <View style={styles.spacer14} />

            {/* Forgot password */}
            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              hitSlop={12}
              style={styles.forgotWrap}
              accessibilityRole="button"
            >
              <Text style={styles.forgotTxt}>Forgot password?</Text>
            </Pressable>

          </View>

          {/* ── Legal footer ───────────────────────── */}
          <View style={styles.legal}>
            <Text style={styles.legalTxt}>
              By signing in, you agree to our{' '}
              <Text
                style={styles.legalLink}
                onPress={() => openLink(`${base}/terms`)}
                accessibilityRole="link"
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.legalLink}
                onPress={() => openLink(`${base}/privacy`)}
                accessibilityRole="link"
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },

  // Header
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  backTxt: { fontFamily: font.medium, fontSize: type.base, color: colors.brand },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logoMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandPhysio: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  brandKhom: { fontFamily: font.bold, fontSize: type.lg, color: colors.brand, letterSpacing: -0.3 },
  headerSpacer: { minWidth: 80 },

  scroll: { paddingHorizontal: 16, paddingTop: 24 },

  // Hero section
  heroSection: { alignItems: 'center', gap: 10, marginBottom: 24 },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTitle: {
    fontFamily: font.bold,
    fontSize: type['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  heroSub: {
    fontFamily: font.regular,
    fontSize: type.base,
    lineHeight: leading.base,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Form card
  formCard: {
    ...authFormCard,
  },

  // Alert banner
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
  },
  alertText: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.danger,
    flex: 1,
    lineHeight: leading.base,
  },

  // Form fields
  fieldLabel: { marginBottom: 6, fontFamily: font.medium, fontSize: type.base, color: colors.textPrimary },
  fieldGap: { marginTop: 12 },
  mobileField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  passField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    backgroundColor: colors.canvas,
    paddingRight: 4,
  },
  fieldFocused: { borderColor: colors.borderFocus, backgroundColor: colors.white },
  fieldError: { borderColor: colors.danger },
  phonePrefix: {
    paddingLeft: 14,
    paddingRight: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.borderSubtle,
    justifyContent: 'center',
    height: 44,
  },
  phonePrefixTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  textInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.textPrimary,
  },
  passInput: { paddingRight: 0 },
  eyeBtn: { paddingHorizontal: 10, height: 44, alignItems: 'center', justifyContent: 'center' },
  fieldErrTxt: { marginTop: 5, fontFamily: font.regular, fontSize: type.sm, color: colors.danger },

  spacer10: { height: 10 },
  spacer14: { height: 14 },
  spacer16: { height: 16 },

  // Primary button
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnPressed: { backgroundColor: colors.brandHover },
  btnDisabled: { opacity: 0.6 },
  primaryBtnTxt: { fontFamily: font.bold, fontSize: type.md, color: colors.white },

  // Secondary button
  secondaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: { backgroundColor: colors.brandSoft },
  secondaryBtnTxt: { fontFamily: font.semiBold, fontSize: type.md, color: colors.brand },

  // Forgot
  forgotWrap: { alignSelf: 'center', paddingVertical: 2 },
  forgotTxt: { fontFamily: font.medium, fontSize: type.base, color: colors.brand, textAlign: 'center' },

  // Legal
  legal: { marginTop: 24, paddingHorizontal: 4 },
  legalTxt: {
    textAlign: 'center',
    fontFamily: font.regular,
    fontSize: type.xs,
    lineHeight: leading.xs,
    color: colors.textTertiary,
  },
  legalLink: { fontFamily: font.semiBold, color: colors.brand },
})
