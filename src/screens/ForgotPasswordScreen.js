import { useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { validateIndianMobile } from '../utils/phoneIndia'
import { validateLoginPassword, validateOtp } from '../utils/validation'
import Input from '../components/ui/Input'
import KeyboardAwareScrollView from '../components/ui/KeyboardAwareScrollView'
import { colors } from '../theme/colors'
import { authFormCard } from '../theme/authFormCard'
import { font, type, leading } from '../theme/typography'

const STEPS = [
  { key: 'phone', n: 1, icon: 'phone-portrait-outline', title: 'Enter your mobile', sub: 'We\'ll send a verification code to your registered number.' },
  { key: 'otp', n: 2, icon: 'keypad-outline', title: 'Enter the code', sub: 'Check your SMS for the 4-digit verification code.' },
  { key: 'password', n: 3, icon: 'lock-closed-outline', title: 'New password', sub: 'Choose a strong password with at least 6 characters.' },
]

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const stepMeta = STEPS.find((s) => s.key === step) || STEPS[0]

  async function sendCode() {
    setError('')
    const pv = validateIndianMobile(phone)
    if (!pv.valid) { setFieldErrors({ phone: pv.message }); return }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { phone: pv.normalized })
      Toast.show({ type: 'success', text1: 'Verification code sent' })
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not send code')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    setError('')
    const pv = validateIndianMobile(phone)
    if (!pv.valid) { setError(pv.message); return }
    const oe = validateOtp(otp)
    if (oe) { setFieldErrors({ otp: oe }); return }
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { phone: pv.normalized, otp })
      Toast.show({ type: 'success', text1: 'Code verified' })
      setStep('password')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  async function savePassword() {
    setError('')
    const pv = validateIndianMobile(phone)
    if (!pv.valid) { setError(pv.message); return }
    const pe = validateLoginPassword(newPassword)
    if (pe) { setFieldErrors({ newPassword: pe }); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { phone: pv.normalized, newPassword })
      Toast.show({ type: 'success', text1: 'Password updated' })
      navigation.navigate('Login')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    if (step === 'otp') { setStep('phone'); setFieldErrors({}); return }
    if (step === 'password') { setStep('otp'); setFieldErrors({}); return }
    navigation.navigate('Login')
  }

  function handleCta() {
    if (step === 'phone') sendCode()
    else if (step === 'otp') verifyCode()
    else savePassword()
  }

  const ctaLabels = { phone: 'Send code', otp: 'Verify code', password: 'Save password' }

  return (
    <KeyboardAwareScrollView
      style={styles.bg}
      contentContainerStyle={styles.scroll}
      iosHeaderOffset={0}
      extraBottomPadding={44}
    >
      {/* Ambient Top Background Halo Glow */}
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

      {/* ── Back row ──────────────────────────────── */}
      <Pressable onPress={handleBack} style={styles.backRow} hitSlop={12}>
        <Ionicons name="arrow-back" size={18} color={colors.brand} />
        <Text style={styles.backTxt}>Back</Text>
      </Pressable>

        {/* ── Step progress ─────────────────────────── */}
        <View style={styles.stepRow}>
          {STEPS.map((s, idx) => (
            <View key={s.key} style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                s.key === step && styles.stepDotActive,
                STEPS.indexOf(STEPS.find((x) => x.key === step)) > idx && styles.stepDotDone,
              ]}>
                {STEPS.indexOf(STEPS.find((x) => x.key === step)) > idx ? (
                  <Ionicons name="checkmark" size={10} color={colors.white} />
                ) : (
                  <Text style={[styles.stepDotNum, s.key === step && styles.stepDotNumActive]}>{s.n}</Text>
                )}
              </View>
              {idx < STEPS.length - 1 ? (
                <View style={[styles.stepLine, STEPS.indexOf(STEPS.find((x) => x.key === step)) > idx && styles.stepLineDone]} />
              ) : null}
            </View>
          ))}
        </View>

        {/* ── Icon + heading ─────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name={stepMeta.icon} size={26} color={colors.brand} />
          </View>
          <Text style={styles.heroTitle}>{stepMeta.title}</Text>
          <Text style={styles.heroSub}>{stepMeta.sub}</Text>
        </View>

        {/* ── Error banner ──────────────────────────── */}
        {error ? (
          <View style={styles.alert}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Form card ─────────────────────────────── */}
        <View style={styles.formCard}>
          {step === 'phone' ? (
            <Input
              label="Mobile number"
              required
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              importantForAutofill="yes"
              autoCorrect={false}
              value={phone}
              onChangeText={(v) => { setPhone(v); setFieldErrors((f) => ({ ...f, phone: '' })) }}
              error={fieldErrors.phone}
              placeholder="Enter mobile number"
            />
          ) : null}

          {step === 'otp' ? (
            <>
              <Input
                label="Verification code"
                required
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                importantForAutofill="yes"
                value={otp}
                onChangeText={(v) => { setOtp(v); setFieldErrors((f) => ({ ...f, otp: '' })) }}
                error={fieldErrors.otp}
                placeholder="4-digit code"
              />
              <Pressable onPress={sendCode} style={styles.resendRow} hitSlop={8}>
                <Text style={styles.resendTxt}>Didn't receive it? </Text>
                <Text style={styles.resendLink}>Resend code</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'password' ? (
            <Input
              label="New password"
              required
              secureTextEntry
              textContentType="newPassword"
              autoComplete="password-new"
              importantForAutofill="yes"
              autoCorrect={false}
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); setFieldErrors((f) => ({ ...f, newPassword: '' })) }}
              error={fieldErrors.newPassword}
              placeholder="Min. 6 characters"
            />
          ) : null}

          <View style={styles.ctaGap} />

          <Pressable
            style={({ pressed }) => [styles.cta, loading && styles.ctaBusy, pressed && !loading && styles.ctaPressed]}
            onPress={handleCta}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.white} />
            )}
            <Text style={styles.ctaTxt}>{loading ? 'Please wait…' : ctaLabels[step]}</Text>
          </Pressable>
        </View>

        {/* ── Footer ────────────────────────────────── */}
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.footerRow} hitSlop={8}>
          <Text style={styles.footerTxt}>Remember your password? </Text>
          <Text style={styles.footerLink}>Sign in</Text>
        </Pressable>
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.canvas, position: 'relative' },
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 44 },

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

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32, alignSelf: 'flex-start', zIndex: 2 },
  backTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },

  // Step progress
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, zIndex: 2 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepDotActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  stepDotDone: { borderColor: colors.brand, backgroundColor: colors.brand },
  stepDotNum: { fontFamily: font.bold, fontSize: 10, color: colors.slate400 },
  stepDotNumActive: { color: colors.brand },
  stepLine: { flex: 1, height: 1.5, backgroundColor: 'rgba(13, 148, 136, 0.15)', marginHorizontal: 6 },
  stepLineDone: { backgroundColor: colors.brand },

  // Hero
  hero: { alignItems: 'center', gap: 8, marginBottom: 28, zIndex: 2 },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTitle: { fontFamily: font.bold, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.3, textAlign: 'center' },
  heroSub: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: leading.sm,
    paddingHorizontal: 8,
  },

  // Alert
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
    zIndex: 2,
  },
  alertText: { flex: 1, fontFamily: font.medium, fontSize: type.sm, color: colors.danger, lineHeight: leading.sm },

  // Form card
  formCard: {
    ...authFormCard,
    zIndex: 2,
    marginBottom: 20,
  },
  resendRow: { flexDirection: 'row', marginTop: 10 },
  resendTxt: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  resendLink: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },

  ctaGap: { height: 20 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaBusy: { opacity: 0.7 },
  ctaPressed: { opacity: 0.88 },
  ctaTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.white },

  // Footer
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4, zIndex: 2 },
  footerTxt: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  footerLink: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
})
