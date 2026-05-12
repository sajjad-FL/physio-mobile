import { memo, useCallback } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { loginTokens as t, loginType, loginLeading } from '../../theme/loginTokens'
import { font } from '../../theme/typography'

function siteOrigin() {
  const u = typeof process.env.EXPO_PUBLIC_SITE_URL === 'string' ? process.env.EXPO_PUBLIC_SITE_URL.trim() : ''
  return u ? u.replace(/\/$/, '') : 'https://nearbyphysio.com'
}

function LoginLegalFooter() {
  const base = siteOrigin()
  const termsUrl = `${base}/terms`
  const privacyUrl = `${base}/privacy`

  const open = useCallback(async (url) => {
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) await Linking.openURL(url)
    } catch {
      // ignore
    }
  }, [])

  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>
        By signing in, you agree to our{' '}
        <Text style={styles.link} onPress={() => open(termsUrl)} accessibilityRole="link">
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text style={styles.link} onPress={() => open(privacyUrl)} accessibilityRole="link">
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28, paddingHorizontal: 4 },
  line: {
    textAlign: 'center',
    fontFamily: font.regular,
    fontSize: loginType.legal,
    lineHeight: loginLeading.legal,
    color: t.inkMuted,
  },
  link: {
    fontFamily: font.semiBold,
    color: t.brand,
  },
})

export default memo(LoginLegalFooter)
