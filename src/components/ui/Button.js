import { memo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { r } from '../../theme/radius'
import { shadows } from '../../theme/shadows'

/**
 * Variants: 'primary' | 'outline' | 'ghost' | 'danger'
 * Sizes:    'sm' | 'md' (default) | 'lg'
 */
function Button({ title, onPress, disabled, loading, variant = 'primary', size = 'md', style }) {
  const isPrimary = variant === 'primary'
  const isOutline = variant === 'outline'
  const isGhost = variant === 'ghost'
  const isDanger = variant === 'danger'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        isPrimary && styles.primary,
        isOutline && styles.outline,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary || isDanger ? colors.white : colors.brand}
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`textSize_${size}`],
            isPrimary && styles.textPrimary,
            isOutline && styles.textOutline,
            isGhost && styles.textGhost,
            isDanger && styles.textDanger,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Compact touch targets while staying tappable (≥36pt)
  size_sm: { minHeight: 30, paddingVertical: 6, paddingHorizontal: 12 },
  size_md: { minHeight: 36, paddingVertical: 8, paddingHorizontal: 14 },
  size_lg: { minHeight: 38, paddingVertical: 9, paddingHorizontal: 16 },

  // Variants
  primary: {
    backgroundColor: colors.brand,
    ...shadows.brand,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },

  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },

  // Text
  text: { fontFamily: font.semiBold },
  textSize_sm: { fontSize: type.sm },
  textSize_md: { fontSize: type.base },
  textSize_lg: { fontSize: type.md },
  textPrimary: { color: colors.white },
  textOutline: { color: colors.textPrimary },
  textGhost: { color: colors.brand },
  textDanger: { color: colors.white },
})

export default memo(Button)
