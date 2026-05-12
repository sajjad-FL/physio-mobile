import { memo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '../../../theme/colors'
import { font, type, leading } from '../../../theme/typography'

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
  wrap: { alignSelf: 'center', marginTop: 24, paddingVertical: 2 },
  line: {
    fontFamily: font.regular,
    fontSize: type.base,
    lineHeight: leading.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bold: { fontFamily: font.semiBold, color: colors.brand },
})

export default memo(SignupFooterLink)
