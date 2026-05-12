import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

/**
 * Horizontal label/value pair used in detail cards.
 * Props: label, value, valueColor, style
 */
function InfoRow({ label, value, valueColor, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value ?? '—'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  label: { fontFamily: font.medium, fontSize: type.sm, color: colors.textSecondary, flex: 1 },
  value: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary, flex: 2, textAlign: 'right' },
})

export default memo(InfoRow)
