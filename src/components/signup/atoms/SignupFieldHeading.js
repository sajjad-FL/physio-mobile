import { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { signupTokens as t } from '../../../theme/signupTokens'
import { signupType, signupLeading } from '../../../theme/signupTypography'
import { font } from '../../../theme/typography'

function SignupFieldHeading({ children }) {
  return <Text style={styles.h}>{children}</Text>
}

const styles = StyleSheet.create({
  h: {
    fontFamily: font.bold,
    fontSize: signupType.inputLabel,
    lineHeight: signupLeading.inputLabel,
    color: t.ink,
    marginBottom: 8,
  },
})

export default memo(SignupFieldHeading)
