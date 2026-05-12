import { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { signupTokens as t } from '../../../theme/signupTokens'
import { signupType, signupLeading } from '../../../theme/signupTypography'
import { font } from '../../../theme/typography'

/** Plain section label (Stitch): no pill background. */
function SignupKickerBadge({ label = 'CREATE ACCOUNT' }) {
  return <Text style={styles.txt}>{label}</Text>
}

const styles = StyleSheet.create({
  txt: {
    textAlign: 'center',
    fontFamily: font.bold,
    fontSize: signupType.kicker,
    lineHeight: signupLeading.kicker,
    letterSpacing: 1.1,
    color: t.brand,
  },
})

export default memo(SignupKickerBadge)
