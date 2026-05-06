import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { CommonActions } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { setSession, getTokenSync } from '../auth/tokenStore'
import { getDefaultDashboardScreen } from '../auth/navigationTargets'
import { validateIndianMobile } from '../utils/phoneIndia'
import { validateLoginPassword, validateName, validateOtp } from '../utils/validation'
import AppHeader from '../components/AppHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { colors } from '../theme/colors'

const STEPS = { PHONE: 1, OTP: 2, PROFILE: 3 }

function userTabsResetState(profileComplete) {
  const routes = [
    { name: 'DashboardHome' },
    { name: 'Bookings' },
    { name: 'Wallet' },
    { name: 'Profile' },
    { name: 'Disputes' },
  ]
  return {
    index: 0,
    routes: [
      {
        name: 'UserTabs',
        state: {
          routes,
          index: profileComplete ? 0 : 3,
        },
      },
    ],
  }
}

export default function RegisterScreen({ navigation }) {
  const [busy, setBusy] = useState(true)
  const [step, setStep] = useState(STEPS.PHONE)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [devOtpHint, setDevOtpHint] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (getTokenSync()) {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: getDefaultDashboardScreen() }] }),
      )
      return
    }
    setBusy(false)
  }, [navigation])

  async function sendOtp() {
    const pv = validateIndianMobile(phone)
    setFieldErrors((f) => ({ ...f, phone: pv.valid ? '' : pv.message }))
    if (!pv.valid) return
    setSendingOtp(true)
    setDevOtpHint('')
    try {
      const { data } = await api.post('/auth/signup-otp', { phone: pv.normalized })
      const payload = data?.data && typeof data.data === 'object' ? data.data : data
      const code = payload?.otp ?? payload?.code ?? payload?.verificationCode
      if (code != null && String(code).trim() !== '') setDevOtpHint(String(code).trim())
      Toast.show({ type: 'success', text1: payload?.message || data?.message || 'Verification code sent.' })
      setOtp('')
      setStep(STEPS.OTP)
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || err.message || 'Could not send code',
      })
    } finally {
      setSendingOtp(false)
    }
  }

  function goBackFromHeader() {
    if (step === STEPS.OTP) {
      setStep(STEPS.PHONE)
      setOtp('')
      setFieldErrors((f) => ({ ...f, otp: '' }))
      return
    }
    if (step === STEPS.PROFILE) {
      setStep(STEPS.OTP)
      setFieldErrors((f) => ({ ...f, name: '', password: '' }))
      return
    }
    navigation.navigate('Home')
  }

  function continueFromOtp() {
    const oe = validateOtp(otp)
    setFieldErrors((f) => ({ ...f, otp: oe }))
    if (oe) return
    setStep(STEPS.PROFILE)
  }

  async function handleCreateAccount() {
    const pv = validateIndianMobile(phone)
    const ne = validateName(name)
    const pe = validateLoginPassword(password)
    const oe = validateOtp(otp)
    setFieldErrors({
      phone: pv.valid ? '' : pv.message,
      otp: oe,
      name: ne,
      password: pe,
    })
    if (!pv.valid || ne || pe || oe) return

    setLoading(true)
    try {
      const body = {
        name: name.trim(),
        phone: pv.normalized,
        password,
        otp: otp.replace(/\D/g, ''),
      }
      const res = await api.post('/auth/register', body)
      const role = res.data?.role ?? 'user'
      const profileComplete = res.data.isProfileComplete === true
      Toast.show({ type: 'success', text1: 'Account created' })
      await setSession(res.data.token, role, profileComplete)
      if (role === 'user' && !profileComplete) {
        navigation.dispatch(CommonActions.reset(userTabsResetState(false)))
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: getDefaultDashboardScreen() }] }))
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || err.message || 'Registration failed',
      })
    } finally {
      setLoading(false)
    }
  }

  if (busy) return <View style={styles.center} />

  const stepLabel = step === STEPS.PHONE ? '1 / 3' : step === STEPS.OTP ? '2 / 3' : '3 / 3'

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Sign up" onBack={goBackFromHeader} />
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepPill}>{stepLabel}</Text>
        <Text style={styles.kicker}>CREATE ACCOUNT</Text>

        {step === STEPS.PHONE ? (
          <>
            <Text style={styles.title}>Your phone number</Text>
            <Text style={styles.sub}>
              We will text a one-time code to verify this number. Date of birth, gender, and address can be added later in
              Profile.
            </Text>
            <View style={{ height: 20 }} />
            <Card>
              <Input
                label="Mobile"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                error={fieldErrors.phone}
              />
              <View style={{ height: 20 }} />
              <Button title="Continue" onPress={sendOtp} loading={sendingOtp} />
            </Card>
          </>
        ) : null}

        {step === STEPS.OTP ? (
          <>
            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.sub}>Enter the 6-digit code we sent to your phone.</Text>
            <View style={{ height: 20 }} />
            <Card>
              <Input label="6-digit OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} error={fieldErrors.otp} />
              {devOtpHint ? (
                <View style={styles.devOtpBox}>
                  <Text style={styles.devOtpLabel}>Local dev code</Text>
                  <Text style={styles.devOtpMono}>{devOtpHint}</Text>
                </View>
              ) : (
                <View style={{ height: 12 }} />
              )}
              <Button title="Resend code" variant="outline" onPress={sendOtp} loading={sendingOtp} />
              <View style={{ height: 12 }} />
              <Button title="Continue" onPress={continueFromOtp} />
            </Card>
          </>
        ) : null}

        {step === STEPS.PROFILE ? (
          <>
            <Text style={styles.title}>Almost there</Text>
            <Text style={styles.sub}>
              Your account is created with your name and password. Add date of birth, gender, and address in Profile when
              you are ready to book.
            </Text>
            <View style={{ height: 20 }} />
            <Card>
              <Text style={styles.fieldHeading}>What&apos;s your name?</Text>
              <Input label="Full name" value={name} onChangeText={setName} error={fieldErrors.name} />
              <View style={{ height: 16 }} />
              <Text style={styles.fieldHeading}>Create password</Text>
              <Input
                label="Password (min 8 characters)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                error={fieldErrors.password}
              />
              <View style={{ height: 20 }} />
              <Button title="Create account" onPress={handleCreateAccount} loading={loading} />
            </Card>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.slate50 },
  pad: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.slate50 },
  stepPill: {
    alignSelf: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  kicker: { textAlign: 'center', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.brand },
  title: { textAlign: 'center', fontSize: 24, fontWeight: '700', color: colors.slate900, marginTop: 8 },
  sub: { textAlign: 'center', marginTop: 8, fontSize: 14, color: colors.slate500, lineHeight: 20, paddingHorizontal: 8 },
  fieldHeading: { fontSize: 15, fontWeight: '600', color: colors.slate800, marginBottom: 8 },
  devOtpBox: {
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  devOtpLabel: { fontSize: 12, fontWeight: '600', color: '#78350f', marginBottom: 4 },
  devOtpMono: {
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    color: '#451a03',
    fontWeight: '600',
  },
})
