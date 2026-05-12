import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors } from '../../theme/colors'

function Divider({ my = 12, color, style }) {
  return <View style={[styles.line, { marginVertical: my }, color ? { backgroundColor: color } : null, style]} />
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
})

export default memo(Divider)
