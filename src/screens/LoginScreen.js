import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Keyboard,
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
import { useKeyboardAwareScroll } from '../hooks/useKeyboardAwareScroll'
import RequiredMark from '../components/ui/RequiredMark'

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
  const phoneRef = useRef(null)
  const passwordRef = useRef(null)
  const passwordBlockRef = useRef(null)
  const { authEpoch } = useAuth()
  const { padBottom, scrollViewProps, keyboardAvoidingViewProps, scrollIntoView } = useKeyboardAwareScroll({
    scrollToEndOnShow: false,
    extraBottomPadding: 40,
  })

  const revealPasswordField = useCallback(() => {
    scrollIntoView(passwordBlockRef, { offset: 96 })
  }, [scrollIntoView])

  useEffect(() => {
    if (!passFocused) return undefined
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const sub = Keyboard.addListener(showEvent, revealPasswordField)
    return () => sub.remove()
  }, [passFocused, revealPasswordField])

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
    <KeyboardAvoidingView {...keyboardAvoidingViewProps}>
      <View style={styles.bg}>
        {/* Ambient Top Background Halo Glow */}
        <View style={styles.ambientHeaderGlow} pointerEvents="none" />
        <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

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
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoMark}
                resizeMode="contain"
              />
              <Text numberOfLines={1}>
                <Text style={styles.brandPhysio}>PhysiO</Text>
                <Text style={styles.brandKhom}>khom</Text>
              </Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <ScrollView
          {...scrollViewProps}
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: padBottom }]}
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
            <View style={styles.fieldBlock}>
              <Pressable onPress={() => phoneRef.current?.focus()} accessibilityRole="none">
                <Text style={styles.fieldLabel}>Mobile number<RequiredMark /></Text>
              </Pressable>
              <View style={[
                styles.mobileField,
                phoneFocused && styles.fieldFocused,
                Boolean(fieldErrors.phone) && styles.fieldError,
              ]}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixTxt}>+91</Text>
                </View>
                <TextInput
                  ref={phoneRef}
                  nativeID="login-phone"
                  style={styles.textInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  textContentType="username"
                  autoComplete="username"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  autoCorrect={false}
                  maxLength={10}
                  value={phone}
                  onChangeText={(txt) => setPhone(digitsOnly(txt, 10))}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  onSubmitEditing={() => {
                    passwordRef.current?.focus()
                    revealPasswordField()
                  }}
                />
              </View>
              {fieldErrors.phone ? <Text style={styles.fieldErrTxt}>{fieldErrors.phone}</Text> : null}
            </View>

            {/* Password field */}
            <View ref={passwordBlockRef} style={[styles.fieldBlock, styles.fieldGap]}>
              <Pressable
                onPress={() => {
                  passwordRef.current?.focus()
                  revealPasswordField()
                }}
                accessibilityRole="none"
              >
                <Text style={styles.fieldLabel}>Password<RequiredMark /></Text>
              </Pressable>
              <View style={[
                styles.passField,
                passFocused && styles.fieldFocused,
                Boolean(fieldErrors.password) && styles.fieldError,
              ]}>
                <TextInput
                  ref={passwordRef}
                  nativeID="login-password"
                  style={[styles.textInput, styles.passInput]}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => {
                    setPassFocused(true)
                    revealPasswordField()
                  }}
                  onBlur={() => setPassFocused(false)}
                  onSubmitEditing={handleSubmit}
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
  bg: { flex: 1, backgroundColor: colors.canvas, position: 'relative' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },

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

  // Header
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    zIndex: 10,
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
    width: 34,
    height: 34,
  },
  brandPhysio: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  brandKhom: { fontFamily: font.bold, fontSize: type.lg, color: colors.brand, letterSpacing: -0.3 },
  headerSpacer: { minWidth: 80 },

  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 24, flexGrow: 1 },

  // Hero section
  heroSection: { alignItems: 'center', gap: 10, marginBottom: 24, zIndex: 2 },
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
    zIndex: 2,
    marginBottom: 20,
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
  fieldBlock: { zIndex: 0 },
  fieldLabel: { marginBottom: 6, fontFamily: font.medium, fontSize: type.base, color: colors.textPrimary },
  fieldGap: { marginTop: 16, zIndex: 1 },
  mobileField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.08)',
    borderRadius: 12,
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
    overflow: 'hidden',
  },
  passField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.08)',
    borderRadius: 12,
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
    paddingRight: 4,
    overflow: 'hidden',
  },
  fieldFocused: { 
    borderColor: colors.brand, 
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  fieldError: { borderColor: colors.danger },
  phonePrefix: {
    paddingLeft: 14,
    paddingRight: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.borderSubtle,
    justifyContent: 'center',
    height: 46,
  },
  phonePrefixTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  textInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 12,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.textPrimary,
  },
  passInput: { paddingRight: 0 },
  eyeBtn: { paddingHorizontal: 10, height: 46, alignItems: 'center', justifyContent: 'center' },
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
