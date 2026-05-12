import { memo } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { signupTokens as t } from '../../../theme/signupTokens'
import { font } from '../../../theme/typography'

function SignupDevOtpBanner({ code }) {
  if (!code) return null
  return (
    <View style={styles.box}>
      <Text style={styles.label}>Local dev code</Text>
      <Text style={styles.mono}>{code}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.devOtpBorder,
    backgroundColor: t.devOtpBg,
  },
  label: {
    fontFamily: font.semiBold,
    fontSize: 11,
    lineHeight: 16,
    color: t.devOtpLabel,
    marginBottom: 6,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 16,
    fontWeight: '700',
    color: t.devOtpMono,
  },
})

export default memo(SignupDevOtpBanner)
