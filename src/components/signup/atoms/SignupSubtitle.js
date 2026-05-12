import { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { colors } from '../../../theme/colors'
import { font, type, leading } from '../../../theme/typography'

/** Match LoginScreen `heroSub`. */
function SignupSubtitle({ children }) {
  return <Text style={styles.sub}>{children}</Text>
}

const styles = StyleSheet.create({
  sub: {
    textAlign: 'center',
    fontFamily: font.regular,
    fontSize: type.base,
    lineHeight: leading.base,
    color: colors.textSecondary,
    paddingHorizontal: 16,
  },
})

export default memo(SignupSubtitle)
