import { memo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { signupTokens as t } from '../../../theme/signupTokens'
import { signupType, signupLeading } from '../../../theme/signupTypography'
import { font } from '../../../theme/typography'

function SignupFooterLink({ onPress, prefix = 'Already have an account?', actionLabel = 'Sign in' }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.wrap} accessibilityRole="button">
      <Text style={styles.line}>
        {prefix}{' '}
        <Text style={styles.bold}>{actionLabel}</Text>
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', marginTop: 28, paddingVertical: 8 },
  line: {
    fontFamily: font.regular,
    fontSize: signupType.footer,
    lineHeight: signupLeading.footer,
    color: t.inkMuted,
    textAlign: 'center',
  },
  bold: { fontFamily: font.semiBold, color: t.brand },
})

export default memo(SignupFooterLink)
