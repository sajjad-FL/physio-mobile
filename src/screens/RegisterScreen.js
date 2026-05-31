import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native'
import { CommonActions } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { setSession, getTokenSync } from '../auth/tokenStore'
import { getDefaultDashboardScreen } from '../auth/navigationTargets'
import { validateIndianMobile } from '../utils/phoneIndia'
import { siteOrigin } from '../utils/siteOrigin'
import { validateLoginPassword, validateName, validateOtp } from '../utils/validation'
import SignupScreenLayout from '../components/signup/templates/SignupScreenLayout'
import SignupPhoneStep from '../components/signup/organisms/SignupPhoneStep'
import SignupOtpStep from '../components/signup/organisms/SignupOtpStep'
import SignupProfileStep from '../components/signup/organisms/SignupProfileStep'
import SignupFooterLink from '../components/signup/atoms/SignupFooterLink'
import { openWebLoginInBrowser } from '../utils/webApp'
import { useReferralPublicSettings } from '../api/queries'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { sendFirebaseOtp, confirmFirebaseOtp, toE164India, friendlyFirebaseError } from '../utils/firebasePhoneAuth'

const STEPS = { PHONE: 1, OTP: 2, PROFILE: 3 }
const TOTAL_STEPS = 3

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

function stepIndex(step) {
  if (step === STEPS.PHONE) return 1
  if (step === STEPS.OTP) return 2
  return 3
}

export default function RegisterScreen({ navigation, route }) {
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
  const [confirmation, setConfirmation] = useState(null)
  const [referralCode, setReferralCode] = useState(() =>
    String(route?.params?.ref || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ''),
  )
  const { data: referralPublic } = useReferralPublicSettings()
  const friendSignupBonus = referralPublic?.referralSignupBonusAmount ?? 0

  const openLink = useCallback(async (url) => {
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) await Linking.openURL(url)
    } catch {
      // ignore
    }
  }, [])

  const base = siteOrigin()

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
      const conf = await sendFirebaseOtp(toE164India(phone))
      setConfirmation(conf)
      Toast.show({ type: 'success', text1: 'Verification code sent.' })
      setOtp('')
      setStep(STEPS.OTP)
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: friendlyFirebaseError(err),
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
      const idToken = await confirmFirebaseOtp(confirmation, otp)
      const body = {
        name: name.trim(),
        password,
        firebaseIdToken: idToken,
        ...(referralCode ? { referralCode } : {}),
      }
      const res = await api.post('/auth/register', body)
      const role = res.data?.role ?? 'user'
      const profileComplete = res.data.isProfileComplete === true
      if (role === 'admin') {
        Toast.show({
          type: 'info',
          text1: 'Opening browser',
          text2: 'Continue on the web for admin access.',
        })
        const opened = await openWebLoginInBrowser()
        if (!opened) {
          Toast.show({
            type: 'error',
            text1: 'Could not open browser',
            text2: 'Set EXPO_PUBLIC_SITE_URL in .env.',
          })
        }
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }))
        return
      }
      const credited = Number(res.data?.referralSignupBonusCredited)
      if (credited > 0) {
        Toast.show({
          type: 'success',
          text1: 'Account created',
          text2: `₹${credited} welcome credit added to your wallet`,
        })
      } else {
        Toast.show({ type: 'success', text1: 'Account created' })
      }
      await setSession(res.data.token, role, profileComplete)
      if (role === 'user' && !profileComplete) {
        navigation.dispatch(CommonActions.reset(userTabsResetState(false)))
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: getDefaultDashboardScreen() }] }))
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: friendlyFirebaseError(err) || err.response?.data?.message || err.message || 'Registration failed',
      })
    } finally {
      setLoading(false)
    }
  }

  if (busy) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  const si = stepIndex(step)

  return (
    <SignupScreenLayout
      backLabel={step === STEPS.PHONE ? 'Home' : 'Back'}
      onBack={goBackFromHeader}
      footer={
        <>
          {step !== STEPS.PROFILE ? (
            <SignupFooterLink onPress={() => navigation.navigate('Login')} />
          ) : null}
          <View style={styles.legal}>
            <Text style={styles.legalTxt}>
              By creating an account, you agree to our{' '}
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
        </>
      }
    >
      {step === STEPS.PHONE ? (
        <SignupPhoneStep
          step={si}
          totalSteps={TOTAL_STEPS}
          phone={phone}
          onChangePhone={setPhone}
          phoneError={fieldErrors.phone}
          onContinue={sendOtp}
          sendingOtp={sendingOtp}
        />
      ) : null}
      {step === STEPS.OTP ? (
        <SignupOtpStep
          step={si}
          totalSteps={TOTAL_STEPS}
          otp={otp}
          onChangeOtp={setOtp}
          otpError={fieldErrors.otp}
          devOtpHint={devOtpHint}
          onResend={sendOtp}
          sendingOtp={sendingOtp}
          onContinue={continueFromOtp}
        />
      ) : null}
      {step === STEPS.PROFILE ? (
        <SignupProfileStep
          step={si}
          totalSteps={TOTAL_STEPS}
          name={name}
          onChangeName={setName}
          nameError={fieldErrors.name}
          password={password}
          onChangePassword={setPassword}
          passwordError={fieldErrors.password}
          referralCode={referralCode}
          onChangeReferralCode={(v) =>
            setReferralCode(
              String(v || '')
                .trim()
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, ''),
            )
          }
          referralSignupBonus={friendSignupBonus}
          onSubmit={handleCreateAccount}
          loading={loading}
        />
      ) : null}
    </SignupScreenLayout>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
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
