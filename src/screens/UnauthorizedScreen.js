import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from '../components/ui/Button'
import { clearSession, getRoleSync } from '../auth/tokenStore'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import {
  getWebLoginUrl,
  openWebLoginInBrowser,
  openWebManagerInBrowser,
  openWebClinicInBrowser,
} from '../utils/webApp'

export default function UnauthorizedScreen({ navigation }) {
  const { logout } = useAuth()
  const [envHint, setEnvHint] = useState('')
  const role = getRoleSync()
  const isAdmin = role === 'admin'
  const isCareManager = role === 'care_manager'
  const isClinicStaff = role === 'clinic_staff'
  const isPhysio = role === 'physio'

  useEffect(() => {
    if (!isAdmin && !isCareManager && !isClinicStaff) return
    const url = getWebLoginUrl()
    if (!url) {
      setEnvHint('Set EXPO_PUBLIC_SITE_URL in .env to your web app base URL (e.g. https://your-domain.com).')
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      ;(async () => {
        if (isClinicStaff) {
          await openWebClinicInBrowser()
        } else if (isCareManager) {
          await openWebManagerInBrowser()
        } else {
          await openWebLoginInBrowser()
        }
        if (cancelled) return
        await clearSession()
        navigation.replace('Home')
      })()
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [navigation, isAdmin, isCareManager])

  if (isPhysio) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Wrong account type</Text>
        <Text style={styles.sub}>
          This screen appears when a physiotherapist account tried to open the patient area. Use the workspace tabs
          below after signing in, or log out and sign in again.
        </Text>
        <Button title="Open workspace" onPress={() => navigation.replace('PhysioTabs')} />
        <View style={styles.btnGap} />
        <Button title="Log out" variant="outline" onPress={() => logout(navigation)} />
      </View>
    )
  }

  if (!isAdmin && !isCareManager) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Unauthorized</Text>
        <Text style={styles.sub}>You don&apos;t have access to that area.</Text>
        <Button title="Go home" onPress={() => navigation.replace('Home')} />
      </View>
    )
  }

  if (isCareManager) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Use the web app</Text>
        <Text style={styles.sub}>
          Care manager tools aren&apos;t available in this mobile app. We&apos;re opening your browser to the manager
          dashboard — use the same account there to manage visits, plans, and collections.
        </Text>
        {envHint ? <Text style={styles.hint}>{envHint}</Text> : null}
        <Button title="Open manager dashboard" variant="primary" onPress={() => openWebManagerInBrowser()} />
        <View style={{ height: 10 }} />
        <Button title="Go home" variant="outline" onPress={() => navigation.replace('Home')} />
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
