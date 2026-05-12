import { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { colors } from '../../../theme/colors'
import { font, type, leading } from '../../../theme/typography'

/** Match LoginScreen `heroTitle` (single scale for all signup steps). */
function SignupTitle({ children }) {
  return <Text style={styles.title}>{children}</Text>
}

const styles = StyleSheet.create({
  title: {
    fontFamily: font.bold,
    fontSize: type['2xl'],
    lineHeight: leading['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
})

export default memo(SignupTitle)
