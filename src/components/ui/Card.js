import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors } from '../../theme/colors'
import { r } from '../../theme/radius'
import { shadows } from '../../theme/shadows'

/**
 * Surface card.
 * Variants: 'default' | 'flat' | 'filled'
 * Padding:  'sm' (8) | 'md' (10, default) | 'lg' (14) | 'none' (0)
 */
function Card({ children, variant = 'default', padding = 'md', style }) {
  return (
    <View
      style={[
        styles.base,
        styles[`pad_${padding}`],
        variant === 'default' && styles.default,
        variant === 'flat' && styles.flat,
        variant === 'filled' && styles.filled,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: r.xl,
    backgroundColor: colors.white,
  },

  // Padding variants
  pad_none: { padding: 0 },
  pad_sm: { padding: 8 },
  pad_md: { padding: 10 },
  pad_lg: { padding: 14 },

  // Style variants
  default: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
  },
  flat: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filled: {
    backgroundColor: colors.slate50,
  },
})

export default memo(Card)
