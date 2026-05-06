import { useEffect, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { CommonActions } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { setSession, getTokenSync } from '../auth/tokenStore'
import { getDefaultDashboardScreen } from '../auth/navigationTargets'
import { validateIndianMobile } from '../utils/phoneIndia'
import { validateLoginPassword } from '../utils/validation'
import AppHeader from '../components/AppHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { colors } from '../theme/colors'

export default function LoginScreen({ navigation }) {
  const [busy, setBusy] = useState(true)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
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
      const res = await api.post('/auth/login', {
        phone: pv.normalized,
        password,
      })
      const role = res.data?.role ?? 'user'
      Toast.show({ type: 'success', text1: 'Signed in' })
      await setSession(res.data.token, role, res.data.isProfileComplete === true)
      const target = getDefaultDashboardScreen()
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: target }] }))
    } catch (err) {
      const d = err.response?.data
      setLoginError(d?.message || err.message || 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.bg}>
        <AppHeader title="Home" onBack={() => navigation.navigate('Home')} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.kicker}>SIGN IN</Text>
            <Text style={styles.title}>Continue to booking</Text>
            <Text style={styles.sub}>Use your registered Indian mobile and password.</Text>
          </View>
          <Card>
            {loginError ? (
              <View style={styles.alert}>
                <Text style={styles.alertText}>{loginError}</Text>
              </View>
            ) : null}
            <Input
              label="Mobile number"
              keyboardType="phone-pad"
              autoCapitalize="none"
              value={phone}
              onChangeText={setPhone}
              error={fieldErrors.phone}
            />
            <View style={{ height: 14 }} />
            <Input
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
            />
            <View style={{ height: 20 }} />
            <Button title="Sign in" onPress={handleSubmit} loading={loading} />
            <View style={{ height: 12 }} />
            <Button title="Create account" variant="outline" onPress={() => navigation.navigate('Register')} />
            <View style={{ height: 8 }} />
            <Button title="Forgot password?" variant="outline" onPress={() => navigation.navigate('ForgotPassword')} />
          </Card>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate50 },
  hero: { marginBottom: 24, alignItems: 'center' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.brand, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: colors.slate900, textAlign: 'center' },
  sub: { marginTop: 8, fontSize: 14, color: colors.slate500, textAlign: 'center', lineHeight: 20 },
  alert: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  alertText: { color: colors.red600, fontSize: 14 },
})
