import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from '../components/ui/Button'
import { clearSession, getRoleSync } from '../auth/tokenStore'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import { getWebLoginUrl, openWebLoginInBrowser } from '../utils/webApp'

export default function UnauthorizedScreen({ navigation }) {
  const { logout } = useAuth()
  const [envHint, setEnvHint] = useState('')
  const role = getRoleSync()
  const isAdmin = role === 'admin'
  const isPhysio = role === 'physio'

  useEffect(() => {
    if (!isAdmin) return
    const url = getWebLoginUrl()
    if (!url) {
      setEnvHint('Set EXPO_PUBLIC_SITE_URL in .env to your web app base URL (e.g. https://your-domain.com).')
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      ;(async () => {
        await openWebLoginInBrowser()
        if (cancelled) return
        await clearSession()
        navigation.replace('Home')
      })()
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [navigation, isAdmin])

  if (isPhysio) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Use the provider app</Text>
        <Text style={styles.sub}>
          Physiotherapist accounts sign in through the PhysioKhom Provider app, not this patient app. Install the
          provider app and sign in with the same phone number.
        </Text>
        <Button title="Log out" onPress={() => logout(navigation)} />
        <View style={styles.btnGap} />
        <Button title="Go home" variant="outline" onPress={() => navigation.replace('Home')} />
      </View>
    )
  }

  if (!isAdmin) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Unauthorized</Text>
        <Text style={styles.sub}>You don&apos;t have access to that area.</Text>
        <Button title="Go home" onPress={() => navigation.replace('Home')} />
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Use the web app</Text>
      <Text style={styles.sub}>
        Administrator access isn&apos;t available in this mobile app. We&apos;re opening your browser to the web
        sign-in page — use the same account there to manage the platform.
      </Text>
      {envHint ? <Text style={styles.hint}>{envHint}</Text> : null}
      <Button title="Open web sign-in" variant="primary" onPress={() => openWebLoginInBrowser()} />
      <View style={{ height: 10 }} />
      <Button title="Go home" variant="outline" onPress={() => navigation.replace('Home')} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colors.slate50 },
  title: { fontSize: 18, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 8, marginBottom: 16, fontSize: 13, color: colors.slate500, lineHeight: 19 },
  hint: { marginBottom: 12, fontSize: 12, color: colors.slate600, lineHeight: 17 },
  btnGap: { height: 10 },
})
