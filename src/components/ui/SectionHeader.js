import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

function SectionHeader({ title, action, actionLabel, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      {action && actionLabel ? (
        <Text style={styles.action} onPress={action}>{actionLabel}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: { fontFamily: font.bold, fontSize: type.sm, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  action: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
})

export default memo(SectionHeader)
