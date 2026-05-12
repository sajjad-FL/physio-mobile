import { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { colors } from '../../../theme/colors'
import { font, type, leading } from '../../../theme/typography'

function SignupKickerBadge({ label = 'CREATE ACCOUNT' }) {
  return <Text style={styles.txt}>{label}</Text>
}

const styles = StyleSheet.create({
  txt: {
    textAlign: 'center',
    fontFamily: font.bold,
    fontSize: type.sm,
    lineHeight: leading.sm,
    letterSpacing: 0.65,
    color: colors.brand,
  },
})

export default memo(SignupKickerBadge)
