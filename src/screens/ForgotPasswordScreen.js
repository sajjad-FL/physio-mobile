import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { validateIndianMobile } from '../utils/phoneIndia'
import { validateLoginPassword, validateOtp } from '../utils/validation'
import AppHeader from '../components/AppHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { colors } from '../theme/colors'

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  async function sendCode() {
    setError('')
    const pv = validateIndianMobile(phone)
    if (!pv.valid) {
      setFieldErrors({ phone: pv.message })
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { phone: pv.normalized })
      Toast.show({ type: 'success', text1: 'Check your phone for the code' })
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
    if (!pv.valid) {
      setError(pv.message)
      return
    }
    const oe = validateOtp(otp)
    if (oe) {
      setFieldErrors({ otp: oe })
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { phone: pv.normalized, otp: otp.replace(/\D/g, '') })
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
    if (!pv.valid) {
      setError(pv.message)
      return
    }
    const pe = validateLoginPassword(newPassword)
    if (pe) {
      setFieldErrors({ newPassword: pe })
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        phone: pv.normalized,
        newPassword,
      })
      Toast.show({ type: 'success', text1: 'Password updated' })
      navigation.navigate('Login')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Back to sign in" onBack={() => navigation.navigate('Login')} />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.sub}>
          {step === 'phone' && 'Enter the phone number on your account.'}
          {step === 'otp' && 'Enter the code we sent.'}
          {step === 'password' && 'Choose a new password (min. 8 characters).'}
        </Text>
        {error ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}
        <View style={{ height: 16 }} />
        <Card>
          {step === 'phone' ? (
            <>
              <Input label="Mobile" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={fieldErrors.phone} />
              <View style={{ height: 16 }} />
              <Button title="Send code" onPress={sendCode} loading={loading} />
            </>
          ) : null}
          {step === 'otp' ? (
            <>
              <Input label="OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} error={fieldErrors.otp} />
              <View style={{ height: 16 }} />
              <Button title="Verify code" onPress={verifyCode} loading={loading} />
            </>
          ) : null}
          {step === 'password' ? (
            <>
              <Input
                label="New password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                error={fieldErrors.newPassword}
              />
              <View style={{ height: 16 }} />
              <Button title="Save password" onPress={savePassword} loading={loading} />
            </>
          ) : null}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.slate50 },
  pad: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 8, fontSize: 14, color: colors.slate500, lineHeight: 20 },
  alert: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  alertText: { color: colors.red600, fontSize: 14 },
})
