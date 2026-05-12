import { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { signupTokens as t } from '../../../theme/signupTokens'
import { signupType, signupLeading } from '../../../theme/signupTypography'
import { font } from '../../../theme/typography'

function SignupSubtitle({ children }) {
  return <Text style={styles.sub}>{children}</Text>
}

const styles = StyleSheet.create({
  sub: {
    textAlign: 'center',
    fontFamily: font.regular,
    fontSize: signupType.body,
    lineHeight: signupLeading.body,
    color: t.inkMuted,
    paddingHorizontal: 6,
  },
})

export default memo(SignupSubtitle)
