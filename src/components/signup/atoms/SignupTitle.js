import { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { signupTokens as t } from '../../../theme/signupTokens'
import { signupType, signupLeading } from '../../../theme/signupTypography'
import { font } from '../../../theme/typography'

/** @param {'sm' | 'md' | 'lg'} size Step1 sm · OTP md · Profile lg (compact). */
function SignupTitle({ children, size = 'sm' }) {
  const isMd = size === 'md'
  const isLg = size === 'lg'
  return (
    <Text
      style={[
        styles.base,
        isLg && styles.lg,
        isMd && styles.md,
        !isMd && !isLg && styles.sm,
      ]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  base: {
    textAlign: 'center',
    color: t.ink,
    letterSpacing: -0.35,
  },
  sm: {
    fontFamily: font.bold,
    fontSize: signupType.headline,
    lineHeight: signupLeading.headline,
  },
  md: {
    fontFamily: font.bold,
    fontSize: signupType.headlineOtp,
    lineHeight: signupLeading.headlineOtp,
  },
  lg: {
    fontFamily: font.semiBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.28,
  },
})

export default memo(SignupTitle)
