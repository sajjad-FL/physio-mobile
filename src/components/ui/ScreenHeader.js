import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'
import { font, type, leading } from '../../theme/typography'

function ScreenHeader({ title, subtitle, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  title: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary, lineHeight: leading.xl },
  sub: { marginTop: 4, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: leading.sm },
})

export default memo(ScreenHeader)
